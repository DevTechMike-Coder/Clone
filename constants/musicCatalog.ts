import { MusicTrackItem } from "@/store/pendingPost";

// These are publicly streamable demo tracks from SoundHelix.
// Swap `audioUrl` for licensed tracks or Supabase Storage audio URLs when
// you connect a real music catalog. `id` values are intentionally stable
// short strings so they can also be used as the `music_track_id` in posts.
export const MUSIC_CATALOG: MusicTrackItem[] = [
  {
    id: "1",
    title: "Golden Glow (Original Mix)",
    artist: "Aurora Beats",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    durationSeconds: 372,
    isTrending: true,
    coverUrl: "https://picsum.photos/seed/golden-glow/200/200",
  },
  {
    id: "2",
    title: "Midnight City Lights",
    artist: "SynthWave Collective",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    durationSeconds: 424,
    isTrending: true,
    coverUrl: "https://picsum.photos/seed/midnight-city/200/200",
  },
  {
    id: "3",
    title: "Summer Breeze",
    artist: "Tropical Vibes",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    durationSeconds: 358,
    isTrending: true,
    coverUrl: "https://picsum.photos/seed/summer-breeze/200/200",
  },
  {
    id: "4",
    title: "Future Funk Deluxe",
    artist: "Kairo & Friends",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    durationSeconds: 401,
    isTrending: true,
    coverUrl: "https://picsum.photos/seed/future-funk/200/200",
  },
  {
    id: "5",
    title: "Acoustic Sunrise",
    artist: "Luna Woods",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
    durationSeconds: 336,
    isTrending: false,
    coverUrl: "https://picsum.photos/seed/acoustic-sunrise/200/200",
  },
  {
    id: "6",
    title: "Cyber Odyssey",
    artist: "Neon Pulse",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
    durationSeconds: 383,
    isTrending: false,
    coverUrl: "https://picsum.photos/seed/cyber-odyssey/200/200",
  },
  {
    id: "7",
    title: "Lo-Fi Coffee Moments",
    artist: "ChillHop Dreamer",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
    durationSeconds: 354,
    isTrending: false,
    coverUrl: "https://picsum.photos/seed/lofi-coffee/200/200",
  },
  {
    id: "8",
    title: "Drift Away",
    artist: "The Skyline",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
    durationSeconds: 411,
    isTrending: false,
    coverUrl: "https://picsum.photos/seed/drift-away/200/200",
  },
];
