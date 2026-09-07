#!/usr/bin/env node
// ============================================================================
// RLS / security regression guard
// ============================================================================
// Why this exists
// --------------
// This repo already regressed once: 20260507000000_chat_policies.sql re-opened
// `conversations` / `conversation_participants` / `messages` SELECT to every
// authenticated user (`auth.uid() IS NOT NULL`), silently overwriting a correct
// earlier policy. 20260828120000_security_hardening.sql later restored the
// participant-only gating. Migrations are append-only and ordered by timestamp,
// so a later migration CAN silently undo an earlier security fix, and nothing
// in the repo currently guards against that class of mistake.
//
// This script is that guard. It connects to a migrated Supabase/Postgres
// database (or runs in --self-test mode against an in-memory model of the
// intended schema) and asserts the security invariants the app depends on.
//
// Two complementary layers:
//   1. SEMANTIC ASSERTIONS (always, the default) — high-signal invariants that
//      catch the exact regression class (a policy silently widened to "any
//      authenticated user" or "anyone"). Robust to expression formatting, so it
//      does not false-positive on benign re-parenthesization.
//   2. SNAPSHOT DIFF (--compare-snapshot) — a full canonical dump of pg_policies
//      + buckets + triggers compared against a committed baseline. Use it as the
//      "expected snapshot" the review asked about; regenerate the baseline with
//      --update-snapshot after an intentional, reviewed policy change.
//
// Usage
// -----
//   DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
//     node scripts/check-rls.mjs                  # semantic assertions (default)
//   node scripts/check-rls.mjs --self-test        # validate the guard itself (no DB)
//   node scripts/check-rls.mjs --compare-snapshot # assertions + full snapshot diff
//   node scripts/check-rls.mjs --update-snapshot  # regenerate supabase/rls_snapshot.json
//   node scripts/check-rls.mjs --dump             # print the canonical snapshot to stdout
//
// Exit codes: 0 = OK, 1 = a security invariant failed or a snapshot mismatch.
// ============================================================================

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SNAPSHOT_PATH = join(ROOT, "supabase", "rls_snapshot.json");

// ----------------------------------------------------------------------------
// Normalisation helpers — turn a stored policy expression into a canonical,
// whitespace-insensitive form so the snapshot diff is robust to how Postgres
// re-formats an expression (wrapping parens, spacing around operators).
// ----------------------------------------------------------------------------
export function normalizeExpr(expr) {
  if (expr == null) return null;
  let s = String(expr).toLowerCase().replace(/\s+/g, " ").trim();
  // Remove spaces immediately inside brackets / parens and around operators.
  s = s.replace(/\s*\(\s*/g, "(").replace(/\s*\)\s*/g, ")");
  s = s.replace(/\s*\[\s*/g, "[").replace(/\s*\]\s*/g, "]");
  s = s.replace(/\s*,\s*/g, ",");
  s = s.replace(/\s*(<|>|=|<>|<=|>=)\s*/g, "$1");
  s = s.replace(/\s*::\s*/g, "::");
  // Collapse the redundant outer parenthesis Postgres adds around USING/CHECK.
  s = stripOuterParens(s);
  return s;
}

function stripOuterParens(s) {
  let out = s.trim();
  for (;;) {
    if (!out.startsWith("(") || !out.endsWith(")")) break;
    let depth = 0;
    let wrapsWhole = true;
    for (let i = 0; i < out.length; i++) {
      if (out[i] === "(") depth++;
      else if (out[i] === ")") {
        depth--;
        if (depth === 0 && i < out.length - 1) {
          wrapsWhole = false;
          break;
        }
      }
    }
    if (!wrapsWhole || depth !== 0) break;
    out = out.slice(1, -1).trim();
  }
  return out;
}

function normIncludes(expr, token) {
  if (expr == null) return false;
  return normalizeExpr(expr).includes(normalizeExpr(token));
}

