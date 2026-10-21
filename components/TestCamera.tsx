import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import type { CameraType, FlashMode } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  MusicTrackItem,
  setPendingPostData,
  TextOverlayItem,
} from "@/store/pendingPost";
import FilterPicker, { CAMERA_FILTERS } from "./camera/FilterPicker";
import TextOverlayModal from "./camera/TextOverlayModal";
import MusicPickerModal from "./camera/MusicPickerModal";
import DraggableTextOverlay from "./camera/DraggableTextOverlay";
import { colors } from "@/constants/theme";
import { Dialog } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { storyService } from "@/services/storyService";
import Toast from "react-native-toast-message";

export type CaptureMode = "Photo" | "Video" | "Story";

type TestCameraProps = {
  flash?: FlashMode;
  onFlashCycle?: () => void;
  onClose?: () => void;
  onPreviewChange?: (isPreviewing: boolean) => void;
  /** Which capture mode the camera opens in (defaults to "Photo"). */
  initialMode?: CaptureMode;
};

const MODES: CaptureMode[] = ["Photo", "Video", "Story"];
const ZOOM_PRESETS = [
  { label: "1x", zoom: 0 },
  { label: "2x", zoom: 0.25 },
  { label: "3x", zoom: 0.5 },
];
const TIMER_OPTIONS = [0, 3, 10];
const QUICK_STICKERS = ["🔥", "❤️", "✨", "🚀", "💯", "⚡", "🎉", "🌴", "🎧", "👏", "👑", "🍕"];

const FLASH_CYCLE: FlashMode[] = ["off", "on", "auto"];
const FLASH_ICON: Partial<Record<FlashMode, keyof typeof Ionicons.glyphMap>> = {
  off: "flash-off-outline",
  on: "flash",
  auto: "flash-outline",
  screen: "flash-outline",
};

const SHUTTER_OUTER = 82;
const SHUTTER_INNER = 66;

const generateUniqueId = () => Date.now().toString();

