import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  ActivityIndicator,
  StatusBar,
  Modal,
  Alert,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "@/components/StyledLinearGradient";
import { useFocusEffect } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { storyService, Story, StoryRing } from "@/services/storyService";
import {
  getOverlayContainerStyle,
  getOverlayTextStyle,
} from "@/components/camera/DraggableTextOverlay";
import { CAMERA_FILTERS, FilterOverlay } from "@/components/camera/FilterPicker";
import { stopAllSounds, useTrackSound } from "@/lib/useTrackSound";
import { chatService } from "@/services/chatService";
import { shareService } from "@/services/shareService";
import Toast from "react-native-toast-message";
import { colors } from "@/constants/theme";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const STORY_DURATION = 5; // seconds per image story; videos use their own length.

function StoryVideo({ uri, paused, onEnd }: { uri: string; paused: boolean; onEnd: () => void }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  React.useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [paused, player]);
  React.useEffect(() => {
    const sub = player.addListener("playToEnd", () => {
      onEnd();
    });
    return () => sub.remove();
  }, [player, onEnd]);
  return (
    <VideoView
      player={player}
      style={{ width: "100%", height: "100%" }}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

/**
 * Auto-plays the sound attached to the story on screen.
 *
 * Mounted with key={story.id} so each story gets a fresh playback: when the
 * user advances, this component unmounts and expo-audio releases the player,
 * which is what stops the track (see the notes in lib/useTrackSound.ts about
 * never touching the player from cleanups). The one-at-a-time bus there also
 * keeps the story sound exclusive with any feed/post sound.
 */
function StorySound({
  storyId,
  audioUrl,
  paused,
}: {
  storyId: string;
  audioUrl: string;
  paused: boolean;
}) {
  const { isPlaying, toggle, stop } = useTrackSound({
    trackKey: storyId,
    audioUrl,
  });
  const autoStarted = useRef(false);

  useEffect(() => {
    if (paused) {
      stop();
      return;
    }
    // Auto-play on mount; resume when the user un-pauses the story.
    if (!autoStarted.current || !isPlaying) {
      autoStarted.current = true;
      toggle();
    }
    // toggle/stop/isPlaying are intentionally read from the latest render;
    // the effect only re-runs when the pause state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  return null;
}

export default function StoryViewer() {
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuth();
  const { colorScheme } = useTheme();
  const params = useLocalSearchParams<{ initialUserId?: string }>();

  const [rings, setRings] = useState<StoryRing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRingIdx, setActiveRingIdx] = useState(0);
  const [activeStoryIdx, setActiveStoryIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [viewerWidth, setViewerWidth] = useState(SCREEN_W);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;
  const progressAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Load stories
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await storyService.getActiveStoriesForFeed();
        setRings(data);
        if (params.initialUserId) {
          const idx = data.findIndex((r) => r.user_id === params.initialUserId);
          if (idx >= 0) setActiveRingIdx(idx);
        }
        setActiveStoryIdx(0);
      } catch (e) {
        console.error("Error loading stories:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.initialUserId]);

  const activeRing = rings[activeRingIdx];
  const activeStory: Story | undefined = activeRing?.stories?.[activeStoryIdx];

  // Mark story as viewed when active changes
  useEffect(() => {
    if (activeStory) {
      storyService.markStoryViewed(activeStory.id).catch(() => {});
    }
  }, [activeStory?.id]);

  // Advance / regress
  const advance = useCallback(() => {
    if (!activeRing) return;
    if (activeStoryIdx + 1 < activeRing.stories.length) {
      setActiveStoryIdx((i) => i + 1);
    } else if (activeRingIdx + 1 < rings.length) {
      setActiveRingIdx((i) => i + 1);
      setActiveStoryIdx(0);
    } else {
      router.back();
    }
  }, [activeRing, activeStoryIdx, activeRingIdx, rings.length]);

  const regress = useCallback(() => {
    if (activeStoryIdx > 0) {
      setActiveStoryIdx((i) => i - 1);
    } else if (activeRingIdx > 0) {
      setActiveRingIdx((i) => i - 1);
      setActiveStoryIdx(0);
    }
  }, [activeStoryIdx, activeRingIdx]);

  // Animate progress bar
  useEffect(() => {
    if (!activeStory || paused || loading) return;

    progress.setValue(0);
    progressAnimRef.current?.stop();
    const durationMs =
      activeStory.media_type === "video" ? (activeStory as any).duration_seconds
        ? ((activeStory as any).duration_seconds || STORY_DURATION) * 1000
        : 8000
        : STORY_DURATION * 1000;

    progressAnimRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: durationMs,
      useNativeDriver: false,
    });
    progressAnimRef.current.start(({ finished }) => {
      if (finished) advance();
    });

    return () => {
      progressAnimRef.current?.stop();
    };
  }, [activeStory?.id, paused, loading, advance, progress]);

  useFocusEffect(
    useCallback(() => {
      // The viewer is always dark content, so the bar goes light-content
      // while focused; restore the theme-appropriate style on exit.
      StatusBar.setBarStyle("light-content");
      return () =>
        StatusBar.setBarStyle(
          colorScheme === "dark" ? "light-content" : "dark-content"
        );
    }, [colorScheme]),
  );

  // Leaving the viewer silences any attached story sound (same pattern as
  // viewPost.tsx). The bus guarantees no stale track keeps playing.
  useEffect(() => {
    return () => stopAllSounds();
  }, []);

  const handlePress = (e: any) => {
    if (!activeRing) return;
    const x = e.nativeEvent?.locationX ?? SCREEN_W / 2;
    if (x < SCREEN_W * 0.35) {
      regress();
    } else if (x > SCREEN_W * 0.65) {
      advance();
    } else {
      // center tap toggles pause
      setPaused((p) => !p);
    }
  };

  const handleDeleteStory = async () => {
    if (!activeStory) return;
    setShowDeleteMenu(false);
    Alert.alert(
      "Delete Story?",
      "This story will be permanently removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await storyService.deleteStory(activeStory.id);
              Toast.show({ type: "success", text1: "Story deleted" });
              // Remove from local list
              setRings((prev) => {
                const next = prev.map((r) => {
                  if (r.user_id !== activeStory.user_id) return r;
                  const stories = r.stories.filter((s) => s.id !== activeStory.id);
                  return { ...r, stories };
                }).filter((r) => r.stories.length > 0);
                return next;
              });
              // Advance or close
              setTimeout(() => {
                if (activeStoryIdx + 1 < (activeRing?.stories.length ?? 0) - 0) {
                  // try to continue
                  setActiveStoryIdx((i) => Math.max(0, i - 1));
                } else if (rings.length - 1 > 0) {
                  advance();
                } else {
                  router.back();
                }
              }, 100);
            } catch (e: any) {
              Toast.show({
                type: "error",
                text1: "Could not delete",
                text2: e?.message ?? "Please try again.",
              });
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color="white" size="large" />
      </View>
    );
  }

  if (!activeRing || !activeStory) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <Text className="text-white">No stories to show.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6">
          <Text className="text-blue-400 font-bold">Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOwn = activeStory.user_id === authUser?.id;
  const activeFilterObj = CAMERA_FILTERS.find(
    (f) => f.id === activeStory.filter_id && f.rgb != null
  );

  // Reply → lands in the owner's DM (reuses/creates the direct conversation).
  const handleSendReply = async () => {
    const trimmed = replyText.trim();
    if (!trimmed || !activeRing || sendingReply || isOwn) return;
    setSendingReply(true);
    setPaused(true);
    try {
      const conversationId = await chatService.getOrCreateDirectConversation(
        activeRing.user_id,
      );
      await chatService.sendMessage(conversationId, trimmed);
      setReplyText("");
      Toast.show({
        type: "success",
        text1: "Reply sent",
        text2: `Delivered to @${activeRing.username} in messages.`,
        visibilityTime: 2000,
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Couldn't send reply",
        text2: error?.message || "Please try again.",
      });
    } finally {
      setSendingReply(false);
      setPaused(false);
    }
  };

  const handleShareStory = () => {
    if (!activeStory) return;
    setPaused(true);
    shareService
      .shareStory(activeStory, activeRing?.username)
      .finally(() => setPaused(false));
  };

  return (
    <View className="flex-1 bg-black" onLayout={(e) => setViewerWidth(e.nativeEvent.layout.width)}>
      {/* Media */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        onLongPress={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
        style={{ flex: 1 }}
      >
        {activeStory.media_type === "image" ? (
          <Image
            source={{ uri: activeStory.media_url }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <StoryVideo uri={activeStory.media_url} paused={paused} onEnd={advance} />
        )}

        {/* Filter picked in the camera studio (tint + vignette at the
            author's intensity). The uploaded media is unfiltered; the
            overlay renders at view time. */}
        <FilterOverlay
          filterId={activeFilterObj?.id}
          intensity={activeStory.filter_intensity ?? 1}
          style={StyleSheet.absoluteFill}
        />

        {/* Caption Overlay */}
        {!!activeStory.caption && (
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.7)"]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              paddingHorizontal: 20,
              // Keep the caption clear of the "Send message" reply bar
              // (which sits at bottom: insets.bottom + 18, h-11 ≈ 44px tall).
              paddingBottom: insets.bottom + 84,
              paddingTop: 60,
            }}
          >
            <Text
              style={{ color: activeStory.text_color || colors.white }}
              className="text-base font-semibold text-center"
            >
              {activeStory.caption}
            </Text>
          </LinearGradient>
        )}

        {/* Text overlays created in the camera studio. Rendered read-only
            with the same styling/positions the editor used. */}
        {!!(activeStory.text_overlays && activeStory.text_overlays.length > 0) && (
          <View
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
            className="items-center justify-center"
          >
            {(activeStory.text_overlays ?? []).map((item) => (
              <View
                key={item.id}
                style={{
                  position: "absolute",
                  alignSelf: "center",
                  transform: [
                    { translateX: item.x ?? 0 },
                    { translateY: item.y ?? 0 },
                  ],
                }}
              >
                <View style={getOverlayContainerStyle(item)}>
                  <Text style={getOverlayTextStyle(item)}>{item.text}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>

      {/* Attached sound — starts automatically, silences while paused. */}
      {activeStory.has_sound && activeStory.music_track_audio_url ? (
        <StorySound
          key={activeStory.id}
          storyId={activeStory.id}
          audioUrl={activeStory.music_track_audio_url}
          paused={paused}
        />
      ) : null}

      {/* Top HUD */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          paddingTop: Math.max(insets.top, 12),
          paddingHorizontal: 14,
        }}
      >
        {/* Progress Bars */}
        <View className="flex-row gap-1">
          {activeRing.stories.map((s, idx) => {
            const isActive = idx === activeStoryIdx;
            const isPast = idx < activeStoryIdx;
            return (
              <View
                key={s.id}
                className="flex-1 h-[3px] bg-white dark:bg-slate-900/30 rounded-full overflow-hidden"
              >
                {isPast ? (
                  <View className="flex-1 bg-white dark:bg-slate-900" />
                ) : isActive ? (
                  <Animated.View
                    style={{
                      height: "100%",
                      width: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", "100%"],
                      }),
                      backgroundColor: "white",
                    }}
                  />
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Header row */}
        <View className="flex-row items-center justify-between mt-3">
          <TouchableOpacity
            activeOpacity={0.8}
            className="flex-row items-center gap-2 flex-1"
            onPress={() => {
              setPaused(true);
              router.push({
                pathname: "/(pages)/userProfile",
                params: { userId: activeStory.user_id },
              });
            }}
          >
            <View className="w-9 h-9 rounded-full bg-white dark:bg-slate-900/20 overflow-hidden border border-white/40">
              {activeRing.avatar_url ? (
                <Image
                  source={{ uri: activeRing.avatar_url }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Ionicons name="person" size={18} color="white" />
                </View>
              )}
            </View>
            <Text className="text-white font-bold text-sm">
              {activeRing.username}
            </Text>
            <Text className="text-white/70 text-xs">
              {timeAgo(activeStory.created_at)}
            </Text>
          </TouchableOpacity>

          <View className="flex-row items-center gap-3">
            {isOwn && (
              <TouchableOpacity
                onPress={() => {
                  setPaused(true);
                  setShowDeleteMenu(true);
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Story options"
              >
                <Ionicons name="ellipsis-horizontal" size={26} color="white" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close story"
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Reply bar (hidden on your own stories) */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          position: "absolute",
          left: 14,
          right: 14,
          bottom: insets.bottom + 18,
        }}
      >
        <View className="flex-row items-center gap-3">
          {isOwn ? (
            <View className="flex-1" />
          ) : (
            <View className="flex-1 h-11 rounded-full border border-white/60 px-4 flex-row items-center">
              <TextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder={`Reply to @${activeRing?.username ?? "story"}...`}
                placeholderTextColor="rgba(255,255,255,0.6)"
                className="flex-1 text-white text-sm font-semibold"
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
                onSubmitEditing={handleSendReply}
                returnKeyType="send"
                editable={!sendingReply}
              />
              {sendingReply ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                replyText.trim().length > 0 && (
                  <TouchableOpacity
                    onPress={handleSendReply}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Send reply"
                  >
                    <Ionicons name="send" size={18} color="white" />
                  </TouchableOpacity>
                )
              )}
            </View>
          )}
          <TouchableOpacity
            hitSlop={10}
            onPress={() => Toast.show({ type: "success", text1: "Liked!" })}
            accessibilityRole="button"
            accessibilityLabel="Like story"
          >
            <Ionicons name="heart-outline" size={28} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            hitSlop={10}
            onPress={handleShareStory}
            accessibilityRole="button"
            accessibilityLabel="Share story"
          >
            <Ionicons name="paper-plane-outline" size={26} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Delete confirmation modal */}
      <Modal
        transparent
        visible={showDeleteMenu}
        animationType="fade"
        onRequestClose={() => setShowDeleteMenu(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowDeleteMenu(false)}
          className="flex-1 bg-black/50 items-center justify-center px-8"
        >
          <View className="w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
            <TouchableOpacity
              onPress={handleDeleteStory}
              className="py-4 items-center border-b border-slate-100 dark:border-slate-800"
            >
              <Text className="text-red-500 font-bold">Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowDeleteMenu(false)}
              className="py-4 items-center"
            >
              <Text className="text-slate-700 dark:text-slate-200 font-semibold">Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const d = Math.floor(hrs / 24);
  return `${d}d`;
}
