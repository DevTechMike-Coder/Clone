import { supabase } from "@/lib/supabase";
import { MusicTrackItem } from "@/store/pendingPost";
import { MUSIC_CATALOG } from "@/constants/musicCatalog";

/**
 * Reads the music catalog from Supabase when the `music_tracks` table
 * exists, otherwise falls back to the bundled catalog. This keeps the
 * app usable before the migration has been applied.
 */
export const musicService = {
  async getMusicTracks(): Promise<MusicTrackItem[]> {
    try {
      const { data, error } = await supabase
        .from("music_tracks")
        .select("*")
        .limit(100);

      if (error) throw error;

      if (data && data.length > 0) {
        return data.map((row: any) => ({
          id: String(row.id),
          title: row.title,
          artist: row.artist,
          coverUrl: row.cover_url || undefined,
          audioUrl: row.audio_url || undefined,
          durationSeconds: row.duration_seconds ?? undefined,
          isTrending: row.is_trending ?? false,
        }));
      }
    } catch (error) {
      // No migration / no table yet — bundled catalog is fine for now.
      console.warn("Music catalog table unavailable, using bundled tracks.", error);
    }

    return MUSIC_CATALOG;
  },

  async getTrendingTracks(): Promise<MusicTrackItem[]> {
    const tracks = await this.getMusicTracks();
    return tracks
      .filter((track) => track.isTrending !== false)
      .sort((a, b) => (a.isTrending === b.isTrending ? 0 : a.isTrending ? -1 : 1));
  },
};

export { MUSIC_CATALOG };
