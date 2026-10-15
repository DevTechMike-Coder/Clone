import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Post } from "@/services/postService";
import SoundChip from "@/components/SoundChip";
import { useTheme } from "@/context/ThemeContext";
import { Text } from "@/components/ui/Text";

function FeedVideoMedia({ uri, active }: { uri: string; active: boolean }) {
  const [muted, setMuted] = useState(true);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    if (active) {
      player.play();
    } else {
      player.pause();
    }
  }, [active, player]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- false positive for native player mutations
    player.muted = muted;
  }, [muted, player]);

  return (
    <View style={styles.fullSizeRelative}>
      <VideoView
        player={player}
        style={styles.fullSize}
        contentFit="cover"
        nativeControls={false}
      />
      {active && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setMuted((m) => !m)}
          accessibilityRole="button"
          accessibilityLabel={muted ? "Unmute video" : "Mute video"}
          style={styles.muteButton}
        >
          <Ionicons
            name={muted ? "volume-mute" : "volume-high"}
            size={18}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

export interface PostMediaProps {
  post: Post;
  isActiveVideo: boolean;
  isActiveSound: boolean;
  onDoubleTapLike?: (postId: string) => void;
}

export const PostMedia: React.FC<PostMediaProps> = ({
  post,
  isActiveVideo,
  isActiveSound,
  onDoubleTapLike,
}) => {
  const { palette } = useTheme();
  const [hasError, setHasError] = useState(false);
  const lastTapRef = useRef<number>(0);

  // Reanimated Double Tap Pop Animation
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Trigger like
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onDoubleTapLike?.(post.id);

      if (!reducedMotion) {
        heartOpacity.value = 1;
        heartScale.value = withSequence(
          withSpring(1.2, { damping: 10, stiffness: 200 }),
          withTiming(1, { duration: 150 }),
          withTiming(0, { duration: 250 }, () => {
            heartOpacity.value = 0;
          })
        );
      }
    }
    lastTapRef.current = now;
  }, [post.id, onDoubleTapLike, reducedMotion, heartOpacity, heartScale]);

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    opacity: heartOpacity.value,
    transform: [{ scale: heartScale.value }],
  }));

  let mediaContent: React.ReactNode = null;

  if (hasError || !post.media_url) {
    mediaContent = (
      <View style={[styles.errorContainer, { backgroundColor: palette.surfaceMuted }]}>
        <Ionicons name="image-outline" size={44} color={palette.muted} />
        <Text variant="caption" color="muted" style={{ marginTop: 8 }}>
          Media unavailable
        </Text>
      </View>
    );
  } else if (post.media_type === "video") {
    if (!isActiveVideo) {
      mediaContent = (
        <View style={[styles.fullSizeCenter, { backgroundColor: palette.surfaceMuted }]}>
          {post.thumbnail_url ? (
            <Image
              source={{ uri: post.thumbnail_url }}
              style={styles.fullSize}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <Ionicons name="play-circle-outline" size={48} color="rgba(255,255,255,0.7)" />
          )}
        </View>
      );
    } else {
      mediaContent = <FeedVideoMedia uri={post.media_url} active={isActiveVideo} />;
    }
  } else {
    mediaContent = (
      <Image
        source={{ uri: post.media_url }}
        style={styles.fullSize}
        contentFit="cover"
        transition={200}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <TouchableWithoutFeedback onPress={handleDoubleTap}>
      <View
        style={[
          styles.mediaContainer,
          { backgroundColor: palette.surfaceMuted },
        ]}
      >
        {mediaContent}

        {/* Double-tap Like Heart Popup */}
        <Animated.View style={[styles.doubleTapHeart, heartAnimatedStyle]} pointerEvents="none">
          <Ionicons name="heart" size={80} color="#EF4444" />
        </Animated.View>

        {/* Sound Chip Overlay */}
        {(post.has_sound || post.music_track_title || post.music_track_audio_url) && (
          <View style={styles.soundChip}>
            <SoundChip
              variant="overlay"
              trackKey={post.id}
              title={post.music_track_title}
              artist={post.music_track_artist}
              audioUrl={post.music_track_audio_url}
              attribution={post.music_track_attribution}
              active={isActiveSound}
            />
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  mediaContainer: {
    width: "100%",
    aspectRatio: 1,
    position: "relative",
    overflow: "hidden",
  },
  fullSize: {
    width: "100%",
    height: "100%",
  },
  fullSizeRelative: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  fullSizeCenter: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  muteButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  doubleTapHeart: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -40,
    marginLeft: -40,
    justifyContent: "center",
    alignItems: "center",
  },
  soundChip: {
    position: "absolute",
    left: 12,
    bottom: 12,
    maxWidth: "85%",
  },
});
