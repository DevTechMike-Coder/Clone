import { MusicTrackItem } from "@/store/pendingPost";
import { supabase } from "@/lib/supabase";
import { MUSIC_CATALOG } from "@/constants/musicCatalog";

/**
 * Reads the music catalog from Supabase when the `music_tracks` table
 * exists, otherwise falls back to the bundled catalog. This keeps the
 * app usable before the migration has been applied.
 *
 * Post counts ("N people used this sound") come from
 * `public.music_track_usage`, a security-invoker view over `posts`. They are
 * deliberately *not* a `usage_count` column on `music_tracks`: an incremented
 * counter loses updates under concurrent inserts and never decrements when a
 * post is deleted, which is exactly how fake-looking trending lists get made.
 */
const toTrackItem = (row: Record<string, any>): MusicTrackItem => ({
  id: String(row.id),
  title: row.title,
  artist: row.artist,
  coverUrl: row.cover_url || undefined,
  audioUrl: row.audio_url || undefined,
  durationSeconds: row.duration_seconds ?? undefined,
  isTrending: row.is_trending ?? false,
  storagePath: row.storage_path || undefined,
  license: row.license && row.license !== "UNVERIFIED" ? row.license : undefined,
  licenseUrl: row.license_url || undefined,
  attribution: row.attribution || undefined,
  genre: row.genre || undefined,
  usageCount: row.usage_count ?? undefined,
});

export const musicService = {
  async getMusicTracks(): Promise<MusicTrackItem[]> {
    try {
      const [{ data, error }, usage] = await Promise.all([
        supabase.from("music_tracks").select("*").limit(200),
        // Optional enrichment: before the usage view is migrated this just
        // resolves to an empty map, which the caller never notices.
        supabase.from("music_track_usage").select("music_track_id,usage_count").limit(500),
      ]);

      if (error) throw error;

      if (data && data.length > 0) {
        const counts = new Map<string, number>();
        for (const row of usage.data ?? []) {
          counts.set(String(row.music_track_id), Number(row.usage_count) ?? 0);
        }

        return data.map((row: any) => {
          const track = toTrackItem(row);
          // RLS scopes the view, so a signed-out visitor can legitimately see
          // 0 for posts they cannot read. Only trust a number we actually got.
          return counts.has(track.id) ? { ...track, usageCount: counts.get(track.id) } : track;
        });
      }
    } catch (error) {
      // No migration / no table yet — bundled catalog is fine for now.
      console.warn("Music catalog table unavailable, using bundled tracks.", error);
    }

    return MUSIC_CATALOG;
  },

  async getTrendingTracks(): Promise<MusicTrackItem[]> {
    const tracks = await this.getMusicTracks();
    const withPlays = tracks.some((track) => (track.usageCount ?? 0) > 0);

    // Real usage beats the hand-set flag as soon as anybody has posted with a
    // sound; `is_trending` only decides the order of a brand-new catalog.
    return [...tracks].sort((a, b) => {
      if (withPlays) return (b.usageCount ?? 0) - (a.usageCount ?? 0);
      return Number(Boolean(b.isTrending)) - Number(Boolean(a.isTrending));
    });
  },

  /**
   * Resolve a single track by id. `posts` snapshot the display fields rather
   * than keeping a foreign key, so this is how a post rehydrates the piece it
   * never stored: the playable URL.
   */
  async getTrackById(trackId?: string | null): Promise<MusicTrackItem | null> {
    if (!trackId) return null;

    const { data, error } = await supabase
      .from("music_tracks")
      .select("*")
      .eq("id", trackId)
      .maybeSingle();

    if (error || !data) return null;
    return toTrackItem(data);
  },
};

export { MUSIC_CATALOG };