export default function TestCamera({
  flash: externalFlash,
  onFlashCycle,
  onClose,
  onPreviewChange,
  initialMode = "Photo",
}: TestCameraProps) {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0, 16);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { user } = useAuth();

  // Permissions
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  // Camera Settings
  const [internalFlash, setInternalFlash] = useState<FlashMode>("off");
  const flash = externalFlash ?? internalFlash;

  const cycleFlash = () => {
    Haptics.selectionAsync();
    if (onFlashCycle) {
      onFlashCycle();
    } else {
      setInternalFlash((f) => FLASH_CYCLE[(FLASH_CYCLE.indexOf(f) + 1) % 3]);
    }
  };

  const [facing, setFacing] = useState<CameraType>("back");
  const [activeMode, setActiveMode] = useState<CaptureMode>(initialMode);
  const [zoomIndex, setZoomIndex] = useState<number>(0);
  const currentZoom = ZOOM_PRESETS[zoomIndex];
  const [countdownTimer, setCountdownTimer] = useState<number>(0);
  const [activeCountdown, setActiveCountdown] = useState<number | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordIntervalRef = useRef<any>(null);
  const [pulseAnim] = useState(() => new Animated.Value(1));

  // Creative Tools State
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [textOverlays, setTextOverlays] = useState<TextOverlayItem[]>([]);
  const [showTextModal, setShowTextModal] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrackItem | null>(null);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [showStickerTray, setShowStickerTray] = useState(false);

  // Interactive Overlay State
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [editingOverlay, setEditingOverlay] = useState<TextOverlayItem | null>(null);
  const [isDraggingOverlay, setIsDraggingOverlay] = useState(false);
  const [isOverTrash, setIsOverTrash] = useState(false);

  // Captured Output State
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [capturedType, setCapturedType] = useState<"image" | "video">("image");
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const cameraRef = useRef<CameraView>(null);

  // Request Permissions on mount
  useEffect(() => {
    if (camPermission && !camPermission.granted && camPermission.canAskAgain) {
      requestCamPermission();
    }
    if (micPermission && !micPermission.granted && micPermission.canAskAgain) {
      requestMicPermission();
    }
  }, [camPermission, micPermission]);

  useEffect(() => {
    onPreviewChange?.(!!capturedUri);
  }, [capturedUri, onPreviewChange]);

  // Pulse animation for recording badge
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Photo Capture
  const takePhoto = async () => {
    if (isRecording) return;

    if (countdownTimer > 0) {
      runCountdown(async () => {
        await executeTakePhoto();
      });
    } else {
      await executeTakePhoto();
    }
  };

  const executeTakePhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (!cameraRef.current) {
        Toast.show({
          type: "info",
          text1: "Camera Initializing",
          text2: "Camera sensor is still warming up...",
        });
        return;
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
        exif: false,
        skipProcessing: false,
      });

      if (photo?.uri) {
        setCapturedUri(photo.uri);
        setCapturedType("image");
      }
    } catch (err: any) {
      console.error("Take photo error:", err);
      Toast.show({
        type: "error",
        text1: "Photo Capture Failed",
        text2: err?.message || "Camera sensor error. Try picking from gallery.",
      });
    }
  };

  // Video Recording
  const startRecording = async () => {
    if (isRecording) return;
    if (!cameraRef.current) {
      Toast.show({
        type: "info",
        text1: "Camera Initializing",
        text2: "Please wait for the video sensor to initialize",
      });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsRecording(true);
    setRecordSeconds(0);

    recordIntervalRef.current = setInterval(() => {
      setRecordSeconds((s) => {
        if (s >= 60) {
          stopRecording();
          return 60;
        }
        return s + 1;
      });
    }, 1000);

    try {
      const videoPromise = cameraRef.current?.recordAsync({
        maxDuration: 60,
      });

      const video = await videoPromise;
      if (video?.uri) {
        setCapturedUri(video.uri);
        setCapturedType("video");
      }
    } catch (err: any) {
      console.error("Recording error:", err);
      Toast.show({
        type: "error",
        text1: "Recording Failed",
        text2: err?.message || "Could not record video. Mode requires camera permissions.",
      });
    } finally {
      clearInterval(recordIntervalRef.current);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearInterval(recordIntervalRef.current);
    setIsRecording(false);
    try {
      await cameraRef.current?.stopRecording();
    } catch (err) {
      console.error("Stop recording error:", err);
    }
  };

  const runCountdown = (callback: () => void) => {
    let count = countdownTimer;
    setActiveCountdown(count);

    const timer = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(timer);
        setActiveCountdown(null);
        callback();
      } else {
        setActiveCountdown(count);
      }
    }, 1000);
  };

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setCapturedUri(result.assets[0].uri);
      setCapturedType(result.assets[0].type === "video" ? "video" : "image");
    }
  };

  const publishStory = async () => {
    if (!user) {
      Toast.show({ type: "error", text1: "You must be signed in." });
      return;
    }
    if (!capturedUri) return;

    setPublishing(true);
    try {
      await storyService.createStory({
        userId: user.id,
        mediaUri: capturedUri,
        mediaType: capturedType,
        backgroundColor: colors.black,
        // Keep any text the user added in the studio — otherwise the
        // story plays back without it.
        textOverlays,
        // Same for the picked filter and attached sound: without these the
        // story plays back plain and silent.
        filterId: selectedFilter !== "none" ? selectedFilter : undefined,
        musicTrack: selectedTrack,
      });
      Toast.show({ type: "success", text1: "Story added!" });

      // Reset the capture and leave the camera so the story shows up in the feed.
      setCapturedUri(null);
      setCapturedType("image");
      setTextOverlays([]);
      if (onClose) {
        onClose();
      } else {
        router.back();
      }
    } catch (e: any) {
      console.error("Error publishing story:", e);
      Toast.show({
        type: "error",
        text1: "Couldn't add story",
        text2: e?.message ?? "Please try again.",
      });
    } finally {
      setPublishing(false);
    }
  };

  const handleContinue = () => {
    if (!capturedUri) return;

    // In Story mode the capture becomes a story, not a post.
    if (activeMode === "Story") {
      publishStory();
      return;
    }

    setPendingPostData({
      mediaUri: capturedUri,
      mediaType: capturedType,
      filterId: selectedFilter !== "none" ? selectedFilter : undefined,
      textOverlays,
      musicTrack: selectedTrack,
      durationSeconds: selectedTrack?.durationSeconds,
      hasSound: Boolean(selectedTrack),
    });

    router.push({ pathname: "/postDetails" });
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // --- Staggered placement helper to prevent stacking ---
  const getNextStaggerPosition = () => {
    const count = textOverlays.length;
    if (count === 0) return { x: 0, y: 0 };
    const yOffset = ((count % 4) - 1.5) * 45;
    const xOffset = ((count % 2) === 1 ? 1 : -1) * 15;
    return { x: xOffset, y: yOffset };
  };

  const handleSaveTextOverlay = (item: TextOverlayItem) => {
    if (editingOverlay) {
      setTextOverlays((prev) =>
        prev.map((o) => (o.id === item.id ? { ...o, ...item } : o))
      );
      setEditingOverlay(null);
    } else {
      const pos = getNextStaggerPosition();
      const newItem: TextOverlayItem = {
        ...item,
        x: item.x !== undefined ? item.x : pos.x,
        y: item.y !== undefined ? item.y : pos.y,
      };
      setTextOverlays((prev) => [...prev, newItem]);
      setSelectedOverlayId(newItem.id);
    }
  };

  const handleAddSticker = (emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const pos = getNextStaggerPosition();
    const newSticker: TextOverlayItem = {
      id: generateUniqueId(),
      text: emoji,
      color: colors.white,
      fontSize: 40,
      fontStyle: "classic",
      bgMode: "transparent",
      x: pos.x,
      y: pos.y,
    };
    setTextOverlays((prev) => [...prev, newSticker]);
    setSelectedOverlayId(newSticker.id);
    setShowStickerTray(false);
  };

  const handleOverlayPositionChange = (id: string, x: number, y: number) => {
    setTextOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, x, y } : o))
    );
  };

  const handleDeleteOverlay = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTextOverlays((prev) => prev.filter((o) => o.id !== id));
    if (selectedOverlayId === id) {
      setSelectedOverlayId(null);
    }
  };

  const handleEditOverlay = (item: TextOverlayItem) => {
    setEditingOverlay(item);
    setShowTextModal(true);
  };

  const handleDragStart = () => {
    setIsDraggingOverlay(true);
    setIsOverTrash(false);
  };

  const handleDragMove = (moveY: number) => {
    const trashThreshold = screenHeight - (insets.bottom + 130);
    const over = moveY > trashThreshold;
    if (over !== isOverTrash) {
      if (over) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      setIsOverTrash(over);
    }
  };

  const handleDragEnd = (draggedId: string, overTrash: boolean) => {
    setIsDraggingOverlay(false);
    if (overTrash || isOverTrash) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleDeleteOverlay(draggedId);
    }
    setIsOverTrash(false);
  };

  const activeFilterObj = CAMERA_FILTERS.find((f) => f.id === selectedFilter);

  // -------------------------------------------------------------
  // STUDIO PREVIEW SCREEN (AFTER CAPTURE)
  // -------------------------------------------------------------
  if (capturedUri) {
    return (
      <View style={styles.container}>
        {/* Backdrop Media Preview */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setSelectedOverlayId(null)}
        >
          <Image
            source={{ uri: capturedUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />

          {/* Applied Filter Tint Overlay */}
          {activeFilterObj?.overlayColor && (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: activeFilterObj.overlayColor },
              ]}
              pointerEvents="none"
            />
          )}
        </Pressable>

        {/* Text / Sticker Overlays Layer */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              zIndex: 25,
              elevation: 25,
              alignItems: "center",
              justifyContent: "center",
            },
          ]}
          pointerEvents="box-none"
        >
          {textOverlays.map((item) => (
            <DraggableTextOverlay
              key={item.id}
              item={item}
              isSelected={selectedOverlayId === item.id}
              containerWidth={screenWidth}
              containerHeight={screenHeight}
              isOverTrash={isOverTrash}
              onSelect={() => setSelectedOverlayId(item.id)}
              onEdit={handleEditOverlay}
              onDelete={handleDeleteOverlay}
              onPositionChange={handleOverlayPositionChange}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={(overTrash) => handleDragEnd(item.id, overTrash)}
            />
          ))}
        </View>

        {/* Top Studio Action Bar (Clean Non-Overlapping Layout) */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            paddingTop: topInset + 8,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 20,
          }}
        >
          {/* Left: Close / Discard */}
          <TouchableOpacity
            onPress={() => setShowDiscardModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={styles.studioIconButton}
            activeOpacity={0.75}
          >
            <Ionicons name="close" size={22} color={colors.white} />
          </TouchableOpacity>

          {/* Center: Music Sound Pill */}
          <TouchableOpacity
            onPress={() => setShowMusicModal(true)}
            activeOpacity={0.8}
            style={[
              styles.studioSoundPill,
              selectedTrack ? styles.studioSoundPillActive : null,
              { maxWidth: screenWidth * 0.44 },
            ]}
          >
            <Ionicons
              name="musical-notes"
              size={14}
              color={selectedTrack ? colors.sky[400] : colors.white}
            />
            <Text
              style={styles.studioSoundPillText}
              numberOfLines={1}
            >
              {selectedTrack ? selectedTrack.title : "Add Sound"}
            </Text>
            {selectedTrack && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedTrack(null);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Remove sound"
              >
                <Ionicons
                  name="close-circle"
                  size={14}
                  color="rgba(255,255,255,0.7)"
                />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Right: Studio Creative Tools */}
          <View style={styles.studioToolsGroup}>
            {/* Add Text */}
            <TouchableOpacity
              onPress={() => {
                setEditingOverlay(null);
                setShowTextModal(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Add text"
              style={styles.studioIconButton}
              activeOpacity={0.75}
            >
              <Text style={styles.studioToolAaText}>Aa</Text>
            </TouchableOpacity>

            {/* Filters */}
            <TouchableOpacity
              onPress={() => setShowFilterPicker((p) => !p)}
              accessibilityRole="button"
              accessibilityLabel="Filters"
              style={[
                styles.studioIconButton,
                showFilterPicker ? styles.studioIconButtonActive : null,
              ]}
              activeOpacity={0.75}
            >
              <Ionicons name="color-filter-outline" size={18} color={colors.white} />
            </TouchableOpacity>

            {/* Stickers */}
            <TouchableOpacity
              onPress={() => setShowStickerTray((p) => !p)}
              accessibilityRole="button"
              accessibilityLabel="Stickers"
              style={[
                styles.studioIconButton,
                showStickerTray ? styles.studioIconButtonActive : null,
              ]}
              activeOpacity={0.75}
            >
              <Ionicons name="happy-outline" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sticker Tray Drawer */}
        {showStickerTray && (
          <View
            style={{
              position: "absolute",
              top: topInset + 62,
              left: 16,
              right: 16,
              zIndex: 30,
              backgroundColor: "rgba(0, 0, 0, 0.88)",
              paddingVertical: 12,
              paddingHorizontal: 12,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.15)",
              shadowColor: colors.black,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.5,
              shadowRadius: 10,
              elevation: 10,
            }}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, alignItems: "center" }}
            >
              {QUICK_STICKERS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  activeOpacity={0.7}
                  onPress={() => handleAddSticker(emoji)}
                  className="w-12 h-12 rounded-xl bg-white/10 items-center justify-center border border-white/15 active:opacity-80"
                >
                  <Text className="text-2xl">{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Drag-to-Delete Trash Target (TikTok/Reels Style) */}
        {isDraggingOverlay && (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: insets.bottom + 18,
              alignItems: "center",
              zIndex: 40,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: isOverTrash
                  ? "rgba(239, 68, 68, 0.95)"
                  : "rgba(15, 23, 42, 0.85)",
                paddingHorizontal: 22,
                paddingVertical: 12,
                borderRadius: 30,
                borderWidth: 1.5,
                borderColor: isOverTrash
                  ? colors.red[300]
                  : "rgba(255, 255, 255, 0.25)",
                transform: [{ scale: isOverTrash ? 1.1 : 1 }],
                shadowColor: isOverTrash ? colors.red[500] : colors.black,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.6,
                shadowRadius: 10,
                elevation: 10,
              }}
            >
              <Ionicons
                name={isOverTrash ? "trash" : "trash-outline"}
                size={20}
                color="white"
              />
              <Text style={{ color: "white", fontWeight: "700", fontSize: 13 }}>
                {isOverTrash ? "Release to delete" : "Drag here to delete"}
              </Text>
            </View>
          </View>
        )}

        {/* Bottom Navigation Buttons (Hidden while dragging) */}
        {!isDraggingOverlay && (
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.65)", "rgba(0,0,0,0.96)"]}
            style={[
              styles.studioBottomBar,
              { paddingBottom: Math.max(insets.bottom, 16) + 14 },
            ]}
          >
            {/* Filter Carousel in Studio if open */}
            {showFilterPicker && (
              <View className="mb-4 py-2 bg-black/60 rounded-2xl border border-white/10">
                <FilterPicker
                  selectedFilter={selectedFilter}
                  onSelectFilter={setSelectedFilter}
                />
              </View>
            )}

            <View style={styles.studioActionsRow}>
              <TouchableOpacity
                onPress={() => setShowDiscardModal(true)}
                style={styles.studioDiscardBtn}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Discard capture"
              >
                <Ionicons name="trash-outline" size={18} color={colors.white} />
                <Text style={styles.studioDiscardText}>Discard</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleContinue}
                disabled={publishing}
                style={[
                  styles.studioNextBtn,
                  publishing ? { opacity: 0.7 } : null,
                ]}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={activeMode === "Story" ? "Add to story" : "Next step"}
              >
                {publishing ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <>
                    <Text style={styles.studioNextText}>
                      {activeMode === "Story" ? "Add to story" : "Next"}
                    </Text>
                    <Ionicons
                      name={activeMode === "Story" ? "sparkles" : "arrow-forward"}
                      size={18}
                      color={colors.white}
                    />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        )}

        {/* Discard Confirmation Dialog */}
        <Dialog
          visible={showDiscardModal}
          onClose={() => setShowDiscardModal(false)}
          title="Discard Capture?"
          message="If you go back, you will lose this photo/video and all edits."
          confirmText="Discard"
          destructive
          onConfirm={() => {
            setShowDiscardModal(false);
            setCapturedUri(null);
            setTextOverlays([]);
          }}
          cancelText="Keep Editing"
          onCancel={() => setShowDiscardModal(false)}
        />

        {/* Overlays & Modals */}
        <TextOverlayModal
          visible={showTextModal}
          initialItem={editingOverlay}
          onClose={() => {
            setShowTextModal(false);
            setEditingOverlay(null);
          }}
          onSaveText={handleSaveTextOverlay}
        />

        <MusicPickerModal
          visible={showMusicModal}
          selectedTrack={selectedTrack}
          onClose={() => setShowMusicModal(false)}
          onSelectTrack={setSelectedTrack}
        />
      </View>
    );
  }

  // -------------------------------------------------------------
  // PERMISSIONS SCREEN
  // -------------------------------------------------------------
  if (!camPermission) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (!camPermission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-8">
        <Ionicons name="camera-outline" size={54} color="white" />
        <Text className="text-white text-lg font-bold mt-4">
          Camera Access Required
        </Text>
        <Text className="text-white/50 text-center text-xs mt-2 mb-6">
          Grant camera and microphone permissions to capture photos and videos.
        </Text>
        <TouchableOpacity
          onPress={() => {
            requestCamPermission();
            requestMicPermission();
          }}
          className="bg-blue-600 px-8 py-3 rounded-full"
        >
          <Text className="text-white font-bold">Grant Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // -------------------------------------------------------------
  // LIVE CAMERA VIEW
  // -------------------------------------------------------------
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        zoom={currentZoom.zoom}
        mode={activeMode === "Video" ? "video" : "picture"}
        onCameraReady={() => {
          setIsCameraReady(true);
          setMountError(null);
        }}
        onMountError={({ message }) => setMountError(message)}
      />

      {/* Camera Sensor Fallback (e.g. Emulator / Hardware Busy) */}
      {mountError && (
        <View
          style={StyleSheet.absoluteFill}
          className="items-center justify-center bg-black/85 px-8 z-30"
        >
          <Ionicons name="videocam-off-outline" size={54} color={colors.white} />
          <Text className="text-white text-lg font-bold mt-4 text-center">
            Camera Sensor Unavailable
          </Text>
          <Text className="text-white/60 text-xs text-center mt-2 mb-6">
            {mountError.toLowerCase().includes("simulator") ||
            mountError.toLowerCase().includes("emulator") ||
            mountError.toLowerCase().includes("hardware")
              ? "Virtual devices have no camera sensor. You can import from your photo gallery to test all editing and post tools."
              : mountError}
          </Text>
          <TouchableOpacity
            onPress={pickMedia}
            activeOpacity={0.8}
            className="bg-blue-600 px-6 py-3 rounded-full flex-row items-center gap-2"
          >
            <Ionicons name="images-outline" size={18} color="white" />
            <Text className="text-white font-bold text-sm">Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Applied Filter Tint on live viewfinder */}
      {activeFilterObj?.overlayColor && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: activeFilterObj.overlayColor },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Countdown Visual Overlay */}
      {activeCountdown !== null && (
        <View className="absolute inset-0 items-center justify-center bg-black/40 z-30">
          <Text className="text-white text-8xl font-black">{activeCountdown}</Text>
        </View>
      )}

      {/* Top Header Controls (Clean Unified Live Header) */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          paddingTop: topInset + 8,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 20,
        }}
      >
        {/* Left: Close / Back */}
        <TouchableOpacity
          onPress={() => {
            if (onClose) {
              onClose();
            } else {
              router.back();
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Close camera"
          className="w-10 h-10 rounded-full bg-black/50 items-center justify-center border border-white/20 shadow-sm active:opacity-80"
        >
          <Ionicons name="close" size={22} color="white" />
        </TouchableOpacity>

        {/* Center: Sound Picker Pill */}
        <TouchableOpacity
          onPress={() => setShowMusicModal(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: selectedTrack
              ? "rgba(15, 23, 42, 0.8)"
              : "rgba(0, 0, 0, 0.5)",
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: selectedTrack
              ? "rgba(56, 189, 248, 0.45)"
              : "rgba(255, 255, 255, 0.2)",
            maxWidth: screenWidth * 0.48,
          }}
        >
          <Ionicons
            name="musical-notes"
            size={14}
            color={selectedTrack ? colors.sky[400] : "white"}
          />
          <Text
            className="text-white text-xs font-bold"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {selectedTrack ? selectedTrack.title : "Add Sound"}
          </Text>
          {selectedTrack && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                setSelectedTrack(null);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Remove sound"
            >
              <Ionicons
                name="close-circle"
                size={14}
                color="rgba(255,255,255,0.7)"
              />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Right: Recording Badge or Flash */}
        <View className="flex-row items-center gap-2">
          {isRecording ? (
            <View className="flex-row items-center gap-2 bg-red-600/90 px-3 py-1.5 rounded-full">
              <Animated.View
                style={{ opacity: pulseAnim }}
                className="w-2.5 h-2.5 rounded-full bg-white"
              />
              <Text className="text-white font-mono font-bold text-xs">
                {formatTimer(recordSeconds)}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={cycleFlash}
              accessibilityRole="button"
              accessibilityLabel={`Flash ${flash}`}
              className="w-10 h-10 rounded-full bg-black/50 items-center justify-center border border-white/20 shadow-sm active:opacity-80"
            >
              <Ionicons
                name={FLASH_ICON[flash] || "flash-off-outline"}
                size={20}
                color="white"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Side Creative Toolbar */}
      {!isRecording && (
        <View
          style={{
            position: "absolute",
            right: 16,
            top: topInset + 64,
            gap: 14,
            zIndex: 20,
            alignItems: "center",
          }}
        >
          {/* Camera Flip */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFacing((f) => (f === "back" ? "front" : "back"));
              setZoomIndex(0); // Reset zoom to 1x on camera flip
            }}
            accessibilityRole="button"
            accessibilityLabel="Flip camera"
            style={styles.sideToolBtn}
            activeOpacity={0.8}
          >
            <Image
              source={require("@/assets/homeIcons/cameraflip.png")}
              style={{ width: 20, height: 20 }}
              tintColor={colors.white}
            />
          </TouchableOpacity>

          {/* Real Camera Zoom Toggle (1x / 2x / 3x) */}
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              setZoomIndex((prev) => (prev + 1) % ZOOM_PRESETS.length);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Camera zoom ${currentZoom.label}`}
            style={[
              styles.sideToolBtn,
              currentZoom.zoom > 0 ? styles.sideToolBtnActive : null,
            ]}
            activeOpacity={0.8}
          >
            <Text style={{ color: colors.white, fontSize: 13, fontWeight: "800" }}>
              {currentZoom.label}
            </Text>
          </TouchableOpacity>

          {/* Countdown Timer */}
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              const idx = TIMER_OPTIONS.indexOf(countdownTimer);
              setCountdownTimer(TIMER_OPTIONS[(idx + 1) % TIMER_OPTIONS.length]);
            }}
            accessibilityRole="button"
            accessibilityLabel={
              countdownTimer > 0 ? `Timer ${countdownTimer} seconds` : "Timer off"
            }
            style={[
              styles.sideToolBtn,
              countdownTimer > 0 ? styles.sideToolBtnActive : null,
            ]}
            activeOpacity={0.8}
          >
            <Ionicons
              name={countdownTimer > 0 ? "timer" : "timer-outline"}
              size={20}
              color={colors.white}
            />
            {countdownTimer > 0 && (
              <Text
                style={{
                  position: "absolute",
                  bottom: 2,
                  fontSize: 8,
                  color: colors.white,
                  fontWeight: "800",
                }}
              >
                {countdownTimer}s
              </Text>
            )}
          </TouchableOpacity>

          {/* Filters Toggle */}
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              setShowFilterPicker((p) => !p);
            }}
            accessibilityRole="button"
            accessibilityLabel="Filters"
            style={[
              styles.sideToolBtn,
              selectedFilter !== "none" ? styles.sideToolBtnActive : null,
            ]}
            activeOpacity={0.8}
          >
            <Ionicons name="color-filter-outline" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Controls Area */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.96)"]}
        style={[
          styles.liveBottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) + 12 },
        ]}
      >
        {/* Live Filter Carousel Drawer (Cleanly stacked above mode selector) */}
        {showFilterPicker && (
          <View className="mb-4 py-1.5 bg-black/50 border-y border-white/10">
            <FilterPicker
              selectedFilter={selectedFilter}
              onSelectFilter={setSelectedFilter}
            />
          </View>
        )}

        {/* Mode Selector (Photo / Video / Story) */}
        {!isRecording && (
          <View style={styles.modeSelectorRow}>
            {MODES.map((mode) => {
              const active = activeMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveMode(mode);
                  }}
                  style={[styles.modePill, active ? styles.modePillActive : null]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.modePillText,
                      active ? styles.modePillTextActive : null,
                    ]}
                  >
                    {mode}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Shutter Controls */}
        <View style={styles.shutterRow}>
          {/* Gallery Picker */}
          {!isRecording ? (
            <TouchableOpacity
              onPress={pickMedia}
              accessibilityRole="button"
              accessibilityLabel="Choose from gallery"
              style={styles.galleryBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={22} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 48, height: 48 }} />
          )}

          {/* Shutter Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              if (activeMode === "Video") {
                if (isRecording) {
                  stopRecording();
                } else {
                  startRecording();
                }
              } else {
                takePhoto();
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={
              activeMode === "Video"
                ? isRecording
                  ? "Stop recording"
                  : "Start recording"
                : "Take photo"
            }
            style={styles.shutterRing}
          >
            <View
              style={[
                styles.shutterCore,
                activeMode === "Video"
                  ? isRecording
                    ? styles.shutterVideoActive
                    : styles.shutterVideoInactive
                  : undefined,
              ]}
            />
          </TouchableOpacity>

          {/* Quick Flip Camera for one-handed thumb reach */}
          {!isRecording ? (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFacing((f) => (f === "back" ? "front" : "back"));
                setZoomIndex(0);
              }}
              accessibilityRole="button"
              accessibilityLabel="Flip camera"
              style={styles.galleryBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="camera-reverse-outline" size={22} color={colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 48, height: 48 }} />
          )}
        </View>
      </LinearGradient>

      {/* Sound Picker Modal */}
      <MusicPickerModal
        visible={showMusicModal}
        selectedTrack={selectedTrack}
        onClose={() => setShowMusicModal(false)}
        onSelectTrack={setSelectedTrack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    width: "100%",
    height: "100%",
  },
  liveBottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 16,
    zIndex: 25,
  },
  studioBottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 40,
    zIndex: 25,
  },
  modeSelectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  modePill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  modePillActive: {
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  modePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.65)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  modePillTextActive: {
    color: colors.white,
    fontWeight: "800",
  },
  sideToolBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  sideToolBtnActive: {
    backgroundColor: colors.blue[600],
    borderColor: colors.blue[400],
  },
  shutterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 36,
    width: "100%",
  },
  galleryBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterRing: {
    width: SHUTTER_OUTER,
    height: SHUTTER_OUTER,
    borderRadius: SHUTTER_OUTER / 2,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterCore: {
    width: SHUTTER_INNER,
    height: SHUTTER_INNER,
    borderRadius: SHUTTER_INNER / 2,
    backgroundColor: colors.white,
  },
  shutterVideoInactive: {
    backgroundColor: colors.red[500],
  },
  shutterVideoActive: {
    backgroundColor: colors.red[500],
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  studioIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  studioIconButtonActive: {
    backgroundColor: colors.blue[600],
    borderColor: colors.blue[400],
  },
  studioSoundPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  studioSoundPillActive: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    borderColor: "rgba(56, 189, 248, 0.55)",
  },
  studioSoundPillText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
  studioToolsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  studioToolAaText: {
    color: colors.white,
    fontWeight: "900",
    fontSize: 14,
  },
  studioActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    width: "100%",
  },
  studioDiscardBtn: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.28)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  studioDiscardText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  studioNextBtn: {
    flex: 1.25,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.blue[600],
    borderWidth: 1,
    borderColor: colors.blue[400],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.blue[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  studioNextText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});