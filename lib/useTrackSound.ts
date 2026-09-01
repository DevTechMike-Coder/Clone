import { useEffect, useMemo, useRef, useState } from "react";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

/**
 * One-at-a-time playback for the sound attached to a post.
 *
 * A bus rather than "every row plays its own audio": the feed keeps several
 * items mounted (FlatList windowing) and `viewPost.tsx` stays mounted behind it
 * in the router stack, so without coordination you get two tracks plus the
 * video's own audio playing at once. `claimSound` gives the newest caller sole
 * ownership and quietly stops the previous one.
 */
type SoundHandle = { key: string; stop: () => void };

let currentHandle: SoundHandle | null = null;

const claimSound = (handle: SoundHandle) => {
  if (currentHandle && currentHandle !== handle) {
    try {
      currentHandle.stop();
    } catch {
      // The previous owner may already have unmounted (and expo-audio released
      // its native player). Nothing to stop -- that is the desired outcome.
    }
  }
  currentHandle = handle;
};

const releaseSound = (handle: SoundHandle) => {
  if (currentHandle === handle) currentHandle = null;
};

/** Stop whatever is playing. Called when a screen blurs or the app hides. */
export const stopAllSounds = () => {
  const handle = currentHandle;
  currentHandle = null;
  try {
    handle?.stop();
  } catch {
    // Already released; releasing the player is itself what stops playback.
  }
};

/**
 * expo-audio releases the native player on unmount, from inside the hook, and
 * React runs that release *before* the component's own cleanup. Touching the
 * player from a cleanup therefore throws
 * "Cannot use shared object that was already released" -- the same trap the
 * comments in components/camera/MusicPickerModal.tsx and
 * components/IndexVideoFeed.tsx describe. So: nothing below ever pauses the
 * player from a cleanup; unmount only unregisters from the bus.
 */
const safePause = (player: { pause: () => void; seekTo: (s: number) => Promise<void> }) => {
  try {
    player.pause();
  } catch {
    return;
  }
  player.seekTo(0).catch(() => {});
};

/** A source that never reports loaded (404, dead bucket) must not spin forever. */
const LOAD_TIMEOUT_MS = 8000;

export type TrackSound = {
  canPlay: boolean;
  isPlaying: boolean;
  isBuffering: boolean;
  currentTime: number;
  toggle: () => void;
  stop: () => void;
};

/**
 * @param trackKey identity used by the bus, normally the post id (two posts can
 *   share a sound; they must not fight over it).
 * @param audioUrl the track's playable URL. Missing → `canPlay` false and the
 *   caller renders a static label instead of a dead button.
 */
export function useTrackSound({
  trackKey,
  audioUrl,
}: {
  trackKey?: string | null;
  audioUrl?: string | null;
}): TrackSound {
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [wantsPlayback, setWantsPlayback] = useState(false);
  const audioModeConfigured = useRef(false);
  const key = trackKey ?? audioUrl ?? "";

  /**
   * Derived, not stored. `wantsPlayback` is the user's intent and the native
   * status is the ground truth, so a track that ends or fails on its own falls
   * out of "playing" on the next status frame without an effect having to
   * setState in reaction to it (which is both a cascading render and a race
   * against the frame `play()` has not produced yet).
   */
  const isLoaded = Boolean(status.isLoaded);
  const isPlaying = wantsPlayback && (!isLoaded || status.playing === true);

  const handle = useMemo<SoundHandle>(
    () => ({
      key,
      stop: () => {
        safePause(player);
        setWantsPlayback(false);
      },
    }),
    [key, player],
  );

  /**
   * Plain functions on purpose, matching the existing expo-audio call sites in
   * this repo (MusicPickerModal's `togglePreview`). Wrapping the mutation in
   * `useCallback` trips react-hooks/immutability -- "a function which may
   * mutate `player` after render" -- because the memoised closure outlives the
   * render that created it, while the native player object does not change.
   */
  const stop = () => {
    safePause(player);
    setWantsPlayback(false);
    releaseSound(handle);
  };

  // Stop if the screen this belongs to unmounts. Bus bookkeeping only — see the
  // note above about why this must not touch `player`.
  useEffect(() => () => releaseSound(handle), [handle]);

  const toggle = () => {
    if (!audioUrl) return;

    if (isPlaying) {
      stop();
      return;
    }

    void (async () => {
      try {
        if (!audioModeConfigured.current) {
          audioModeConfigured.current = true;
          // mixWithOthers is the load-bearing part: taking exclusive audio
          // focus on Android suspends the expo-video player underneath, so the
          // video would freeze the moment a sound started.
          await setAudioModeAsync({
            playsInSilentMode: true,
            interruptionMode: "mixWithOthers",
          });
        }

        claimSound(handle);
        // eslint-disable-next-line react-hooks/immutability -- expo-audio requires mutating the player object the hook returns
        player.replace(audioUrl);
        // Only the replace() call needs the directive above; plain property
        // writes on the same object are not flagged.
        player.loop = true;
        player.volume = 1;
        player.play();
        setWantsPlayback(true);
      } catch (error) {
        console.warn(`[useTrackSound] playback failed for ${audioUrl}:`, error);
        setWantsPlayback(false);
        releaseSound(handle);
      }
    })();
  };

  // A stream that never loads (deleted object, wrong bucket policy, offline)
  // leaves `isLoaded` false forever, which would otherwise pin the chip in
  // "playing". The reset happens inside the timer, not in the effect body.
  useEffect(() => {
    if (!wantsPlayback || isLoaded) return;

    const timer = setTimeout(() => {
      console.warn(`[useTrackSound] source never loaded: ${audioUrl}`);
      setWantsPlayback(false);
      releaseSound(handle);
    }, LOAD_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [audioUrl, handle, isLoaded, wantsPlayback]);

  return {
    canPlay: Boolean(audioUrl),
    isPlaying,
    isBuffering: wantsPlayback && !isLoaded,
    currentTime: status.currentTime ?? 0,
    toggle,
    stop,
  };
}
