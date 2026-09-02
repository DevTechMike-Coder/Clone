import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import type { CameraType, FlashMode } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { storyService } from "@/services/storyService";
import Toast from "react-native-toast-message";
import { colors } from "@/constants/theme";

const BG_COLORS = [colors.black, colors.slate[800], colors.violet[600], colors.blue[600], colors.emerald[600], colors.red[600], colors.amber[500], colors.pink[500]];

export default function CreateStory() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [flash, setFlash] = useState<FlashMode>("off");
  const [isCameraReady, setIsCameraReady] = useState(false);

  // captured state
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [capturedType, setCapturedType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [bgColor, setBgColor] = useState<string>(colors.black);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);

  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  const takePhoto = async () => {
    if (!isCameraReady || !cameraRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        exif: false,
      });
      if (photo?.uri) {
        setCapturedUri(photo.uri);
        setCapturedType("image");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.9,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setCapturedUri(result.assets[0].uri);
      setCapturedType("image");
    }
  };

  const createTextStory = () => {
    setCapturedUri("text-story");
    setCapturedType("image");
  };

  const discard = () => {
    setShowDiscard(false);
    setCapturedUri(null);
    setCaption("");
    setBgColor(colors.black);
  };

  const handlePublish = async () => {
    if (!user) {
      Toast.show({ type: "error", text1: "You must be signed in." });
      return;
    }
    if (!capturedUri) return;

    setPublishing(true);
    try {
      if (capturedUri === "text-story") {
        // Create a "create" mode story — for simplicity, we send a black image via a 1x1 fallback.
        // Instead we just skip media (unsupported by schema); show error:
        throw new Error(
          "Text-only stories require a background image. Snap a photo or pick one from your gallery.",
        );
      }
      await storyService.createStory({
        userId: user.id,
        mediaUri: capturedUri,
        mediaType: capturedType,
        caption: caption.trim() || undefined,
        backgroundColor: bgColor,
      });
      Toast.show({ type: "success", text1: "Story added!" });
      router.back();
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Couldn't add story",
        text2: e?.message ?? "Please try again.",
      });
    } finally {
      setPublishing(false);
    }
  };

  if (!permission?.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-8">
        <Ionicons name="camera-outline" size={54} color="white" />
        <Text className="text-white text-lg font-bold mt-4">
          Camera access needed
        </Text>
        <Text className="text-white/50 text-center text-xs mt-2 mb-6">
          Allow camera access to capture stories.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="bg-blue-600 px-8 py-3 rounded-full"
        >
          <Text className="text-white font-bold">Grant Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ------------------------------------------------------------
  // Preview / publish screen
  // ------------------------------------------------------------
  if (capturedUri) {
    const isTextStory = capturedUri === "text-story";
    return (
      <View className="flex-1" style={{ backgroundColor: bgColor }}>
        {/* Media */}
        {!isTextStory ? (
          <Image
            source={{ uri: capturedUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={[bgColor, shade(bgColor, -0.25)]}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Caption */}
        <View
          style={{
            position: "absolute",
            top: insets.top + 80,
            left: 20,
            right: 20,
          }}
          className="items-center"
        >
          <TextInput
            placeholder="Add a caption..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={caption}
            onChangeText={setCaption}
            multiline
            textAlign="center"
            className="text-white text-2xl font-bold"
            style={{ width: "100%" }}
          />
        </View>

        {/* Top bar */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            paddingTop: Math.max(insets.top, 12),
            paddingHorizontal: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            onPress={() => setShowDiscard(true)}
            accessibilityRole="button"
            accessibilityLabel="Close"
            className="w-10 h-10 rounded-full bg-black/40 items-center justify-center border border-white/20"
          >
            <Ionicons name="close" size={22} color="white" />
          </TouchableOpacity>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => setShowColorPicker((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel="Choose background color"
              className="w-10 h-10 rounded-full bg-black/40 items-center justify-center border border-white/20"
            >
              <Ionicons name="color-palette-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Color picker */}
        {showColorPicker && (
          <View
            style={{
              position: "absolute",
              top: insets.top + 60,
              right: 16,
              backgroundColor: "rgba(0,0,0,0.7)",
              padding: 12,
              borderRadius: 20,
              flexDirection: "row",
              gap: 8,
            }}
          >
            {BG_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => {
                  setBgColor(c);
                  setShowColorPicker(false);
                }}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: c,
                  borderWidth: bgColor === c ? 3 : 2,
                  borderColor: bgColor === c ? colors.white : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </View>
        )}

        {/* Bottom bar */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: insets.bottom + 16,
            paddingHorizontal: 16,
          }}
        >
          <TouchableOpacity
            onPress={handlePublish}
            disabled={publishing}
            className="h-12 rounded-full bg-white items-center justify-center shadow-lg"
          >
            {publishing ? (
              <ActivityIndicator color={colors.blue[600]} />
            ) : (
              <Text className="text-slate-900 font-bold">Add to your story</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Discard modal */}
        <Modal
          transparent
          visible={showDiscard}
          animationType="fade"
          onRequestClose={() => setShowDiscard(false)}
        >
          <Pressable
            className="flex-1 bg-black/60 items-center justify-center px-8"
            onPress={() => setShowDiscard(false)}
          >
            <View className="w-full bg-white rounded-2xl p-5 items-center">
              <Text className="text-slate-900 text-lg font-bold">Discard story?</Text>
              <Text className="text-slate-500 text-center text-xs mt-1 mb-5">
                This will discard your current story draft.
              </Text>
              <View className="w-full gap-2">
                <TouchableOpacity
                  onPress={discard}
                  className="w-full h-11 bg-red-500 rounded-xl items-center justify-center"
                >
                  <Text className="text-white font-bold">Discard</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowDiscard(false)}
                  className="w-full h-11 bg-slate-100 rounded-xl items-center justify-center"
                >
                  <Text className="text-slate-700 font-bold">Keep editing</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Modal>
      </View>
    );
  }

  // ------------------------------------------------------------
  // Live camera
  // ------------------------------------------------------------
  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        onCameraReady={() => setIsCameraReady(true)}
      />

      {/* Top bar */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          paddingTop: Math.max(insets.top, 12),
          paddingHorizontal: 16,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          className="w-10 h-10 rounded-full bg-black/40 items-center justify-center border border-white/20"
        >
          <Ionicons name="close" size={22} color="white" />
        </TouchableOpacity>

        <Text className="text-white font-bold text-sm uppercase tracking-widest">
          Story
        </Text>

        <TouchableOpacity
          onPress={() => setFlash((f) => (f === "off" ? "on" : "off"))}
          accessibilityRole="button"
          accessibilityLabel={flash === "on" ? "Turn flash off" : "Turn flash on"}
          className="w-10 h-10 rounded-full bg-black/40 items-center justify-center border border-white/20"
        >
          <Ionicons
            name={flash === "on" ? "flash" : "flash-off"}
            size={20}
            color="white"
          />
        </TouchableOpacity>
      </View>

      {/* Side tools */}
      <View
        style={{
          position: "absolute",
          right: 16,
          top: insets.top + 70,
          gap: 14,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFacing((f) => (f === "back" ? "front" : "back"));
          }}
          className="w-11 h-11 rounded-full bg-black/40 border border-white/20 items-center justify-center"
        >
          <Ionicons name="camera-reverse-outline" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* Bottom controls */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.9)"]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: insets.bottom + 20,
          paddingTop: 40,
        }}
      >
        <View className="flex-row items-center justify-between px-8">
          <TouchableOpacity
            onPress={pickFromGallery}
            accessibilityRole="button"
            accessibilityLabel="Choose from gallery"
            className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 items-center justify-center"
          >
            <Ionicons name="images-outline" size={22} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={takePhoto}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            className="w-20 h-20 rounded-full border-4 border-white items-center justify-center"
          >
            <View className="w-16 h-16 rounded-full bg-white" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={createTextStory}
            className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 items-center justify-center"
          >
            <Text className="text-white font-black">Aa</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

function shade(hex: string, pct: number): string {
  // Quick hex darkening helper. Falls back to original on failure.
  try {
    const c = hex.replace("#", "");
    const num = parseInt(c, 16);
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;
    r = Math.max(0, Math.min(255, Math.round(r + 255 * pct)));
    g = Math.max(0, Math.min(255, Math.round(g + 255 * pct)));
    b = Math.max(0, Math.min(255, Math.round(b + 255 * pct)));
    return `rgb(${r},${g},${b})`;
  } catch {
    return hex;
  }
}