// pg_policies.roles is name[]. node-postgres has no name[] parser, so it comes
// back as the raw array-literal string "{public,authenticated}". Normalize
// either representation (JS array or such a string) into an array of names.
function normalizeRoles(raw) {
  if (Array.isArray(raw)) return raw.map(String);
  if (raw == null) return [];
  let s = String(raw).trim();
  if (s === "") return [];
  if (!s.startsWith("{")) return [s];
  s = s.slice(1, -1); // drop outer braces
  if (s === "") return [];
  // unquote identifier elements ("a b" -> a b); the schema never uses them,
  // but parse them anyway so role lists round-trip faithfully.
  return s.split(",").map((el) => {
    el = el.trim().replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    if (el.startsWith('"') && el.endsWith('"')) return el.slice(1, -1);
    return el;
  });
}

// ----------------------------------------------------------------------------
// The semantic assertion suite. `input` is a normalized model of the database
// schema: the rows pg_policies/pg_trigger/pg_proc produce (see buildInput()).
// ----------------------------------------------------------------------------
export function runAssertions(input) {
  const errors = [];
  const err = (msg) => errors.push(msg);
  const ok = (cond, msg) => {
    if (!cond) errors.push(msg);
  };

  const policies = input.policies || [];
  const byTable = (schema, table) =>
    policies.filter((p) => p.schema === schema && p.table === table);
  const selects = (schema, table) =>
    byTable(schema, table).filter((p) => p.cmd === "select");
  const inserts = (schema, table) =>
    byTable(schema, table).filter((p) => p.cmd === "insert");
  const updates = (schema, table) =>
    byTable(schema, table).filter((p) => p.cmd === "update");

  const fn = (name) => (input.functions || []).find((f) => f.name === name);

  // -- 1. CHAT MUST BE PARTICIPANT-ONLY -------------------------------------
  // This is the exact regression: a later migration re-opening chat SELECT to
  // `auth.uid() IS NOT NULL`. Every SELECT policy on these tables must gate on
  // the SECURITY DEFINER helper is_conversation_participant().
  const chatTables = ["conversations", "conversation_participants", "messages"];
  for (const table of chatTables) {
    const sels = selects("public", table);
    if (sels.length === 0) {
      err(`[chat] ${table} has no SELECT policy`);
      continue;
    }
    for (const s of sels) {
      if (!normIncludes(s.using, "is_conversation_participant")) {
        err(
          `[chat] SELECT policy "${s.name}" on ${table} is NOT gated by ` +
            `is_conversation_participant(). "${s.using || "<none>"}" looks ` +
            `like an RLS widening (e.g. auth.uid() IS NOT NULL). Check the ` +
            `latest migration touching ${table}.`
        );
      }
    }
  }

  // Messages must cap UPDATE to participants and protect content via trigger.
  const msgUpdates = updates("public", "messages");
  ok(
    msgUpdates.some((u) => normIncludes(u.using, "is_conversation_participant")),
    "[chat] messages needs an UPDATE policy gated by is_conversation_participant()"
  );
  ok(
    input.messagesTrigger && input.messagesTrigger.enabled,
    "[chat] protect_message_updates trigger is missing or disabled on messages"
  );

  // -- 2. PRIVATE-PROFILE CONTENT GATING ------------------------------------
  // posts / comments / likes / reposts must not be readable by everyone — their
  // SELECT must go through can_view_post() (which honors profiles.is_private and
  // the follow graph).
  const contentTables = ["posts", "comments", "likes", "reposts"];
  for (const table of contentTables) {
    const sels = selects("public", table);
    if (sels.length === 0) {
      err(`[content] ${table} has no SELECT policy`);
      continue;
    }
    if (!sels.some((s) => normIncludes(s.using, "can_view_post"))) {
      err(
        `[content] ${table} SELECT policies are not gated by can_view_post(): ` +
          sels.map((s) => s.name).join(", ")
      );
    }
  }

  // -- 3. WRITES ARE OWNER-SCOPED -------------------------------------------
  // Every INSERT policy on user-owned tables must reference auth.uid(); an
  // INSERT without it means any caller can create a row owned by someone else.
  const ownerInsertTables = [
    "profiles",
    "posts",
    "comments",
    "likes",
    "reposts",
    "bookmarks",
    "follows",
    "stories",
    "story_views",
    "notifications",
    "conversations",
    "conversation_participants",
    "messages",
    // Push delivery state. A push token is a delivery address for one user's
    // device: an open INSERT would let any caller register a token against
    // someone else's account and have that person's notifications delivered
    // to them.
    "push_tokens",
    "notification_preferences",
  ];
  for (const table of ownerInsertTables) {
    const ins = inserts("public", table);
    for (const i of ins) {
      if (!normIncludes(i.with_check, "auth.uid()")) {
        err(
          `[owner] INSERT policy "${i.name}" on ${table} is not scoped to ` +
            `auth.uid() (with_check="${i.with_check || "<none>"}"). An open ` +
            `INSERT lets callers create rows for other users.`
        );
      }
    }
  }

  // -- 4. HELPER FUNCTIONS ARE SECURE ---------------------------------------
  // The helpers used by policies must be SECURITY DEFINER, pinned to an empty
  // search_path (prevents search-path hijack) and never executable by anon.
  const helperChecks = [
    { name: "can_view_post", authExec: true },
    { name: "is_conversation_participant", authExec: true },
    { name: "user_post_interactions", authExec: true },
    { name: "create_direct_conversation", authExec: true },
    { name: "protect_message_updates", authExec: false },
  ];
  for (const { name, authExec } of helperChecks) {
    const f = fn(name);
    if (!f) {
      err(`[functions] helper function ${name} is missing`);
      continue;
    }
    ok(
      f.securityDefiner,
      `[functions] ${name} is not SECURITY DEFINER (policy helpers must be)`
    );
    ok(
      f.searchPath,
      `[functions] ${name} does not pin search_path (empty) — search-path injection risk`
    );
    ok(
      f.anonExec === false,
      `[functions] ${name} is executable by anon — must be revoked from PUBLIC`
    );
    ok(
      f.authExec === authExec,
      `[functions] ${name} auth execute = ${f.authExec}, expected ${authExec}`
    );
  }

  // -- 5. BUCKETS -----------------------------------------------------------
  const buckets = input.buckets || {};
  for (const id of ["avatars", "posts", "sounds", "stories"]) {
    ok(
      buckets[id] === true,
      `[buckets] ${id} must be public-read (got ${String(buckets[id])})`
    );
  }
  ok(
    buckets.chat === false,
    `[buckets] chat must be private (got ${String(buckets.chat)})`
  );

  return errors;
}

