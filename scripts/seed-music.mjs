#!/usr/bin/env node
/**
 * Seed the self-hosted sound library.
 *
 *   npm run seed:music                      # upload audio + upsert catalog rows
 *   npm run seed:music -- --dry-run         # validate the manifest, touch nothing
 *   npm run seed:music -- --print-sql       # emit SQL instead (no service key needed)
 *   npm run seed:music -- --only=a,b        # seed a subset
 *
 * Reads supabase/seed/music_catalog.json -- the same file the app imports as its
 * offline fallback catalog (constants/musicCatalog.ts), so the seeded rows and
 * the bundled fallback cannot drift apart.
 *
 * Needs two env vars, loaded from .env.local then .env (real env wins):
 *   SUPABASE_URL                 (or EXPO_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY    (service role only -- music_tracks is
 *                                 deliberately not writable by `authenticated`)
 *
 * The service role key is a secret: it stays in .env.local (gitignored) and is
 * never read by the app. lib/supabase.ts only ever uses the anon key.
 *
 * No dependencies -- global fetch, Node 18+.
 */

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = new Map();
for (const raw of process.argv.slice(2)) {
  if (!raw.startsWith("--")) continue;
  const body = raw.slice(2);
  const eq = body.indexOf("=");
  args.set(eq === -1 ? body : body.slice(0, eq), eq === -1 ? true : body.slice(eq + 1));
}

const flag = (name) => args.has(name);
const opt = (name) => {
  const value = args.get(name);
  return value === undefined || value === true ? undefined : String(value);
};

const DRY_RUN = flag("dry-run");
const PRINT_SQL = flag("print-sql");
const ALLOW_UNVERIFIED = flag("allow-unverified");
const NO_UPLOAD = flag("no-upload");
const CATALOG_FILE = path.resolve(ROOT, opt("catalog") ?? "supabase/seed/music_catalog.json");
const ONLY = opt("only")?.split(",").map((s) => s.trim()).filter(Boolean);
const CONCURRENCY = Math.max(1, Number(opt("concurrency") ?? 3));
const MAX_BYTES = Number(opt("max-mb") ?? 25) * 1024 * 1024;

const MIME = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
  flac: "audio/flac",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const log = (...a) => console.log(...a);
const die = (msg, hint) => {
  console.error(`\n✖ ${msg}`);
  if (hint) console.error(`  → ${hint}`);
  process.exit(1);
};

const backoff = (attempt) => new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
const safeText = (res) => res.text().catch(() => "");

/**
 * `.env.local` then `.env`, without clobbering vars the shell already set.
 * Deliberately skips `.env.example`.
 */
async function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) continue;
    for (const line of (await readFile(full, "utf8")).split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/i.exec(line);
      if (!match) continue;
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (value && process.env[match[1]] === undefined) process.env[match[1]] = value;
    }
  }
}

async function request(url, init = {}, retries = 3) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      // 429/5xx are worth a retry; 4xx (bad key, missing bucket, RLS refusal)
      // are a config problem and must surface immediately.
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`HTTP ${res.status} — ${(await safeText(res)).slice(0, 300)}`);
        await backoff(attempt);
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
      await backoff(attempt);
    }
  }
  throw lastError ?? new Error(`request failed: ${url}`);
}

function extFor(candidate, fallback = "mp3") {
  const clean = String(candidate ?? "").split("?")[0].split("#")[0];
  const ext = path.extname(clean).slice(1).toLowerCase();
  return MIME[ext] ? ext : fallback;
}

/** Resolve a repo-relative path, or null when it is empty. */
function repoPath(value) {
  if (!value) return null;
  return path.isAbsolute(value) ? value : path.join(ROOT, value);
}

/**
 * Read an asset from the local file if present, otherwise download it once
 * into a temp dir. The download is a bootstrap convenience only: what ends up
 * in the bucket is your copy, so a third-party host disappearing cannot break
 * existing posts.
 */
