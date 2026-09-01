# Filters + Music Audit & Upgrade Plan

> **Status update (2026-09-01) — the music half of this audit is done; do not
> re-implement it from the notes below.** `music_tracks` exists
> (`supabase/migrations/20260831120000_music_and_filters.sql`), the catalog is
> seeded from `supabase/seed/music_catalog.json` into a public `sounds` Storage
> bucket (`20260901120000_sounds_library.sql`), preview *and* post playback are
> wired through `expo-audio` (`components/SoundChip.tsx`,
> `lib/useTrackSound.ts`), and trending is computed from real post counts via the
> `music_track_usage` view. See **MUSIC_SOUNDS_SETUP.md** for the runbook and the
> licensing rules.
>
> Two specifics in this document are now wrong and cost time if trusted: audio is
> **not** static anymore, and §1's "video playback is a big gap" is closed —
> `IndexVideoFeed.tsx` and `viewPost.tsx` both use `useVideoPlayer`/`VideoView`.
> The filter half (§2) is still accurate.

**Date:** 2026-08-31
**Branch:** `arena/01a057b9-clone`

This audit is based on what is actually in the repo right now — not what the app "should" be. It answers:

1. What do you already have?
2. What is missing to make filters feel like Snapchat / a real social app?
3. What is missing to make music *real* (playable, selectable, saved, shown in the feed) instead of a static list?
4. Does the UI need upgrading?

---

## 1. What you already have

### ✅ Filters (basic)
- `components/camera/FilterPicker.tsx` defines 8 filters: `none`, `golden`, `vintage`, `mono`, `cyberpunk`, `sunset`, `emerald`, `cool`.
- `components/TestCamera.tsx` applies the filter as a **translucent color view on top of the camera preview** and in the post-capture studio.
- `app/(pages)/postDetails.tsx` re-applies the same color overlay to the preview thumbnail.
- `store/pendingPost.ts` stores `filterId`.

### ✅ Music (static only)
- `components/camera/MusicPickerModal.tsx` has a hard-coded `TRENDING_SOUNDS` array (8 tracks).
- It only stores `{ id, title, artist }`. It **does not play audio**.
- `store/pendingPost.ts` stores `musicTrack: MusicTrackItem`.
- `postDetails.tsx` simply appends `🎵 title - artist` to the caption when publishing.
- The current package.json does **not** include `expo-av` or `expo-audio`.

### ✅ Camera capture
- `TestCamera.tsx` records photos/videos, supports flash, flip, speed, timer, gallery import, text overlay, stickers.

### ❌ Video playback (big gap)
- `expo-video` is in `package.json`, but **it is not used anywhere**.
- `IndexVideoFeed.tsx` renders **every** post with `expo-image` `Image`, including videos.
- `viewPost.tsx`, `userProfile.tsx`, `profile.tsx` also render with `Image` regardless of `media_type`.
- So a posted video is effectively a paused poster frame in the feed today.

---

## 2. What "filter like Snapchat" really requires

Your current filter is a **color wash** — not a Snapchat-style filter. The gap is big unless you lower the bar to "social-media style color grading".

### Must add / decide:

| Feature | Current | Needed for real filter feel |
|---|---|---|
| Color tint / overlay | ✅ | ✅ |
| Brightness / contrast / saturation / temperature | ❌ | ✅ real photo filters |
| Vignette / blur / grain / light leaks | ❌ | ✅ |
| Filter intensity slider | ❌ | ✅ (Snapchat lets you adjust) |
| Live preview of filter before capture | ✅ (color overlay) | ✅ must work for all effects |
| Face-tracking AR filters (mask, dog ears, beauty) | ❌ | Needs ML Kit / face detector |
| Draggable, scalable, rotatable stickers/text | ❌ (fixed position) | ✅ `react-native-gesture-handler` + `reanimated` (already installed) |
| Filter list stored as a persisted effect in DB | ❌ | ✅ so viewers see the same look |

### Recommended implementation path

- **Quick win (no native face tracking):**
  - Use **`@shopify/react-native-skia`** to render real camera filters (gradients, color matrix, blur, noise) on the live preview and the studio.
  - Add filter intensity + Brightness/Contrast/Saturation/Temperature sliders.
  - Make stickers/text draggable/scale/rotate with `react-native-gesture-handler` + `reanimated` (both already installed).

- **Real AR / face filters (Snapchat-level):**
  - You cannot do real face tracking with `expo-camera` alone.
  - Add `react-native-vision-camera` + `vision-camera-face-detector` (or ML Kit face detection) for face landmarks/masks.
  - This is a native build — it will not run in Expo Go. You already have `expo-dev-client` + `eas.json`, so native builds are fine.

- **Exporting filters:**
  - For photos, use `expo-image-manipulator` or Skia snapshot to bake the filter into the uploaded file.
  - For videos, either (a) store the filter as metadata and re-render on the client, or (b) bake it server-side with ffmpeg in a Supabase Edge Function.

---

## 3. What "music not static" really requires

The current music is a **fake list with no audio and no persistence**. To make it real:

### Must add:

1. **Audio playback library**
   - Use **`expo-audio`** (current Expo 57 package) for:
     - Listing tracks, preview-play, pause, seek, loop.
     - Volume control.
   - `expo-av` is deprecated for new projects; prefer `expo-audio`.

2. **Real track data**
   - `MusicTrackItem` needs: `id`, `title`, `artist`, `audio_url`, `cover_url`, `duration_seconds`, `license`, `is_trending`, `favorite_count`.
   - The source can be:
     - Local bundled audio (small catalog),
     - A Supabase `music_tracks` table + storage bucket for audio,
     - Or a licensed API (e.g. Audius, Free Music Archive, JioSaavn/Spotify only for streaming, not embedding).