// ----------------------------------------------------------------------------
// Build the normalized input model from raw DB rows (or from the self-test mock).
// ----------------------------------------------------------------------------
export function buildInput({ policies, buckets, trigger, functions }) {
  return {
    policies: (policies || []).map((p) => ({
      schema: p.schemaname,
      table: p.tablename,
      name: p.policyname,
      cmd: String(p.cmd).toLowerCase(),
      permissive: p.permissive,
      roles: normalizeRoles(p.roles),
      using: p.qual ?? null,
      with_check: p.with_check ?? null,
    })),
    buckets: Object.fromEntries(
      (buckets || []).map((b) => [b.id, b.public === true])
    ),
    messagesTrigger:
      trigger && trigger.length > 0
        ? {
            table: trigger[0].table_name,
            enabled:
              trigger[0].tgenabled === "O" || trigger[0].tgenabled === "A",
          }
        : null,
    functions: (functions || []).map((f) => ({
      name: f.proname,
      securityDefiner: f.prosecdef === true,
      searchPath: Array.isArray(f.proconfig)
        ? f.proconfig.some((x) => String(x).toLowerCase().startsWith("search_path"))
        : /search_path/i.test(String(f.proconfig || "")),
      anonExec: f.anon_exec === true,
      authExec: f.auth_exec === true,
      serviceExec: f.service_exec === true,
    })),
  };
}