async function resolveAsset({ localFile, sourceUrl, kind, id, tempDir }) {
  const local = repoPath(localFile);
  if (local && existsSync(local)) {
    const buf = new Uint8Array(await readFile(local));
    return { bytes: buf, ext: extFor(local, kind === "audio" ? "mp3" : "png"), origin: localFile };
  }

  if (!sourceUrl) {
    throw new Error(
      local
        ? `no ${kind} asset -- expected it at "${localFile}" (drop the file there, or set sourceUrl)`
        : `no ${kind} -- set "${kind === "audio" ? "localFile" : "coverFile"}" or "sourceUrl"`,
    );
  }

  const res = await request(sourceUrl, { headers: { "user-agent": "clone-seed-music/1.0" } });
  if (!res.ok) throw new Error(`could not download ${kind} (${res.status}) from ${sourceUrl}`);

  const bytes = new Uint8Array(await res.arrayBuffer());
  const ext = MIME[extFor(sourceUrl, "")] ? extFor(sourceUrl, "") : kind === "audio" ? "mp3" : "jpg";
  if (kind === "audio") {
    await mkdir(tempDir, { recursive: true });
    const cache = path.join(tempDir, `${id}.${ext}`);
    await writeFile(cache, bytes);
    log(`   · downloaded ${kind} → ${path.relative(ROOT, cache)} (keep it: commit-free local copy)`);
  }
  return { bytes, ext, origin: sourceUrl };
}

