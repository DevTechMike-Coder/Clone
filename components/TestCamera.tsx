import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
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

type CaptureMode = "Photo" | "Video" | "Story";

type TestCameraProps = {
  flash?: FlashMode;
  onPreviewChange?: (isPreviewing: boolean) => void;
};

const MODES: CaptureMode[] = ["Photo", "Video", "Story"];
const SPEED_OPTIONS = [0.5, 1, 2, 3];
const TIMER_OPTIONS = [0, 3, 10];
const QUICK_STICKERS = ["🔥", "❤️", "✨", "🚀", "💯", "⚡", "🎉", "🌴", "🎧", "👏"];

const SHUTTER_OUTER = 82;
const SHUTTER_INNER = 66;

export default function TestCamera({
  flash = "off",
  onPreviewChange,
}: TestCameraProps) {
  const insets = useSafeAreaInsets();

  // Permissions
  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  // Camera Settings
  const [facing, setFacing] = useState<CameraType>("back");
  const [activeMode, setActiveMode] = useState<CaptureMode>("Photo");
  const [speed, setSpeed] = useState<number>(1);
  const [countdownTimer, setCountdownTimer] = useState<number>(0);
  const [activeCountdown, setActiveCountdown] = useState<number | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordIntervalRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Creative Tools State
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [textOverlays, setTextOverlays] = useState<TextOverlayItem[]>([]);
  const [showTextModal, setShowTextModal] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrackItem | null>(null);
  const [showMusicModal, setShowMusicModal] = useState(false);
  const [showStickerTray, setShowStickerTray] = useState(false);

  // Captured Output State
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [capturedType, setCapturedType] = useState<"image" | "video">("image");
  const [showDiscardModal, setShowDiscardModal] = useState(false);

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
    if (!isCameraReady || isRecording) return;

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
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.85,
        base64: false,
        exif: false,
        skipProcessing: false,
      });

      if (photo?.uri) {
        setCapturedUri(photo.uri);
        setCapturedType("image");
      }
    } catch (err) {
      console.error("Take photo error:", err);
    }
  };

  // Video Recording
  const startRecording = async () => {
    if (!isCameraReady || isRecording) return;

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
    } catch (err) {
      console.error("Recording error:", err);
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

  const handleContinue = () => {
    if (!capturedUri) return;

    setPendingPostData({
      mediaUri: capturedUri,
      mediaType: capturedType,
      filterId: selectedFilter !== "none" ? selectedFilter : undefined,
      textOverlays,
      musicTrack: selectedTrack,
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

  const activeFilterObj = CAMERA_FILTERS.find((f) => f.id === selectedFilter);

  // -------------------------------------------------------------
  // STUDIO PREVIEW SCREEN (AFTER CAPTURE)
  // -------------------------------------------------------------
  if (capturedUri) {
    return (
      <View className="flex-1 bg-black">
        {/* Media Preview */}
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

        {/* Text / Sticker Overlays */}
        {textOverlays.map((item) => (
          <View
            key={item.id}
            className="absolute top-1/3 left-10 right-10 items-center z-10"
          >
            <View
              className="px-4 py-2 rounded-2xl flex-row items-center gap-2 shadow-lg"
              style={{
                backgroundColor: item.bgColor || "transparent",
              }}
            >
              <Text
                className="text-2xl font-bold text-center"
                style={{ color: item.color }}
              >
                {item.text}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setTextOverlays((prev) => prev.filter((o) => o.id !== item.id))
                }
                className="bg-black/50 rounded-full p-1 ml-1"
              >
                <Ionicons name="close" size={14} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Music Sound Badge */}
        {selectedTrack && (
          <View
            className="absolute left-6 right-6 top-16 z-20 items-center"
          >
            <View className="flex-row items-center gap-2 bg-black/60 px-4 py-2 rounded-full border border-white/20">
              <Ionicons name="musical-notes" size={16} color="#38BDF8" />
              <Text className="text-white text-xs font-bold" numberOfLines={1}>
                {selectedTrack.title} • {selectedTrack.artist}
              </Text>
            </View>
          </View>
        )}

        {/* Top Studio Action Bar */}
        <View
          className="absolute left-0 right-0 top-0 pt-12 px-5 flex-row items-center justify-between z-20"
        >
          <TouchableOpacity
            onPress={() => setShowDiscardModal(true)}
            className="w-10 h-10 rounded-full bg-black/50 items-center justify-center border border-white/20"
          >
            <Ionicons name="close" size={22} color="white" />
          </TouchableOpacity>

          <View className="flex-row items-center gap-2.5">
            {/* Add Sound */}
            <TouchableOpacity
              onPress={() => setShowMusicModal(true)}
              className="w-10 h-10 rounded-full bg-black/50 items-center justify-center border border-white/20"
            >
              <Ionicons name="musical-notes" size={20} color="white" />
            </TouchableOpacity>

            {/* Add Text */}
            <TouchableOpacity
              onPress={() => setShowTextModal(true)}
              className="w-10 h-10 rounded-full bg-black/50 items-center justify-center border border-white/20"
            >
              <Text className="text-white font-black text-base">Aa</Text>
            </TouchableOpacity>

            {/* Filters */}
            <TouchableOpacity
              onPress={() => setShowFilterPicker((p) => !p)}
              className={`w-10 h-10 rounded-full items-center justify-center border ${
                showFilterPicker
                  ? "bg-blue-600 border-blue-400"
                  : "bg-black/50 border-white/20"
              }`}
            >
              <Ionicons name="color-filter-outline" size={20} color="white" />
            </TouchableOpacity>

            {/* Stickers */}
            <TouchableOpacity
              onPress={() => setShowStickerTray((p) => !p)}
              className={`w-10 h-10 rounded-full items-center justify-center border ${
                showStickerTray
                  ? "bg-blue-600 border-blue-400"
                  : "bg-black/50 border-white/20"
              }`}
            >
              <Ionicons name="happy-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sticker Tray Drawer */}
        {showStickerTray && (
          <View className="absolute top-28 left-0 right-0 z-30 bg-black/75 py-3 border-y border-white/10">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}
            >
              {QUICK_STICKERS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  activeOpacity={0.7}
                  onPress={() => {
                    setTextOverlays((prev) => [
                      ...prev,
                      {
                        id: Date.now().toString(),
                        text: emoji,
                        color: "#FFFFFF",
                      },
                    ]);
                    setShowStickerTray(false);
                  }}
                  className="w-12 h-12 rounded-2xl bg-white/10 items-center justify-center border border-white/15"
                >
                  <Text className="text-2xl">{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Filter Carousel in Studio */}
        {showFilterPicker && (
          <View className="absolute bottom-28 left-0 right-0 z-20 bg-black/60 py-2 border-t border-white/10">
            <FilterPicker
              selectedFilter={selectedFilter}
              onSelectFilter={setSelectedFilter}
            />
          </View>
        )}

        {/* Bottom Navigation Buttons */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.95)"]}
          className="absolute left-0 right-0 bottom-0 px-6 pt-16"
          style={{ paddingBottom: insets.bottom + 14 }}
        >
          <View className="flex-row items-center justify-between gap-4">
            <TouchableOpacity
              onPress={() => setShowDiscardModal(true)}
              className="h-12 flex-1 rounded-full border border-white/30 bg-black/40 items-center justify-center"
            >
              <Text className="text-white text-base font-semibold">Discard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleContinue}
              className="h-12 flex-1 rounded-full bg-blue-600 items-center justify-center shadow-lg"
            >
              <Text className="text-white text-base font-bold">Next</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Discard Confirmation Modal */}
        <Modal
          transparent
          visible={showDiscardModal}
          animationType="fade"
          onRequestClose={() => setShowDiscardModal(false)}
        >
          <Pressable
            className="flex-1 bg-black/70 items-center justify-center px-8"
            onPress={() => setShowDiscardModal(false)}
          >
            <View className="w-full bg-white rounded-3xl p-6 items-center">
              <Ionicons name="trash-outline" size={32} color="#EF4444" />
              <Text className="text-slate-900 text-lg font-bold mt-3 mb-1">
                Discard Capture?
              </Text>
              <Text className="text-slate-500 text-center text-xs mb-6">
                If you go back, you will lose this photo/video and all edits.
              </Text>

              <View className="w-full gap-2.5">
                <TouchableOpacity
                  onPress={() => {
                    setShowDiscardModal(false);
                    setCapturedUri(null);
                    setTextOverlays([]);
                  }}
                  className="w-full h-12 bg-red-500 rounded-xl items-center justify-center"
                >
                  <Text className="text-white font-bold text-sm">Discard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowDiscardModal(false)}
                  className="w-full h-12 bg-slate-100 rounded-xl items-center justify-center"
                >
                  <Text className="text-slate-700 font-bold text-sm">
                    Keep Editing
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>

        {/* Overlays & Modals */}
        <TextOverlayModal
          visible={showTextModal}
          onClose={() => setShowTextModal(false)}
          onAddText={(item) => setTextOverlays((prev) => [...prev, item])}
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
  if (!camPermission?.granted) {
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
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        mode={activeMode === "Video" ? "video" : "picture"}
        onCameraReady={() => setIsCameraReady(true)}
        onMountError={({ message }) => setMountError(message)}
      />

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

      {/* Top Header Controls */}
      <View
        className="absolute left-0 right-0 top-0 pt-12 px-5 flex-row items-center justify-between z-20"
      >
        {/* Sound Picker Pill at Top */}
        <TouchableOpacity
          onPress={() => setShowMusicModal(true)}
          className="flex-row items-center gap-2 bg-black/50 px-3.5 py-1.5 rounded-full border border-white/20"
        >
          <Ionicons name="musical-notes" size={14} color="#38BDF8" />
          <Text className="text-white text-xs font-bold" numberOfLines={1}>
            {selectedTrack ? selectedTrack.title : "Add Sound"}
          </Text>
        </TouchableOpacity>

        {/* Recording Timer Badge */}
        {isRecording && (
          <View className="flex-row items-center gap-2 bg-red-600/90 px-3.5 py-1.5 rounded-full">
            <Animated.View
              style={{ opacity: pulseAnim }}
              className="w-2.5 h-2.5 rounded-full bg-white"
            />
            <Text className="text-white font-mono font-bold text-xs">
              {formatTimer(recordSeconds)}
            </Text>
          </View>
        )}
      </View>

      {/* Side Creative Toolbar */}
      {!isRecording && (
        <View className="absolute right-4 top-28 gap-4 z-20 items-center">
          {/* Camera Flip */}
          <TouchableOpacity
            onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
            className="w-11 h-11 rounded-full bg-black/40 border border-white/20 items-center justify-center"
          >
            <Image
              source={require("@/assets/homeIcons/cameraflip.png")}
              style={{ width: 20, height: 20 }}
              tintColor="white"
            />
          </TouchableOpacity>

          {/* Speed Toggle */}
          <TouchableOpacity
            onPress={() => {
              const idx = SPEED_OPTIONS.indexOf(speed);
              setSpeed(SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length]);
            }}
            className="w-11 h-11 rounded-full bg-black/40 border border-white/20 items-center justify-center"
          >
            <Text className="text-white text-xs font-bold">{speed}x</Text>
          </TouchableOpacity>

          {/* Countdown Timer */}
          <TouchableOpacity
            onPress={() => {
              const idx = TIMER_OPTIONS.indexOf(countdownTimer);
              setCountdownTimer(TIMER_OPTIONS[(idx + 1) % TIMER_OPTIONS.length]);
            }}
            className={`w-11 h-11 rounded-full items-center justify-center border ${
              countdownTimer > 0
                ? "bg-blue-600 border-blue-400"
                : "bg-black/40 border-white/20"
            }`}
          >
            <Ionicons
              name={countdownTimer > 0 ? "timer" : "timer-outline"}
              size={20}
              color="white"
            />
            {countdownTimer > 0 && (
              <Text className="text-[8px] text-white font-bold absolute bottom-0.5">
                {countdownTimer}s
              </Text>
            )}
          </TouchableOpacity>

          {/* Filters Toggle */}
          <TouchableOpacity
            onPress={() => setShowFilterPicker((p) => !p)}
            className={`w-11 h-11 rounded-full items-center justify-center border ${
              selectedFilter !== "none"
                ? "bg-blue-600 border-blue-400"
                : "bg-black/40 border-white/20"
            }`}
          >
            <Ionicons name="color-filter-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Live Filter Carousel Drawer */}
      {showFilterPicker && (
        <View className="absolute bottom-36 left-0 right-0 z-20 bg-black/60 py-2 border-t border-white/10">
          <FilterPicker
            selectedFilter={selectedFilter}
            onSelectFilter={setSelectedFilter}
          />
        </View>
      )}

      {/* Bottom Controls Area */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.96)"]}
        className="absolute left-0 right-0 bottom-0 pt-8"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {/* Mode Selector (Photo / Video / Story) */}
        {!isRecording && (
          <View className="flex-row items-center justify-center gap-8 mb-6">
            {MODES.map((mode) => {
              const active = activeMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setActiveMode(mode)}
                  className="items-center gap-1"
                >
                  <Text
                    className={`text-xs font-bold uppercase tracking-widest ${
                      active ? "text-white" : "text-white/40"
                    }`}
                  >
                    {mode}
                  </Text>
                  {active && <View className="w-1 h-1 rounded-full bg-white" />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Shutter Controls */}
        <View className="flex-row items-center justify-between px-10">
          {/* Gallery Picker */}
          {!isRecording ? (
            <TouchableOpacity
              onPress={pickMedia}
              className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 items-center justify-center"
            >
              <Ionicons name="images-outline" size={22} color="white" />
            </TouchableOpacity>
          ) : (
            <View className="w-12 h-12" />
          )}

          {/* Shutter Button (Tap or Hold depending on mode) */}
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

          <View className="w-12 h-12" />
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
    backgroundColor: "#fff",
  },
  shutterVideoInactive: {
    backgroundColor: "#EF4444",
  },
  shutterVideoActive: {
    backgroundColor: "#EF4444",
    width: 32,
    height: 32,
    borderRadius: 8,
  },
});