// ----------------------------------------------------------------------------
// Canonical snapshot (the "expected snapshot" from the review).
// ----------------------------------------------------------------------------
export function canonicalSnapshot(input) {
  const byTable = {};
  for (const p of input.policies) {
    const key = `${p.schema}.${p.table}`;
    byTable[key] = byTable[key] || [];
    byTable[key].push({
      name: p.name,
      cmd: p.cmd,
      roles: [...p.roles].sort(),
      permissive: P_or_M(p.permissive),
      using: normalizeExpr(p.using),
      with_check: normalizeExpr(p.with_check),
    });
  }
  for (const key of Object.keys(byTable)) {
    byTable[key].sort((a, b) =>
      a.cmd === b.cmd
        ? a.name.localeCompare(b.name)
        : String(a.cmd).localeCompare(String(b.cmd))
    );
  }
  return {
    $schema: "./rls_snapshot.schema.json",
    description:
      "Expected end-state of RLS policies, storage bucket visibility, and " +
      "security triggers after applying every migration in supabase/migrations. " +
      "Regenerate with `node scripts/check-rls.mjs --update-snapshot` after an " +
      "intentional, reviewed policy change.",
    policies: byTable,
    buckets: Object.fromEntries(
      Object.entries(input.buckets).sort(([a], [b]) => a.localeCompare(b))
    ),
    triggers: {
      protect_message_updates: input.messagesTrigger && input.messagesTrigger.table,
    },
  };
}

function P_or_M(value) {
  const v = String(value).toUpperCase();
  return v === "RESTRICTIVE" ? "restrictive" : "permissive";
}

export function snapshotFromInput(input) {
  return canonicalSnapshot(input);
}

// ----------------------------------------------------------------------------
// Self-test: validate the guard itself against a model of the healthy schema,
// and confirm it FLAGS the exact historical regression.
// ----------------------------------------------------------------------------
function selfTest() {
  const healthy = buildInput(mockHealthySchema());
  const failures = [];
  const baseErrors = runAssertions(healthy);
  if (baseErrors.length > 0) {
    failures.push(`healthy schema should pass, but got:\n  - ${baseErrors.join("\n  - ")}`);
  }

  // Regression: chat SELECT re-opened to any authenticated user (the 20260507 bug).
  const regressed = buildInput(mockHealthySchema());
  for (const p of regressed.policies) {
    if (
      p.schema === "public" &&
      ["conversations", "conversation_participants", "messages"].includes(p.table) &&
      p.cmd === "select"
    ) {
      p.using = "auth.uid() is not null";
    }
  }
  const regressedErrors = runAssertions(regressed);
  const chatFlagged = regressedErrors.filter((e) => e.startsWith("[chat]"));
  if (chatFlagged.length === 0) {
    failures.push(
      "regression NOT caught: chat SELECT re-opened to auth.uid() IS NOT NULL was not flagged"
    );
  }

  // Regression: posts SELECT dropped back to open for all.
  const openPosts = buildInput(mockHealthySchema());
  for (const p of openPosts.policies) {
    if (p.schema === "public" && p.table === "posts" && p.cmd === "select") {
      p.using = "true";
    }
  }
  const openPostsErrors = runAssertions(openPosts);
  if (!openPostsErrors.some((e) => e.startsWith("[content]") && e.includes("posts"))) {
    failures.push(
      "regression NOT caught: posts SELECT opened to `true` was not flagged"
    );
  }

  // Regression: anon granted execute on can_view_post.
  const anonFn = buildInput(mockHealthySchema());
  const f = anonFn.functions.find((x) => x.name === "can_view_post");
  f.anonExec = true;
  const anonFnErrors = runAssertions(anonFn);
  if (!anonFnErrors.some((e) => e.includes("can_view_post") && e.includes("anon"))) {
    failures.push("regression NOT caught: can_view_post granted to anon was not flagged");
  }

  if (failures.length > 0) {
    console.error("SELF-TEST FAILED:\n" + failures.map((f) => "- " + f).join("\n"));
    process.exit(1);
  }

  console.log("SELF-TEST PASSED: guard flags the historical chat/posts/anon regressions.");
  console.log(
    `healthy schema invariant count: ${runAssertions(healthy).length} (expect 0 failures)`
  );
}

