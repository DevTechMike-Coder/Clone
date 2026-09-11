// ============================================================================
// Edge Function: send-push-notification
// ============================================================================
// Invoked by the `notifications_dispatch_push` Postgres trigger via pg_net.
// The trigger is statement-level, so one call carries every notification a
// single statement produced — a story posted to 500 followers is one request
// here, not 500.
//
// Given a batch of notification ids it:
//
//   1. loads the notifications, their actors' profiles, and every
//      recipient's active push tokens (three queries for the whole batch),
//   2. re-checks each recipient's push preferences — defence in depth, since
//      this endpoint is reachable over HTTP even though the trigger already
//      filtered,
//   3. drops any notification the recipient has already read — dispatch is
//      asynchronous (pg_net → here, ~a second after the insert), and a
//      recipient sitting in the conversation will have read the message in
//      that window,
//   4. renders a title/body/data payload per notification type, and
//   5. POSTs to the Expo Push API in batches of 100, deactivating any token
//      Expo reports as no longer registered.
//
// Deployment: `supabase functions deploy send-push-notification --no-verify-jwt`
// (verify_jwt is disabled in supabase/config.toml). The caller authenticates
// with the shared PUSH_FUNCTION_TOKEN secret rather than a Supabase JWT,
// because the caller is a Postgres trigger.
// ============================================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
/** Expo rejects batches larger than this. */
const EXPO_MAX_BATCH = 100;
const ANDROID_CHANNEL_ID = "default";

type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "repost"
  | "message"
  | "story"
  | "story_expiring";

type NotificationRow = {
  id: string;
  user_id: string;
  from_user_id: string | null;
  type: NotificationType;
  post_id: string | null;
  story_id: string | null;
  conversation_id: string | null;
  is_read: boolean;
};

type PushTokenRow = {
  id: string;
  user_id: string;
  token: string;
  platform: "ios" | "android";
};

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, string>;
  sound: "default";
  priority: "high";
  channelId: string;
};

type ExpoTicket =
  | { status: "ok"; id: string }
  | {
      status: "error";
      message: string;
      details?: { error?: string };
    };

