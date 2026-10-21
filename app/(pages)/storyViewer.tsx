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
  StyleSheet,
  TextInput,
  Keyboard,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "@/components/StyledLinearGradient";
import { useFocusEffect } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useAuth } from "@/context/AuthContext";
import { storyService, Story, StoryRing } from "@/services/storyService";
import { chatService } from "@/services/chatService";
import {
  getOverlayContainerStyle,
  getOverlayTextStyle,
} from "@/components/camera/DraggableTextOverlay";
import { CAMERA_FILTERS } from "@/components/camera/FilterPicker";
import { stopAllSounds, useTrackSound } from "@/lib/useTrackSound";
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";
import { colors } from "@/constants/theme";
import { Dialog, PressableScale } from "@/components/ui";

const { width: SCREEN_W } = Dimensions.get("window");
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
    if (!autoStarted.current || !isPlaying) {
      autoStarted.current = true;
      toggle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  return null;
}

export default function StoryViewer() {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0, 16);
  const { user: authUser } = useAuth();
  const params = useLocalSearchParams<{ initialUserId?: string }>();

  const [rings, setRings] = useState<StoryRing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRingIdx, setActiveRingIdx] = useState(0);
  const [activeStoryIdx, setActiveStoryIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [, setViewerWidth] = useState(SCREEN_W);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [likedStories, setLikedStories] = useState<Record<string, boolean>>({});
  const [burstEmoji, setBurstEmoji] = useState<string | null>(null);
  const burstAnim = useRef(new Animated.Value(0)).current;

  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const replyInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    setReplyText("");
    Keyboard.dismiss();
  }, [activeStoryIdx, activeRingIdx]);

  const triggerBurst = (emoji: string = "❤️") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBurstEmoji(emoji);
    burstAnim.setValue(0);
    Animated.timing(burstAnim, {
      toValue: 1,
      duration: 850,
      useNativeDriver: true,
    }).start(() => {
      setBurstEmoji(null);
    });
  };

  const handleToggleLike = () => {
    if (!activeStory) return;
    const wasLiked = !!likedStories[activeStory.id];
    setLikedStories((prev) => ({ ...prev, [activeStory.id]: !wasLiked }));
    if (!wasLiked) {
      triggerBurst("❤️");
    } else {
      Haptics.selectionAsync();
    }
  };

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
  const isOwn = !!(activeStory && authUser && activeStory.user_id === authUser.id);

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
      activeStory.media_type === "video"
        ? (activeStory as any).duration_seconds
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
      StatusBar.setBarStyle("light-content");
      return () => StatusBar.setBarStyle("dark-content");
    }, []),
  );

  useEffect(() => {
    return () => stopAllSounds();
  }, []);

  const handlePress = (e: any) => {
    if (keyboardHeight > 0) {
      Keyboard.dismiss();
      setPaused(false);
      return;
    }
    if (!activeRing) return;
    const x = e.nativeEvent?.locationX ?? SCREEN_W / 2;
    if (x < SCREEN_W * 0.35) {
      regress();
    } else if (x > SCREEN_W * 0.65) {
      advance();
    } else {
      setPaused((p) => !p);
    }
  };

  const handleEmojiReaction = async (emoji: string) => {
    triggerBurst(emoji);
    if (!activeStory || !activeRing) return;
    if (isOwn) {
      Toast.show({
        type: "info",
        text1: `Reacted ${emoji}`,
      });
      return;
    }
    try {
      const conversationId = await chatService.getOrCreateDirectConversation(
        activeStory.user_id,
      );
      const mediaUrl =
        activeStory.media_type === "image" ? activeStory.media_url : undefined;
      await chatService.sendMessage(
        conversationId,
        `Reacted ${emoji} to your story`,
        mediaUrl,
      );
    } catch (err) {
      console.warn("Could not send reaction message:", err);
    }
  };

  const handleSendReply = async () => {
    const textToSend = replyText.trim();
    if (!activeStory || !activeRing || !textToSend || isSendingReply) return;

    if (isOwn) {
      // Testing on own story in development
      setReplyText("");
      Keyboard.dismiss();
      setPaused(false);
      Toast.show({
        type: "success",
        text1: "Reply sent (Test mode)",
        text2: `Sent to ${activeRing.username}`,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    try {
      setIsSendingReply(true);
      const conversationId = await chatService.getOrCreateDirectConversation(
        activeStory.user_id,
      );
      const mediaUrl =
        activeStory.media_type === "image" ? activeStory.media_url : undefined;
      await chatService.sendMessage(conversationId, textToSend, mediaUrl);
      setReplyText("");
      Keyboard.dismiss();
      setPaused(false);
      Toast.show({
        type: "success",
        text1: "Reply sent",
        text2: `Sent to ${activeRing.username}`,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error("Failed to send story reply:", err);
      Toast.show({
        type: "error",
        text1: "Could not send reply",
        text2: err?.message || "Please try again",
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!activeStory) return;
    setShowDeleteMenu(false);
    try {
      await storyService.deleteStory(activeStory.id);
      Toast.show({ type: "success", text1: "Story deleted" });
      setRings((prev) => {
        const next = prev
          .map((r) => {
            if (r.user_id !== activeStory.user_id) return r;
            const stories = r.stories.filter((s) => s.id !== activeStory.id);
            return { ...r, stories };
          })
          .filter((r) => r.stories.length > 0);
        return next;
      });
      setTimeout(() => {
        if (activeStoryIdx + 1 < (activeRing?.stories.length ?? 0)) {
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
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={colors.white} size="large" />
      </View>
    );
  }

  if (!activeRing || !activeStory) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="images-outline" size={54} color="rgba(255,255,255,0.4)" />
        <Text style={styles.emptyTitle}>No stories to show</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeCtaBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.closeCtaText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeFilterObj = CAMERA_FILTERS.find(
    (f) => f.id === activeStory.filter_id,
  );

  let renderedOverlays: any[] = [];
  if (activeStory?.text_overlays) {
    if (Array.isArray(activeStory.text_overlays)) {
      renderedOverlays = activeStory.text_overlays;
    } else if (typeof activeStory.text_overlays === "string") {
      try {
        const parsed = JSON.parse(activeStory.text_overlays);
        if (Array.isArray(parsed)) renderedOverlays = parsed;
      } catch {
        renderedOverlays = [];
      }
    }
  }

  return (
    <View
      style={styles.container}
      onLayout={(e) => setViewerWidth(e.nativeEvent.layout.width)}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Top Vignette Gradient for high contrast */}
      <LinearGradient
        colors={["rgba(0,0,0,0.85)", "rgba(0,0,0,0.45)", "transparent"]}
        style={[styles.topVignette, { height: topInset + 120 }]}
        pointerEvents="none"
      />

      {/* Media Viewport */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        onLongPress={() => setPaused(true)}
        onPressOut={() => setPaused(false)}
        style={StyleSheet.absoluteFill}
      >
        {activeStory.media_type === "image" ? (
          <Image
            source={{ uri: activeStory.media_url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <StoryVideo uri={activeStory.media_url} paused={paused} onEnd={advance} />
        )}

        {/* Applied filter tint */}
        {activeFilterObj?.overlayColor && (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: activeFilterObj.overlayColor },
            ]}
            pointerEvents="none"
          />
        )}

        {/* Attached sound */}
        {activeStory.has_sound && activeStory.music_track_audio_url ? (
          <StorySound
            key={activeStory.id}
            storyId={activeStory.id}
            audioUrl={activeStory.music_track_audio_url}
            paused={paused}
          />
        ) : null}

        {/* Text Overlays Layer */}
        {renderedOverlays.length > 0 && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                zIndex: 15,
                elevation: 15,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
            pointerEvents="none"
          >
            {renderedOverlays.map((item) => (
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

      {/* Top HUD (Progress Bars + Header) */}
      <View
        style={[
          styles.topHud,
          { paddingTop: topInset + 8 },
        ]}
      >
        {/* Progress Bars */}
        <View style={styles.progressRow}>
          {activeRing.stories.map((s, idx) => {
            const isActive = idx === activeStoryIdx;
            const isPast = idx < activeStoryIdx;
            return (
              <View key={s.id} style={styles.progressTrack}>
                {isPast ? (
                  <View style={styles.progressFill} />
                ) : isActive ? (
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                      },
                    ]}
                  />
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Header row: Author + Actions */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.userButton}
            onPress={() => {
              setPaused(true);
              router.push({
                pathname: "/(pages)/userProfile",
                params: { userId: activeStory.user_id },
              });
            }}
          >
            <View style={styles.avatarRing}>
              {activeRing.avatar_url ? (
                <Image
                  source={{ uri: activeRing.avatar_url }}
                  style={styles.avatarImg}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={18} color={colors.white} />
              )}
            </View>
            <View style={styles.userTextCol}>
              <Text style={styles.username} numberOfLines={1}>
                {activeRing.username}
              </Text>
              <Text style={styles.timeAgo}>
                {timeAgo(activeStory.created_at)}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerActions}>
            {isOwn && (
              <TouchableOpacity
                onPress={() => {
                  setPaused(true);
                  setShowDeleteMenu(true);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.iconCircleBtn}
                accessibilityRole="button"
                accessibilityLabel="Story options"
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.white} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.iconCircleBtn}
              accessibilityRole="button"
              accessibilityLabel="Close story"
            >
              <Ionicons name="close" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Floating Reaction Burst */}
      {burstEmoji && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: "35%",
            alignSelf: "center",
            opacity: burstAnim.interpolate({
              inputRange: [0, 0.7, 1],
              outputRange: [0, 1, 0],
            }),
            transform: [
              {
                translateY: burstAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, -120],
                }),
              },
              {
                scale: burstAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.6, 1.4, 1.2],
                }),
              },
            ],
            zIndex: 100,
          }}
        >
          {burstEmoji === "❤️" ? (
            <Ionicons name="heart" size={88} color={colors.red[500]} />
          ) : (
            <Text style={{ fontSize: 72 }}>{burstEmoji}</Text>
          )}
        </Animated.View>
      )}

      {/* Bottom Vignette Gradient */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.92)"]}
        style={styles.bottomVignette}
        pointerEvents="none"
      />

      {/* Quick reaction emojis tray */}
      <View
        style={[
          styles.reactionsRow,
          {
            bottom:
              keyboardHeight > 0
                ? keyboardHeight + 60
                : Math.max(insets.bottom, 16) + 58,
          },
        ]}
      >
        {["❤️", "🔥", "😂", "😮", "👏", "🎉"].map((emoji) => (
          <PressableScale
            key={emoji}
            onPress={() => handleEmojiReaction(emoji)}
            style={styles.reactionPill}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
          </PressableScale>
        ))}
      </View>

      {/* Bottom Reply Bar */}
      <View
        style={[
          styles.replyBar,
          {
            bottom:
              keyboardHeight > 0
                ? keyboardHeight + 8
                : Math.max(insets.bottom, 16) + 6,
          },
        ]}
      >
        <View style={styles.replyInputWrapper}>
          <TextInput
            ref={replyInputRef}
            style={styles.replyTextInput}
            placeholder={`Reply to ${activeRing.username}...`}
            placeholderTextColor="rgba(255, 255, 255, 0.65)"
            value={replyText}
            onChangeText={setReplyText}
            onFocus={() => setPaused(true)}
            onBlur={() => {
              if (!isSendingReply) setPaused(false);
            }}
            onSubmitEditing={handleSendReply}
            returnKeyType="send"
            multiline={false}
            maxLength={500}
          />
          {replyText.trim().length > 0 && (
            <TouchableOpacity
              onPress={handleSendReply}
              disabled={isSendingReply}
              style={styles.replyInlineSendBtn}
              accessibilityRole="button"
              accessibilityLabel="Send reply"
            >
              {isSendingReply ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Ionicons
                  name="arrow-up-circle"
                  size={32}
                  color={colors.blue[500]}
                />
              )}
            </TouchableOpacity>
          )}
        </View>

        {replyText.trim().length === 0 && (
          <>
            <PressableScale
              onPress={handleToggleLike}
              accessibilityRole="button"
              accessibilityLabel="Like story"
              style={styles.actionIconBtn}
            >
              <Ionicons
                name={
                  activeStory && likedStories[activeStory.id]
                    ? "heart"
                    : "heart-outline"
                }
                size={28}
                color={
                  activeStory && likedStories[activeStory.id]
                    ? colors.red[500]
                    : colors.white
                }
              />
            </PressableScale>

            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() =>
                Toast.show({ type: "info", text1: "Share sheet coming soon" })
              }
              accessibilityRole="button"
              accessibilityLabel="Share story"
              style={styles.actionIconBtn}
            >
              <Ionicons
                name="paper-plane-outline"
                size={24}
                color={colors.white}
              />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Delete confirmation dialog */}
      <Dialog
        visible={showDeleteMenu}
        onClose={() => setShowDeleteMenu(false)}
        title="Delete Story?"
        message="Are you sure you want to delete this story? This action cannot be undone."
        confirmText="Delete"
        destructive
        onConfirm={handleDeleteStory}
        cancelText="Cancel"
        onCancel={() => setShowDeleteMenu(false)}
      />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 20,
  },
  closeCtaBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  closeCtaText: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  topVignette: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 140,
    zIndex: 25,
  },
  topHud: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    zIndex: 30,
    elevation: 20,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    width: "100%",
    height: 3,
    marginBottom: 10,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.35)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.white,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  userButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatarRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.45)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: 38,
    height: 38,
  },
  userTextCol: {
    justifyContent: "center",
    flexShrink: 1,
  },
  username: {
    color: colors.white,
    fontWeight: "700",
    fontSize: 14,
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeAgo: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 12,
    fontWeight: "500",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottomVignette: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    zIndex: 25,
  },
  reactionsRow: {
    position: "absolute",
    left: 14,
    right: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 30,
  },
  reactionPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  reactionEmoji: {
    fontSize: 22,
  },
  replyBar: {
    position: "absolute",
    left: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 30,
  },
  replyInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",
    paddingLeft: 16,
    paddingRight: 6,
  },
  replyTextInput: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
    paddingVertical: 8,
    fontWeight: "500",
  },
  replyInlineSendBtn: {
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