// ----------------------------------------------------------------------------
// Mock of the intended healthy schema (used by --self-test and to derive the
// committed snapshot). Mirrors the migrations exactly.
// ----------------------------------------------------------------------------
function mockHealthySchema() {
  const P = (table, name, cmd, using, with_check, roles = ["public"], schema = "public") => ({
    schemaname: schema,
    tablename: table,
    policyname: name,
    permissive: "PERMISSIVE",
    roles,
    cmd,
    qual: using ?? null,
    with_check: with_check ?? null,
  });

  const policies = [
    P("bookmarks", "Users can delete own bookmarks", "delete", "auth.uid()=user_id", null, ["public"]),
    P("bookmarks", "Authenticated users can insert bookmarks", "insert", null, "auth.uid()=user_id", ["public"]),
    P("bookmarks", "Users can view own bookmarks", "select", "auth.uid()=user_id", null, ["public"]),
    P("comments", "Users can delete own comments", "delete", "auth.uid()=user_id", null, ["public"]),
    P("comments", "Users can comment on visible posts", "insert", null, "(auth.uid()=user_id)and can_view_post(post_id)", ["public"]),
    P("comments", "Users can view comments on visible posts", "select", "can_view_post(post_id)", null, ["public"]),
    P("conversation_participants", "Users can leave conversations", "delete", "auth.uid()=user_id", null, ["public"]),
    P("conversation_participants", "Users can add conversation participants", "insert", null, "(auth.uid()is not null)and((user_id=auth.uid())or is_conversation_participant(conversation_id))", ["public"]),
    P("conversation_participants", "Participants can view conversation members", "select", "is_conversation_participant(conversation_id)", null, ["public"]),
    P("conversations", "Authenticated users can create conversations", "insert", null, "auth.uid()is not null", ["public"]),
    P("conversations", "Participants can view conversations", "select", "is_conversation_participant(id)", null, ["public"]),
    P("follows", "Users can delete own follows", "delete", "auth.uid()=follower_id", null, ["public"]),
    P("follows", "Authenticated users can insert follows", "insert", null, "auth.uid()=follower_id", ["public"]),
    P("follows", "Anyone can view follows", "select", "true", null, ["public"]),
    P("likes", "Users can delete own likes", "delete", "auth.uid()=user_id", null, ["public"]),
    P("likes", "Users can like visible posts", "insert", null, "(auth.uid()=user_id)and can_view_post(post_id)", ["public"]),
    P("likes", "Users can view likes on visible posts", "select", "can_view_post(post_id)", null, ["public"]),
    P("messages", "Participants can send messages", "insert", null, "(auth.uid()=sender_id)and is_conversation_participant(conversation_id)", ["public"]),
    P("messages", "Participants can view messages", "select", "is_conversation_participant(conversation_id)", null, ["public"]),
    P("messages", "Participants can update messages", "update", "is_conversation_participant(conversation_id)", "is_conversation_participant(conversation_id)", ["public"]),
    P("music_tracks", "Service role can write music tracks", "all", "true", "true", ["service_role"]),
    P("music_tracks", "Anyone can read music tracks", "select", "true", null, ["public"]),
    P("music_tracks", "Authenticated users can read music tracks", "select", "true", null, ["authenticated"]),
    P("notification_preferences", "Users can create own notification preferences", "insert", null, "auth.uid()=user_id", ["public"]),
    P("notification_preferences", "Users can update own notification preferences", "update", "auth.uid()=user_id", "auth.uid()=user_id", ["public"]),
    P("notification_preferences", "Users can view own notification preferences", "select", "auth.uid()=user_id", null, ["public"]),
    P("notifications", "Users can delete own notifications", "delete", "auth.uid()=user_id", null, ["public"]),
    // NOTE: the "Authenticated users can insert notifications" policy was
    // DROPPED by 20260907130000_notification_triggers.sql. Notifications are
    // now derived server-side by triggers, and leaving the policy in place
    // would keep a "write an arbitrary notification for any user" primitive
    // available to every authenticated caller. Deliberately absent below.
    P("notifications", "Users can view own notifications", "select", "auth.uid()=user_id", null, ["public"]),
    P("notifications", "Users can update own notifications", "update", "auth.uid()=user_id", null, ["public"]),
    P("posts", "Users can delete own posts", "delete", "auth.uid()=user_id", null, ["public"]),
    P("posts", "Authenticated users can insert their own posts", "insert", null, "auth.uid()=user_id", ["authenticated"]),
    P("posts", "Users can view visible posts", "select", "(auth.uid()=user_id)or can_view_post(id)", null, ["public"]),
    P("posts", "Users can update own posts", "update", "auth.uid()=user_id", null, ["public"]),
    P("profiles", "Authenticated users can insert their own profiles", "insert", null, "auth.uid()=id", ["public"]),
    P("profiles", "Public profile shells are readable", "select", "true", null, ["anon","authenticated"]),
    P("profiles", "Users can update own profile", "update", "auth.uid()=id", null, ["public"]),
    P("push_tokens", "Users can delete own push tokens", "delete", "auth.uid()=user_id", null, ["public"]),
    P("push_tokens", "Users can register own push tokens", "insert", null, "auth.uid()=user_id", ["public"]),
    P("push_tokens", "Users can update own push tokens", "update", "auth.uid()=user_id", "auth.uid()=user_id", ["public"]),
    P("push_tokens", "Users can view own push tokens", "select", "auth.uid()=user_id", null, ["public"]),
    P("reposts", "Users can delete own reposts", "delete", "auth.uid()=user_id", null, ["public"]),
    P("reposts", "Users can repost visible posts", "insert", null, "(auth.uid()=user_id)and can_view_post(post_id)", ["public"]),
    P("reposts", "Users can view reposts on visible posts", "select", "can_view_post(post_id)", null, ["public"]),
    P("stories", "Users can delete own stories", "delete", "auth.uid()=user_id", null, ["public"]),
    P("stories", "Users can insert own stories", "insert", null, "auth.uid()=user_id", ["public"]),
    P("stories", "Stories are visible to followers and public users", "select", "(expires_at>now())and((auth.uid()=user_id)or(exists(select 1 from profiles p where((p.id=stories.user_id)and(p.is_private=false))))or(exists(select 1 from follows f where((f.following_id=stories.user_id)and(f.follower_id=auth.uid())))))", null, ["public"]),
    P("stories", "Users can update own stories", "update", "auth.uid()=user_id", null, ["public"]),
    P("story_views", "Authenticated users can insert story views", "insert", null, "auth.uid()=viewer_id", ["public"]),
    P("story_views", "Story views are visible to story owner and viewer", "select", "(viewer_id=auth.uid())or(exists(select 1 from stories s where((s.id=story_views.story_id)and(s.user_id=auth.uid()))))", null, ["public"]),
    P("objects", "Only the service role can delete sounds", "delete", "bucket_id='sounds'::text", null, ["service_role"], "storage"),
    P("objects", "Users can delete their own avatar", "delete", "(bucket_id='avatars'::text)and((storage.foldername(name))[1]=(auth.uid())::text)", null, ["public"], "storage"),
    P("objects", "Users can delete their own chat media", "delete", "(bucket_id='chat'::text)and((storage.foldername(name))[1]=(auth.uid())::text)", null, ["public"], "storage"),
    P("objects", "Users can delete their own posts", "delete", "(bucket_id='posts'::text)and((storage.foldername(name))[1]=(auth.uid())::text)", null, ["public"], "storage"),
    P("objects", "Users can delete their own story media", "delete", "(bucket_id='stories'::text)and((storage.foldername(name))[1]=(auth.uid())::text)", null, ["public"], "storage"),
    P("objects", "Only the service role can upload sounds", "insert", null, "bucket_id='sounds'::text", ["service_role"], "storage"),
    P("objects", "Users can upload their own avatar", "insert", null, "(bucket_id='avatars'::text)and((storage.foldername(name))[1]=(auth.uid())::text)", ["public"], "storage"),
    P("objects", "Users can upload their own chat media", "insert", null, "(bucket_id='chat'::text)and(auth.uid()is not null)and((storage.foldername(name))[1]=(auth.uid())::text)", ["public"], "storage"),
    P("objects", "Users can upload their own posts", "insert", null, "(bucket_id='posts'::text)and((storage.foldername(name))[1]=(auth.uid())::text)", ["public"], "storage"),
    P("objects", "Users can upload their own story media", "insert", null, "(bucket_id='stories'::text)and((storage.foldername(name))[1]=(auth.uid())::text)", ["public"], "storage"),
    P("objects", "Avatar images are publicly accessible", "select", "bucket_id='avatars'::text", null, ["public"], "storage"),
    P("objects", "Chat media is readable by participants", "select", "(bucket_id='chat'::text)and(auth.uid()is not null)and(((storage.foldername(name))[1]=(auth.uid())::text)or(exists(select 1 from(messages m join conversation_participants cp on((cp.conversation_id=m.conversation_id)))where((cp.user_id=auth.uid())and(m.media_url=objects.name)))))", null, ["public"], "storage"),
    P("objects", "Post images are publicly accessible", "select", "bucket_id='posts'::text", null, ["public"], "storage"),
    P("objects", "Sound files are publicly readable", "select", "bucket_id='sounds'::text", null, ["public"], "storage"),
    P("objects", "Story media is publicly accessible", "select", "bucket_id='stories'::text", null, ["public"], "storage"),
    P("objects", "Only the service role can replace sounds", "update", "bucket_id='sounds'::text", "bucket_id='sounds'::text", ["service_role"], "storage"),
    P("objects", "Users can update their own avatar", "update", "(bucket_id='avatars'::text)and((storage.foldername(name))[1]=(auth.uid())::text)", "(bucket_id='avatars'::text)and((storage.foldername(name))[1]=(auth.uid())::text)", ["public"], "storage"),
    P("objects", "Users can update their own chat media", "update", "(bucket_id='chat'::text)and((storage.foldername(name))[1]=(auth.uid())::text)", "(bucket_id='chat'::text)and((storage.foldername(name))[1]=(auth.uid())::text)", ["public"], "storage"),
    P("objects", "Users can update their own posts", "update", "(bucket_id='posts'::text)and((storage.foldername(name))[1]=(auth.uid())::text)", "(bucket_id='posts'::text)and((storage.foldername(name))[1]=(auth.uid())::text)", ["public"], "storage"),
    P("objects", "Users can update their own story media", "update", "(bucket_id='stories'::text)and((storage.foldername(name))[1]=(auth.uid())::text)", "(bucket_id='stories'::text)and((storage.foldername(name))[1]=(auth.uid())::text)", ["public"], "storage"),
  ];

  const buckets = [
    { id: "avatars", public: true },
    { id: "posts", public: true },
    { id: "chat", public: false },
    { id: "sounds", public: true },
    { id: "stories", public: true },
  ];

  const trigger = [
    { table_name: "messages", tgenabled: "O" },
  ];

  const mkFn = (name, anon, auth, service) => ({
    proname: name,
    prosecdef: true,
    proconfig: ["search_path=", ""],
    anon_exec: anon,
    auth_exec: auth,
    service_exec: service,
  });
  const functions = [
    mkFn("can_view_post", false, true, true),
    mkFn("is_conversation_participant", false, true, true),
    mkFn("user_post_interactions", false, true, true),
    mkFn("create_direct_conversation", false, true, true),
    mkFn("protect_message_updates", false, false, true),
  ];

  return { policies, buckets, trigger, functions };
}