3. **UI for choosing sound**
   - Search + categories (Trending, For You, Comedy, Hip-Hop, etc.) — you already have the search bar.
   - Preview play while browsing (each row should actually play).
   - Sound detail page (`/sound/[id]`) showing creator, duration, how many posts use it.
   - Favorites for sounds.

4. **Editing features**
   - Volume slider.
   - Trim / start & end selection.
   - "Use original sound" toggle.
   - Keep music after posting (metadata, not just a caption string).

5. **Embedding audio in a video**
   - `CameraView.recordAsync()` **does not mix a selected music track into the recording**.
   - Real social apps do this server-side: upload the video + track ID, then a **Supabase Edge Function** runs ffmpeg to mux the audio into the video (or produce a streamed mix).
   - Alternative (simpler but less "Snapchat"): keep the original video, store the track ID, and the **feed player** plays the music alongside the video and shows the running ticker.
   - This is the correct tradeoff for a first version.

6. **Backend persistence**
   - Add a `music_tracks` table in Supabase.
   - Add to `posts`: `music_track_id`, `filter_id`/`filter_config`, `duration_seconds`, `has_sound`.
   - Update service queries to join/return music metadata.
   - Update upload logic to accept the correct MIME type for videos (currently `uploadMedia()` hardcodes `image/jpeg` and `.jpg`).

---

## 4. UI upgrade needed

Yes — the current UI is a **static Facebook/Instagram feed**, not a social-video camera app. You should upgrade if you want Snapchat/TikTok vibes.

### Recommended UI changes (in priority order)

1. **Full-screen video feed**
   - Make `home.tsx` + `IndexVideoFeed.tsx` a vertical, full-width video feed using `expo-video`.
   - Each card autoplays when visible, pauses when out of view.
   - Add mute/unmute, pause, and a music ticker that scrolls.

2. **Media-aware rendering everywhere**
   - `viewPost`, `userProfile`, `profile`, `followList` must render `video` with `VideoView` and `image` with `Image`.
   - This is currently the single most visible "broken feature".

3. **Camera creator panel**
   - Move filters to a **bottom tray with actual filter thumbnails** (mini preview of the camera feed under each filter), like TikTok/Snapchat.
   - Add filter intensity slider.
   - Add a dedicated "Add Sound" flow with real playback and a 15s/30s/60s trim rail.

4. **Post/Profile grids**
   - Show a play icon/badge on video thumbnails in profile grids.
   - Open videos in a proper full-screen video viewer.

5. **Post detail**
   - Show the attached sound as a tappable pill that opens the sound page.
   - Show filter on the actual post if it was applied.

---

## 5. Exact things to add to the repo

### New dependencies

```bash
npx expo install expo-audio @shopify/react-native-skia
```

Optional, for fuller AR/better camera:
```bash
npx expo install expo-image-manipulator
# native-only for face detection:
npm i react-native-vision-camera
npm i vision-camera-face-detector
```

`expo-video`, `react-native-gesture-handler`, `react-native-reanimated` are **already installed** but under-used.

### Type changes (`store/pendingPost.ts`)

```ts
export type MusicTrackItem = {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  audioUrl?: string;
  durationSeconds?: number;
  isTrending?: boolean;
};

export type FilterConfig = {
  id: string;
  intensity?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  temperature?: number;
  vignette?: number;
};
```

### Schema migration (new Supabase migration)

```sql
create table public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  cover_url text,
  audio_url text,
  duration_seconds int not null default 0,
  license text,
  is_trending boolean default false,
  created_at timestamptz default now()
);

alter table public.posts
  add column music_track_id uuid references public.music_tracks(id),
  add column filter_id text,
  add column duration_seconds int,
  add column has_sound boolean default false;

alter table public.posts enable row level security;
create policy "public read music tracks" on public.music_tracks for select using (true);
```

Add public read/write RLS and a Supabase storage bucket for audio if you self-host clips.

### Service changes (`services/postService.ts`)
- `createPost()` should accept `music_track_id`, `filter_id`, `duration_seconds`, `has_sound`.
- `uploadMedia()` must use the right file extension and `contentType` for videos (`video/mp4`).
- `getPosts()` / `getPostsByUser()` should join `music_tracks`.

### Feed changes (`components/IndexVideoFeed.tsx`)
- Render `VideoView` for `media_type === "video"`.
- Show sound pill tied to `music_track`.
- Autoplay/mute controls along with Reanimated or FlashList's viewability callbacks.

---

## 6. Recommended build order

| Phase | Work | Result |
|---|---|---|
| 1 | Add `expo-audio`, make music rows actually preview-play; add real `audio_url`; add volume + trim UI | "Music not static" |
| 2 | Add `music_tracks` table + post columns + storage; persist filter/sound metadata | Saved / shareable |
| 3 | Play videos in feed with `expo-video` + full-screen viewer | Real social feed |
| 4 | Upgrade filters with Skia (color matrix, intensity, vignette) | Real photo filters |
| 5 | Draggable/scale/rotate text & stickers | Social-creator feel |
| 6 | (Native build) ML Kit face tracking + face masks | Snapchat-level AR |

---

## 7. Bottom line

- **You do not need to throw away the project.** The routing, auth, posts, profile, chat, likes/comments/saves and basic camera are already solid foundations.
- **You need to add:** real audio playback (`expo-audio`), a `music_tracks` model + `posts` metadata columns, real video rendering in the feed (`expo-video`), and either Skia for real photo filters or ML Kit for AR face filters.
- **You need to upgrade the UI:** the home screen should become a vertical video feed, filters should be live thumbnails with an intensity slider, and profile/grid thumbnails should be video-aware.
- **The biggest single "bug" to fix first:** videos are treated as images everywhere. Fix that and the app immediately feels like a modern social app.