/** Run `fn` over `items` with at most `limit` in flight. */
async function pool(items, limit, fn) {
  const results = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function sqlLiteral(value) {
  if (value === null || value === undefined || value === "") return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlBoolean(value) {
  return value ? "true" : "false";
}

async function main() {
  await loadEnv();

  if (!existsSync(CATALOG_FILE)) {
    die(`catalog manifest not found at ${path.relative(ROOT, CATALOG_FILE)}`);
  }

  const manifest = JSON.parse(await readFile(CATALOG_FILE, "utf8"));
  let tracks = Array.isArray(manifest.tracks) ? manifest.tracks : [];
  if (tracks.length === 0) die("the catalog manifest has no `tracks`.");

  if (ONLY?.length) tracks = tracks.filter((t) => ONLY.includes(t.id));
  if (tracks.length === 0) die(`no tracks matched --only=${ONLY.join(",")}`);

  const bucket = opt("bucket") ?? manifest.bucket ?? "sounds";
  const url = opt("url") ?? process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? "";

  if (url && /your-project\.supabase\.co/.test(url)) {
    die("SUPABASE_URL is still the .env.example placeholder.", "set it in .env.local");
  }

  const needsApi = !DRY_RUN && !PRINT_SQL;
  if (needsApi && (!url || !key)) {
    die(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to seed.",
      "put them in .env.local, or run with --print-sql and paste the output into the Supabase SQL editor instead.",
    );
  }

  const publicBase = (opt("public-base") ?? url).replace(/\/+$/, "");
  const tempDir = path.join(os.tmpdir(), `clone-seed-music-${process.pid}`);

  // ── validate first: a half-seeded library is worse than a refused run, and
  //    reporting one problem at a time turns a 2-minute fix into 8 of them ────
  const problems = [];
  const ids = new Set();
  for (const track of tracks) {
    for (const field of ["id", "title", "artist"]) {
      if (!track[field]) problems.push(`${track.id ?? "?"}: missing required field "${field}"`);
    }
    if (ids.has(track.id)) problems.push(`${track.id}: duplicate id in the manifest`);
    ids.add(track.id);

    const license = String(track.license ?? "").trim();
    // --allow-unverified skips only the "I did not record this" complaint. The
    // CC-BY attribution check below has no override: it is the licence's own
    // condition, not a housekeeping preference.
    if (!ALLOW_UNVERIFIED && (!license || license.toUpperCase() === "UNVERIFIED")) {
      problems.push(
        `${track.id}: license is "${license || "unset"}" -- record where the track came from, ` +
          `or pass --allow-unverified to accept the risk yourself (portfolio/demo only)`,
      );
    } else if (/CC-BY/i.test(license) && !String(track.attribution ?? "").trim()) {
      problems.push(
        `${track.id}: a CC-BY track must record its "attribution" string -- the app displays ` +
          `it next to the sound, and the licence requires it`,
      );
    }

    const local = repoPath(track.localFile);
    if (!local && !track.sourceUrl && !NO_UPLOAD) {
      problems.push(`${track.id}: no audio -- set "localFile" (expected ${track.localFile ?? "?"}) or "sourceUrl"`);
    }
  }

  if (problems.length && !DRY_RUN) {
    console.error(`\n✖ ${problems.length} problem(s) in ${path.relative(ROOT, CATALOG_FILE)}:`);
    for (const problem of problems) console.error(`   · ${problem}`);
    process.exit(1);
  }

  log(`\nSound library → bucket "${bucket}", ${tracks.length} track(s)${DRY_RUN ? " [dry run]" : ""}${PRINT_SQL ? " [sql]" : ""}`);

  // ── SQL-only mode: no upload, so paths are what the migration expects ──────
  if (PRINT_SQL) {
    const rows = tracks.map((t) => {
      const ext = extFor(t.storagePath ?? t.localFile ?? t.sourceUrl);
      const storagePath = t.storagePath ?? `tracks/${t.id}.${ext}`;
      return `  (${sqlLiteral(t.id)}, ${sqlLiteral(t.title)}, ${sqlLiteral(t.artist)}, ${sqlLiteral(
        publicBase ? `${publicBase}/storage/v1/object/public/${bucket}/${storagePath}` : null,
      )} /* upload ${t.localFile ?? t.sourceUrl} to ${bucket}/${storagePath} */, ${sqlLiteral(
        t.coverUrl ?? null,
      )}, ${sqlLiteral(storagePath)}, ${Number(t.durationSeconds) || 0}, ${sqlLiteral(
        t.license || "UNVERIFIED",
      )}, ${sqlLiteral(t.attribution)}, ${sqlLiteral(t.licenseUrl)}, ${sqlLiteral(t.genre)}, ${sqlBoolean(
        Boolean(t.isTrending),
      )})`;
    });

    const sql = [
      "-- Generated by scripts/seed-music.mjs -- do not edit by hand.",
      "-- Upload the audio files first (Supabase Dashboard → Storage → sounds → tracks/),",
      "-- or run `npm run seed:music` to upload and seed in one go.",
      "insert into public.music_tracks",
      "  (id, title, artist, audio_url, cover_url, storage_path, duration_seconds, license, attribution, license_url, genre, is_trending)",
      "values",
      rows.join(",\n"),
      "on conflict (id) do update set",
      "  title = excluded.title,",
      "  artist = excluded.artist,",
      "  audio_url = excluded.audio_url,",
      "  cover_url = excluded.cover_url,",
      "  storage_path = excluded.storage_path,",
      "  duration_seconds = excluded.duration_seconds,",
      "  license = excluded.license,",
      "  attribution = excluded.attribution,",
      "  license_url = excluded.license_url,",
      "  genre = excluded.genre,",
      "  is_trending = excluded.is_trending,",
      "  updated_at = now();",
      "",
    ].join("\n");

    const outFile = opt("out") ? path.resolve(ROOT, opt("out")) : null;
    if (outFile) {
      await mkdir(path.dirname(outFile), { recursive: true });
      await writeFile(outFile, sql, "utf8");
      log(`wrote ${path.relative(ROOT, outFile)}`);
    } else {
      log(sql);
    }
    return;
  }

  // One track failing must not hide the state of the others: collect the
  // per-track errors and report them in a single pass.
  const results = await pool(tracks, CONCURRENCY, (track) =>
    seedTrack(track).catch((error) => ({
      id: track.id,
      ok: false,
      message: error?.message ?? String(error),
    })),
  );

  async function seedTrack(track) {
    const audio = await resolveAsset({
      localFile: track.localFile,
      sourceUrl: track.sourceUrl,
      kind: "audio",
      id: track.id,
      tempDir,
    });

    if (audio.bytes.byteLength > MAX_BYTES) {
      throw new Error(
        `${(audio.bytes.byteLength / 1024 / 1024).toFixed(1)} MB exceeds --max-mb (${MAX_BYTES / 1024 / 1024} MB)`,
      );
    }

    // storagePath comes from the manifest so constants/musicCatalog.ts (the offline
    // fallback) derives byte-identical URLs; the extension must match the file.
    const storagePath = track.storagePath ?? `tracks/${track.id}.${audio.ext}`;
    if (extFor(storagePath, "") !== audio.ext && !NO_UPLOAD) {
      log(`  ! ${track.id}: manifest storagePath ("${storagePath}") has a different extension than the file (.${audio.ext}) -- using the file's.`);
    }
    const row = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      storage_path: storagePath,
      audio_url: publicBase ? `${publicBase}/storage/v1/object/public/${bucket}/${storagePath}` : track.audioUrl ?? null,
      cover_url: track.coverUrl ?? null,
      duration_seconds: Number(track.durationSeconds) || 0,
      license: track.license || "UNVERIFIED",
      attribution: track.attribution || null,
      license_url: track.licenseUrl || null,
      genre: track.genre || null,
      is_trending: Boolean(track.isTrending),
    };

    if (DRY_RUN || NO_UPLOAD) {
      return { id: track.id, ok: true, row, planned: true };
    }

    const headers = { authorization: `Bearer ${key}`, apikey: key };
    const uploaded = await request(
      `${url}/storage/v1/object/${bucket}/${storagePath}`,
      {
        method: "POST",
        headers: { ...headers, "content-type": MIME[audio.ext], "x-upsert": "true" },
        body: audio.bytes,
      },
    );
    if (!uploaded.ok) {
      throw new Error(`storage upload failed (${uploaded.status}) ${await safeText(uploaded)}`);
    }

    if (track.coverFile || track.coverUrl) {
      const cover = await resolveAsset({
        localFile: track.coverFile,
        sourceUrl: track.coverUrl,
        kind: "image",
        id: track.id,
        tempDir,
      });
      const coverPath = `covers/${track.id}.${cover.ext}`;
      const coverRes = await request(`${url}/storage/v1/object/${bucket}/${coverPath}`, {
        method: "POST",
        headers: { ...headers, "content-type": MIME[cover.ext], "x-upsert": "true" },
        body: cover.bytes,
      });
      if (coverRes.ok) row.cover_url = `${publicBase}/storage/v1/object/public/${bucket}/${coverPath}`;
      else log(`  ! ${track.id}: cover upload failed (${coverRes.status}) — continuing without art`);
    }

    log(`  ✓ ${track.id.padEnd(24)} uploaded ${(audio.bytes.byteLength / 1024 / 1024).toFixed(1)} MB`);
    return { id: track.id, ok: true, row };
  }

  const failures = results.filter((r) => !r?.ok);
  const plan = results.filter((r) => r?.ok).map((r) => r.row);

  if (DRY_RUN) {
    for (const result of results) {
      log(
        result.ok
          ? `  ✓ ${result.id.padEnd(24)} ${(result.row.audio_url ?? "(no public base)").slice(0, 58).padEnd(60)} [${result.row.license}]`
          : `  ✖ ${result.id.padEnd(24)} ${result.message}`,
      );
    }
    for (const problem of problems) log(`  ! ${problem}`);
    const blockers = problems.length + failures.length;
    log(
      `\nDry run: ${plan.length}/${tracks.length} track(s) resolved, ` +
        (blockers ? `${blockers} problem(s) a real run would refuse` : "nothing blocking a real run") +
        ". Nothing uploaded.",
    );
    if (blockers) {
      log("Fix the entries above and re-run. `--allow-unverified` waives the provenance notes only.");
      process.exit(1);
    }
    log("Looks good: `npm run seed:music` will upload and upsert these.");
    return;
  }

  if (NO_UPLOAD) {
    log(`\n--no-upload: ${plan.length} row(s) resolved, nothing pushed to storage.`);
    return;
  }

  if (failures.length) {
    console.error(`\n✖ ${failures.length} track(s) failed; the catalog was NOT upserted:`);
    for (const failure of failures) console.error(`   · ${failure.id}: ${failure.message}`);
    process.exit(1);
  }

  // ── upsert the catalog (music_tracks is service-role writable only) ────────
  const upsert = await request(`${url}/rest/v1/music_tracks`, {
    method: "POST",
    headers: {
      ...headersFor(key),
      "content-type": "application/json",
      prefer: "return=minimal,resolution=merge-duplicates",
    },
    body: JSON.stringify(plan),
  });
  if (!upsert.ok) {
    die(
      `catalog upsert failed (${upsert.status}) ${await safeText(upsert)}`,
      "the most common cause is applying supabase/migrations/20260831120000_music_and_filters.sql and 20260901120000_sounds_library.sql out of order.",
    );
  }

  await rm(tempDir, { recursive: true, force: true });

  log(`\n✔ ${plan.length} sound(s) live in the "${bucket}" bucket and public.music_tracks.`);
  log("  The picker reads the table first and only falls back to the bundled");
  log("  catalog when the query fails, so restart the app to see them.\n");
  log("  Verify in SQL:");
  log("    select id, title, license, usage_count");
  log("    from public.music_tracks mt");
  log("    left join public.music_track_usage u on u.music_track_id = mt.id;");
  log("");
}

function headersFor(key) {
  return { authorization: `Bearer ${key}`, apikey: key };
}

main().catch((err) => die(err?.message ?? String(err), err?.stack?.split("\n")[1]?.trim()));