// ----------------------------------------------------------------------------
// Live DB mode
// ----------------------------------------------------------------------------
async function dbMode(args) {
  const url =
    process.env.DATABASE_URL ||
    (args.url ? args.url : undefined) ||
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

  const useSnapshot = args["compare-snapshot"] || args["update-snapshot"];

  // Import pg only when actually connecting, so --self-test / --dump need no deps.
  const { Client } = await import("pg");
  const client = new Client({ connectionString: url });
  await client.connect();

  const { rows: policyRows } = await client.query(
    `select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
       from pg_policies
      where schemaname in ('public', 'storage')
      order by schemaname, tablename, cmd, policyname`
  );
  const { rows: bucketRows } = await client.query(
    `select id, public from storage.buckets where id in ('avatars','posts','chat','sounds','stories')`
  );
  const { rows: triggerRows } = await client.query(
    `select c.relname as table_name, t.tgenabled
       from pg_trigger t
       join pg_class c on c.oid = t.tgrelid
       join pg_namespace n on n.oid = c.relnamespace
      where t.tgname = 'protect_message_updates' and not t.tgisinternal`
  );
  const { rows: fnRows } = await client.query(
    `select p.proname, p.prosecdef, p.proconfig,
            has_function_privilege('anon', p.oid, 'execute') as anon_exec,
            has_function_privilege('authenticated', p.oid, 'execute') as auth_exec,
            has_function_privilege('service_role', p.oid, 'execute') as service_exec
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where p.proname in
            ('can_view_post','is_conversation_participant','user_post_interactions','create_direct_conversation','protect_message_updates')`
  );
  await client.end();

  const input = buildInput({
    policies: policyRows,
    buckets: bucketRows,
    trigger: triggerRows,
    functions: fnRows,
  });

  const errors = runAssertions(input);
  const dir = `[check-rls] connected to ${url.replace(/\/\/.*@/, "//***@")}`;

  if (errors.length) {
    console.error(`${dir}\nFAILED (${errors.length}):\n` + errors.map((e) => `  - ${e}`).join("\n"));
  } else {
    console.log(`${dir}\nPASSED: no RLS/security invariant violated.`);
  }

  let snapshotOk = true;
  if (useSnapshot) {
    const canonical = canonicalSnapshot(input);
    if (args["update-snapshot"]) {
      writeFileSync(SNAPSHOT_PATH, JSON.stringify(canonical, null, 2) + "\n");
      console.log(`Snapshot written to ${SNAPSHOT_PATH}`);
    } else {
      let baseline;
      try {
        baseline = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
      } catch (e) {
        console.error(`Snapshot missing/invalid at ${SNAPSHOT_PATH}: ${e.message}`);
        snapshotOk = false;
      }
      if (baseline) {
        const a = JSON.stringify(canonical);
        const b = JSON.stringify(baseline);
        if (a !== b) {
          console.error(
            `Snapshot MISMATCH against ${SNAPSHOT_PATH}. ` +
              `Regenerate it with --update-snapshot and review the diff before committing.`
          );
          snapshotOk = false;
        } else {
          console.log("Snapshot MATCHES the committed baseline.");
        }
      }
    }
  }

  process.exit(errors.length || (useSnapshot && !snapshotOk) ? 1 : 0);
}

