export type TextOverlayItem = {
  id: string;
  text: string;
  color: string;
  bgColor?: string;
};

export type MusicTrackItem = {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  audioUrl?: string;
  durationSeconds?: number;
  isTrending?: boolean;
};

export type PendingPostData = {
  mediaUri: string;
  mediaType: "image" | "video";
  filterId?: string;
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
