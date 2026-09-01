# Sound Library: self-hosted music

What changed, how to turn it on, and what the rules are for what goes in the
library. This replaces the "static music list" state described in
`FILTERS_MUSIC_AUDIT.md` §1.

## The shape of it

TikTok and Instagram do not call a third-party API per video. They keep a curated
catalog table and attach a sound id to the post. That is what this is now:

```
assets/sounds/*.mp3  --seed-->  Supabase Storage (`sounds` bucket)
                                        |
                                        v
                          public.music_tracks  (id, title, artist, audio_url,
                                        |        storage_path, license,
                                        |        attribution, is_trending)
                                        v
      posts.music_track_{id,title,artist,cover_url,audio_url,attribution}
                                        |
                                        v
                    SoundChip  -- expo-audio playback, one track at a time
```

Nothing here depends on a third-party host staying alive, and no per-video
network call leaves the app.

## Applying it

1. Migrations, in order (`supabase db push`, or the SQL editor, newest last):
   - `20260831120000_music_and_filters.sql` — `music_tracks` + the post snapshot columns (already applied in most branches)
   - `20260901120000_sounds_library.sql` — `sounds` bucket, provenance columns, `posts.music_track_audio_url`, `music_track_usage` view, `trending_music_tracks()`

2. Add the service key to `.env.local` (gitignored; **not** `.env.example`, and
   never `EXPO_PUBLIC_`-prefixed — the app must not be able to reach it):

   ```
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   ```

3. Put the audio where the manifest says (`supabase/seed/music_catalog.json`,
   one entry per track; `assets/sounds/` is gitignored, see its README).

4. Dry-run first, then seed:

   ```bash
   npm run seed:music -- --dry-run     # validates ids, provenance, file presence
   npm run seed:music                  # uploads + upserts
   ```

   Without a service key, or for a shared/staging project you would rather not
   hand a key to:

   ```bash
   npm run seed:music -- --print-sql --out=supabase/seed/music_tracks.sql
   # upload the files in Dashboard -> Storage -> sounds/tracks/, then run the SQL
   ```

5. Restart the packager. `services/musicService.ts` queries `music_tracks` and
   only falls back to the bundled catalog if that query fails, so a silent
   fallback usually means the migration has not been applied to the project
   `EXPO_PUBLIC_SUPABASE_URL` points at.

Verify:

```sql
select mt.id, mt.title, mt.license, u.usage_count
from public.music_tracks mt
left join public.music_track_usage u on u.music_track_id = mt.id
order by u.usage_count desc nulls last;

select count(*) from public.posts where music_track_audio_url is not null;
```

## Decisions worth knowing before you change this

- **Snapshot columns, not a foreign key.** `posts` stores title/artist/cover/audio
  as text. Deliberate: a post published against the bundled catalog keeps
  rendering even though its `music_track_id` (`"1"`…`"8"`) has no matching row,
  and editing or deleting a catalog row cannot rewrite history on an existing
  post. Consequence: **old posts have `music_track_audio_url = null`** and show
  the static label rather than a play button. Re-point them with
  `update public.posts set music_track_audio_url = <url> where music_track_id = <id>;`
  if you want playback on them.
- **`music_track_usage` is a view, not a `usage_count` column.** A counter you
  `UPDATE ... SET usage_count = usage_count + 1` loses updates under concurrent
  inserts and never decrements when the post is deleted. Counting is cheap at
  this size and cannot drift.
- **`security_invoker = true` on that view matters.** Without it the view runs as
  its owner and bypasses RLS on `posts`, leaking how many posts private accounts
  attached to a given sound.
- **The bucket is public, the table is not user-writable.** Anyone who can see a
  post must be able to stream its sound. Writes are `service_role` only, so the
  catalog can only be changed by you — a user cannot inject a track into the
  shared library.
- **One sound at a time.** `lib/useTrackSound.ts` keeps a module-level claim:
  FlatList keeps rows mounted, `viewPost.tsx` stays mounted underneath, and the
  camera sheet sits on top of the feed. Without the claim you get two tracks
  over each other. Screen blur calls `stopAllSounds()` (in `useFocusEffect`)
  because expo-router does not unmount the screen you cover.
- **`interruptionMode: "mixWithOthers"`.** Taking exclusive audio focus suspends
  the `expo-video` player underneath on Android, so the video freezes the moment
  a sound starts. Mixed is the intended behaviour (music over the video's own
  audio), same as the picker preview already did.
- **Playback is opt-in, not autoplay.** The chip starts the sound on tap. Autoplay
  on view would fight the video's audio session, burn mobile data, and is the
  kind of thing users resent. If you want TikTok-style autoplay, gate it behind a
  setting and only for Wi-Fi.

## Licensing rules for whatever goes in the bucket

The mechanism is done; the *content* is the part that gets people in trouble.
The manifest has `license` / `attribution` / `licenseUrl` per track and the
seeder **refuses** a track marked `UNVERIFIED` (override: `--allow-unverified`,
for throwaway local work). The app renders `attribution` next to the sound on the
post.

| Source | Actually means |
| --- | --- |
| Pixabay Audio | Not CC. Their Content License: commercial OK, no attribution required, **no sale or redistribution of the file standalone** — fine inside a user's video, not fine as a downloadable "sound pack". No indemnification. |
| Jamendo | A *mix* of CC licences, many **BY-NC** (non-commercial) or **ND** (no derivatives). Free downloads are personal use; commercial sync needs their paid licensing arm. BY obliges attribution — which is exactly what `attribution` displays. |
| Free Music Archive | Per-release licences, verify each one; do not assume the site-wide label. |
| CC0 / public domain | No conditions. Still record `licenseUrl` so a future reader knows why. |
| Epidemic / Artlist / Soundstripe | Real licences, paid. Only needed if the app goes commercial. |
| Spotify `preview_url` | Dead since 27 Nov 2024 for new apps; the developer policy also forbids building a service out of the clips. Not an option. |
| iTunes Search API | 30s previews, no key. Works for a demo; grants no streaming rights, so it is not a production answer. |

Two things a clone demo usually skips and should not:

1. **Mechanical / performance rights.** A licensed "royalty-free" track covers
   synchronisation. Public performance of a stream in an app is separately in
   scope for PROs (ASCAP/BMI/PRS…) in many territories. Irrelevant for a
   portfolio piece, very relevant the moment the app has real users.
2. **Derivative works.** Cutting a track to 15s and looping it under a video is
   an adaptation; **ND**-licensed tracks do not allow that. Trim the library to
   CC0 / BY / BY-SA.

For a portfolio project: Pixabay + CC0, `attribution` filled in, no monetisation,
and a "music: <artist>, <licence>" line in the README. That is defensible.

## Not done yet

- Sound detail page (`/sound/[id]`) listing every post using a track — the usage
  view and index are already there for it.
- `expo-video`'s own audio and the attached track both play at full volume; no
  ducking slider on publish yet.
- `app/(pages)/userProfile.tsx` and `app/(tabs)/profile.tsx` still render media
  with `expo-image`, so sounds do not appear there at all.
- Upload of the audio itself is admin-only by design; there is no "upload your own
  original sound" flow.