// ----------------------------------------------------------------------------
// CLI dispatch — only runs when this file is executed directly (not imported).
// ----------------------------------------------------------------------------
function parseArgs(argv) {
  return argv.reduce((acc, a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) acc[m[1]] = m[2] === undefined ? true : m[2];
    return acc;
  }, {});
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args["self-test"]) {
    selfTest();
  } else if (args["dump"]) {
    console.log(JSON.stringify(canonicalSnapshot(buildInput(mockHealthySchema())), null, 2));
  } else if (
    args["update-snapshot"] ||
    args["compare-snapshot"] ||
    process.env.DATABASE_URL ||
    args.url
  ) {
    await dbMode(args);
  } else {
    console.error(
      "Usage:\n" +
        "  node scripts/check-rls.mjs                            # connect to local supabase, run assertions\n" +
        "  DATABASE_URL=... node scripts/check-rls.mjs           # same, explicit url\n" +
        "  node scripts/check-rls.mjs --self-test                # validate the guard itself (no DB)\n" +
        "  node scripts/check-rls.mjs --compare-snapshot         # assertions + full snapshot diff\n" +
        "  node scripts/check-rls.mjs --update-snapshot          # regenerate supabase/rls_snapshot.json\n" +
        "  node scripts/check-rls.mjs --dump                     # print the canonical snapshot\n"
    );
    process.exit(1);
  }
}

// Run only when executed directly (as `node scripts/check-rls.mjs`), not when
// imported by a test or another module.
const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === (await import("node:path")).resolve(process.argv[1]);
if (isMain) {
  await main();
}
