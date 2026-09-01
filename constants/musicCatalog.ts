import type { MusicTrackItem } from "@/store/pendingPost";
import musicCatalogJson from "../supabase/seed/music_catalog.json";

/**
 * The bundled fallback catalog.
 *
 * Two things changed here compared to the original version of this file:
 *
 * 1. It no longer points at `soundhelix.com` / `picsum.photos`. Those were
 *    undocumented third-party demo hosts: no license on the audio, no SLA, and
 *    a preview that dies the moment they reorganise. The whole point of the
 *    self-hosted library is that the app never depends on a host it does not
 *    control, so the fallback uses *your* Supabase Storage bucket instead.
 * 2. It is generated from `supabase/seed/music_catalog.json` -- the exact file
 *    `scripts/seed-music.mjs` uploads and upserts from. Before, the seeded rows
 *    and this list could drift (different ids, different titles); now there is
 *    one manifest, and `music_tracks.id` matches the fallback id, so posts
 *    published before the table was seeded still resolve.
 *
 * If the migration has not been applied, or the bucket has not been seeded
 * yet, these rows are what the picker shows. Playback then depends on the
 * objects existing in the bucket -- `services/musicService.ts` prefers the
 * table, and `SoundChip` disables itself for a track without a URL.
 */
const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");

export const SOUNDS_BUCKET = (musicCatalogJson as { bucket?: string }).bucket ?? "sounds";

/** Public URL for an object key inside the `sounds` bucket. */
export const soundPublicUrl = (storagePath?: string | null): string | undefined => {
  if (!storagePath || !SUPABASE_URL) return undefined;
  // Avoid double-prefixing if a manifest ever stores a full URL.
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  return `${SUPABASE_URL}/storage/v1/object/public/${SOUNDS_BUCKET}/${storagePath}`;
};

type ManifestTrack = {
  id: string;
  title: string;
  artist: string;
  genre?: string;
  durationSeconds?: number;
  isTrending?: boolean;
  storagePath?: string;
  license?: string;
  attribution?: string;
  licenseUrl?: string;
  coverUrl?: string;
};

export const MUSIC_CATALOG: MusicTrackItem[] = ((musicCatalogJson as { tracks?: ManifestTrack[] })
  .tracks ?? []).map((track) => ({
  id: track.id,
  title: track.title,
  artist: track.artist,
  genre: track.genre,
  durationSeconds: track.durationSeconds,
  isTrending: track.isTrending,
  storagePath: track.storagePath,
  audioUrl: soundPublicUrl(track.storagePath),
  coverUrl: track.coverUrl,
  license: track.license && track.license !== "UNVERIFIED" ? track.license : undefined,
  attribution: track.attribution,
  licenseUrl: track.licenseUrl,
}));

/**
 * Used by the feed and the post screen: a post only snapshots
 * `music_track_audio_url` at publish time, so a post made against the old
 * remote URLs (or before that column existed) has nothing to play. Fall back to
 * the catalog entry for the same `music_track_id`.
 */
export const findCatalogTrack = (trackId?: string | null): MusicTrackItem | undefined =>
  trackId ? MUSIC_CATALOG.find((track) => track.id === trackId) : undefined;
