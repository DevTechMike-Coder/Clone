let pendingImageUri: string | null = null;

export const setPendingImageUri = (uri: string) => {
  pendingImageUri = uri;
};

export const getPendingImageUri = () => pendingImageUri;

export const clearPendingImageUri = () => {
  pendingImageUri = null;
};