export type TextStyleMode = "classic" | "bold" | "neon" | "typewriter" | "italic";
export type TextBgMode = "solid" | "transparent" | "frosted" | "outline";
export type TextAlignMode = "left" | "center" | "right";

export type TextOverlayItem = {
  id: string;
  text: string;
  color: string;
  bgColor?: string;
  bgMode?: TextBgMode;
  fontStyle?: TextStyleMode;
  textAlign?: TextAlignMode;
  fontSize?: number;
  x?: number; // relative offset or absolute X
  y?: number; // relative offset or absolute Y
  scale?: number;
  rotation?: number;
};

export type MusicTrackItem = {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  audioUrl?: string;
  durationSeconds?: number;
  isTrending?: boolean;
  /**
   * Provenance, added with the self-hosted sound library.
   * `storagePath` is the object key inside the `sounds` bucket, which is how
   * `audioUrl` is rebuilt when the Supabase project ref changes.
   * `attribution` is the credit a CC-BY style licence obliges the app to show.
   */
  storagePath?: string;
  license?: string;
  licenseUrl?: string;
  attribution?: string;
  genre?: string;
  /** Post count, from `public.music_track_usage` -- not a stored column. */
  usageCount?: number;
};

export type PendingPostData = {
  mediaUri: string;
  mediaType: "image" | "video";
  filterId?: string;
  /** Filter strength chosen with the composer slider (0.2–1; 1 = full). */
  filterIntensity?: number;
  textOverlays?: TextOverlayItem[];
  musicTrack?: MusicTrackItem | null;
  durationSeconds?: number;
  hasSound?: boolean;
};

let pendingPostData: PendingPostData | null = null;

export const setPendingPostData = (data: PendingPostData) => {
  pendingPostData = data;
};

export const getPendingPostData = (): PendingPostData | null => pendingPostData;

export const clearPendingPostData = () => {
  pendingPostData = null;
};

// Backwards compatibility helpers
export const setPendingImageUri = (uri: string) => {
  pendingPostData = {
    mediaUri: uri,
    mediaType: "image",
  };
};

export const getPendingImageUri = () => pendingPostData?.mediaUri ?? null;

export const clearPendingImageUri = () => {
  pendingPostData = null;
};