/** Maps a notification type to its per-user preference column. */
const PREF_COLUMN: Record<NotificationType, string> = {
  follow: "push_follows",
  comment: "push_comments",
  message: "push_messages",
  story: "push_stories",
  story_expiring: "push_story_expiry",
  like: "push_likes",
  repost: "push_reposts",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Render the user-visible copy for a notification.
 *
 * Kept terse on purpose: a lock screen shows roughly 40 characters of body
 * text before the OS truncates it. Message bodies are deliberately *not*
 * content previews — a push payload traverses Expo, APNs and FCM, and
 * echoing chat content into that path is a privacy trade nobody asked for.
 */
function renderNotification(
  type: NotificationType,
  actorName: string,
  row: NotificationRow,
): { title: string; body: string; data: Record<string, string> } | null {
  const data: Record<string, string> = { type, notificationId: row.id };
  if (row.post_id) data.postId = row.post_id;
  if (row.story_id) data.storyId = row.story_id;
  if (row.conversation_id) data.conversationId = row.conversation_id;
  if (row.from_user_id) data.fromUserId = row.from_user_id;

  switch (type) {
    case "follow":
      return { title: actorName, body: "started following you", data };
    case "comment":
      return { title: actorName, body: "commented on your post", data };
    case "like":
      return { title: actorName, body: "liked your post", data };
    case "repost":
      return { title: actorName, body: "reposted your post", data };
    case "message":
      return { title: actorName, body: "sent you a message", data };
    case "story":
      return { title: actorName, body: "posted a new story — tap to watch", data };
    case "story_expiring":
      return {
        title: "Watch before it's gone",
        body: `${actorName}'s story expires in about 2 hours`,
        data,
      };
    default:
      return null;
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  // -------------------------------------------------------------------------
  // Auth: shared secret, because the caller is a database trigger.
  // -------------------------------------------------------------------------
  const expectedToken = Deno.env.get("PUSH_FUNCTION_TOKEN");
  if (!expectedToken) {
    console.error("PUSH_FUNCTION_TOKEN is not set on this project");
    return json({ error: "server misconfigured" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const presented = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (presented !== expectedToken) {
    return json({ error: "unauthorized" }, 401);
  }

  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  // Accept both shapes: `notification_ids` (what the trigger sends) and a
  // singular `notification_id` (handy for a manual curl test).
  let ids: string[];
  try {
    const body = await req.json();
    const raw: unknown = body?.notification_ids ?? body?.notification_id;
    ids = (Array.isArray(raw) ? raw : [raw])
      .filter((v): v is string => typeof v === "string" && v.length > 0);
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  if (ids.length === 0) {
    return json({ error: "notification_ids is required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "server misconfigured" }, 500);
  }

  // Service role: this function reads across users (one recipient's tokens are
  // not readable by another user), so it cannot run as the caller.
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // -------------------------------------------------------------------------
  // Load the batch.
  // -------------------------------------------------------------------------
  const { data: notifications, error: notifError } = await supabase
    .from("notifications")
    .select("id, user_id, from_user_id, type, post_id, story_id, conversation_id, is_read")
    .in("id", ids);

  if (notifError) {
    console.error("failed to load notifications", notifError);
    return json({ error: "failed to load notifications" }, 500);
  }
  if (!notifications || notifications.length === 0) {
    return json({ skipped: "no notifications found", sent: 0 }, 200);
  }

  const rows = notifications as NotificationRow[];
  const recipientIds = [...new Set(rows.map((r) => r.user_id))];
  const actorIds = [...new Set(rows.map((r) => r.from_user_id).filter((v): v is string => !!v))];

  // -------------------------------------------------------------------------
  // Preferences, tokens and actor names — one query each for the whole batch.
  // -------------------------------------------------------------------------
  const [prefsRes, tokensRes, profilesRes] = await Promise.all([
    supabase
      .from("notification_preferences")
      .select(
        "user_id, push_enabled, push_follows, push_comments, push_messages, push_stories, push_story_expiry, push_likes, push_reposts",
      )
      .in("user_id", recipientIds),
    supabase
      .from("push_tokens")
      .select("id, user_id, token, platform")
      .in("user_id", recipientIds)
      .eq("is_active", true),
    actorIds.length > 0
      ? supabase.from("profiles").select("id, username, full_name").in("id", actorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (prefsRes.error) console.error("failed to load preferences", prefsRes.error);
  if (tokensRes.error) console.error("failed to load push tokens", tokensRes.error);
  if (profilesRes.error) console.error("failed to load profiles", profilesRes.error);

  const prefsByUser = new Map<string, Record<string, boolean>>(
    (prefsRes.data ?? []).map((p: Record<string, unknown>) => [
      p.user_id as string,
      p as Record<string, boolean>,
    ]),
  );

  const tokensByUser = new Map<string, PushTokenRow[]>();
  for (const t of (tokensRes.data ?? []) as PushTokenRow[]) {
    const list = tokensByUser.get(t.user_id) ?? [];
    list.push(t);
    tokensByUser.set(t.user_id, list);
  }

  const nameByUser = new Map<string, string>(
    (profilesRes.data ?? []).map((p: Record<string, unknown>) => [
      p.id as string,
      ((p.full_name as string) || (p.username as string) || "Someone") as string,
    ]),
  );

  // -------------------------------------------------------------------------
  // Build the messages.
  // -------------------------------------------------------------------------
  const messages: ExpoMessage[] = [];
  const tokenIdByValue = new Map<string, string>();
  let skippedNoTokens = 0;
  let skippedByPrefs = 0;
  let skippedAlreadyRead = 0;

  for (const row of rows) {
    // Dispatch is asynchronous — by the time this runs the recipient may
    // have already read the notification (e.g. they were sitting in the
    // conversation when the message landed and the read-clearing trigger
    // fired). Buzzing about something they have seen is noise, so skip.
    // Only 'message' rows clear this fast in practice, but the check is
    // universal and cheap.
    if (row.is_read) {
      skippedAlreadyRead += 1;
      continue;
    }

    const prefs = prefsByUser.get(row.user_id);
    if (prefs) {
      if (prefs.push_enabled === false || prefs[PREF_COLUMN[row.type]] === false) {
        skippedByPrefs += 1;
        continue;
      }
    }
    // No preferences row: fall back to the column defaults (high-signal on,
    // likes/reposts off) instead of assuming opt-in for everything.
    else if (row.type === "like" || row.type === "repost") {
      skippedByPrefs += 1;
      continue;
    }

    const userTokens = tokensByUser.get(row.user_id);
    if (!userTokens || userTokens.length === 0) {
      skippedNoTokens += 1;
      continue;
    }

    const actorName = row.from_user_id
      ? nameByUser.get(row.from_user_id) ?? "Someone"
      : "Someone";

    const rendered = renderNotification(row.type, actorName, row);
    if (!rendered) continue;

    for (const t of userTokens) {
      tokenIdByValue.set(t.token, t.id);
      messages.push({
        to: t.token,
        title: rendered.title,
        body: rendered.body,
        data: rendered.data,
        sound: "default",
        priority: "high",
        channelId: ANDROID_CHANNEL_ID,
      });
    }
  }

  if (messages.length === 0) {
    return json(
      { sent: 0, skippedNoTokens, skippedByPrefs, skippedAlreadyRead, deactivated: 0 },
      200,
    );
  }

  // -------------------------------------------------------------------------
  // Send, then reconcile Expo's per-token tickets.
  // -------------------------------------------------------------------------
  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
  };
  if (expoAccessToken) headers["Authorization"] = `Bearer ${expoAccessToken}`;

  const deadTokenIds = new Set<string>();
  let sent = 0;
  let failed = 0;

  for (const batch of chunk(messages, EXPO_MAX_BATCH)) {
    let tickets: ExpoTicket[];
    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        console.error(`Expo push API returned ${res.status}: ${await res.text()}`);
        failed += batch.length;
        continue;
      }
      const payload = await res.json();
      tickets = (payload?.data ?? []) as ExpoTicket[];
    } catch (err) {
      console.error("Expo push request failed", err);
      failed += batch.length;
      continue;
    }

    // Tickets are positional: tickets[i] corresponds to batch[i].
    tickets.forEach((ticket, i) => {
      if (ticket.status === "ok") {
        sent += 1;
        return;
      }
      failed += 1;
      const token = batch[i]?.to;
      const tokenId = token ? tokenIdByValue.get(token) : undefined;
      const reason = ticket.details?.error ?? ticket.message;
      console.warn(`push rejected (${reason}) for token ${tokenId ?? "unknown"}`);

      // Uninstalled, or permission revoked. Leaving the row active would make
      // every future send to this user carry one guaranteed failure.
      if (ticket.details?.error === "DeviceNotRegistered" && tokenId) {
        deadTokenIds.add(tokenId);
      }
    });
  }

  if (deadTokenIds.size > 0) {
    const { error: deactivateError } = await supabase
      .from("push_tokens")
      .update({ is_active: false })
      .in("id", [...deadTokenIds]);
    if (deactivateError) {
      console.error("failed to deactivate dead push tokens", deactivateError);
    } else {
      console.log(`deactivated ${deadTokenIds.size} stale push token(s)`);
    }
  }

  return json(
    {
      sent,
      failed,
      deactivated: deadTokenIds.size,
      skippedNoTokens,
      skippedByPrefs,
      skippedAlreadyRead,
    },
    200,
  );
});
