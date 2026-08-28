import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import type { CameraType, FlashMode } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { setPendingImageUri } from "@/store/pendingPost";

type CaptureMode = "Post" | "Story" | "Reel";

type TestCameraProps = {
  flash?: FlashMode;
  onPreviewChange?: (isPreviewing: boolean) => void;
};

const MODES: CaptureMode[] = ["Post", "Story", "Reel"];

const SHUTTER_OUTER = 82;
const SHUTTER_INNER = 66;

export default function TestCamera({
  flash = "off",
  onPreviewChange,
}: TestCameraProps) {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [activeMode, setActiveMode] = useState<CaptureMode>("Post");
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [mountError, setMountError] = useState<string | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    onPreviewChange?.(!!capturedImageUri);
  }, [capturedImageUri, onPreviewChange]);

  const takePicture = async () => {
    if (!isCameraReady || isCapturing) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.85,
        base64: false,
        exif: false,
        skipProcessing: false,
        shutterSound: false,
      });

      if (photo) {
        setCapturedImageUri(photo.uri);
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const continueToPostDetails = () => {
    if (!capturedImageUri) return;
    setPendingImageUri(capturedImageUri);
    router.push({ pathname: "/postDetails" });
  };

  const retakePicture = () => {
    setCapturedImageUri(null);
  };

  const handleCancel = () => {
    setShowDiscardModal(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setCapturedImageUri(result.assets[0].uri);
    }
  };

  if (capturedImageUri) {
    return (
      <View className="flex-1 bg-black">
        <Image
          source={{ uri: capturedImageUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />

        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.58)", "rgba(0,0,0,0.92)"]}
          className="absolute left-0 right-0 bottom-0 px-6 pt-24"
          style={{ paddingBottom: insets.bottom + 18 }}
        >
          <View className="flex-row items-center justify-between gap-4">
            <Pressable
              onPress={handleCancel}
              className="h-12 flex-1 rounded-full border border-white/30 bg-black/35 items-center justify-center active:opacity-75"
            >
              <Text className="text-white text-base font-semibold">Cancel</Text>
            </Pressable>

            <Pressable
              onPress={continueToPostDetails}
              className="h-12 flex-1 rounded-full bg-white items-center justify-center active:opacity-75"
            >
              <Text className="text-black text-base font-semibold">Next</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <Modal
          transparent
          visible={showDiscardModal}
          animationType="fade"
          onRequestClose={() => setShowDiscardModal(false)}
        >
          <Pressable
            className="flex-1 bg-black/60 items-center justify-center px-8"
            onPress={() => setShowDiscardModal(false)}
          >
            <Pressable
              className="w-full bg-white rounded-[32px] overflow-hidden p-8 items-center"
              onPress={(e) => e.stopPropagation()}
            >
              <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-5">
                <Ionicons name="trash-outline" size={24} color="#2563eb" />
              </View>

              <Text className="text-slate-900 text-xl font-bold mb-2">
                Discard image?
              </Text>
              <Text className="text-slate-500 text-center text-[15px] leading-5 mb-8">
                If you go back now, you will lose your photo. This action cannot
                be undone.
              </Text>

              <View className="w-full gap-3">
                <Pressable
                  onPress={() => {
                    setShowDiscardModal(false);
                    retakePicture();
                  }}
                  className="w-full h-14 bg-red-50 rounded-2xl items-center justify-center active:opacity-80"
                >
                  <Text className="text-red-600 font-bold text-base">
                    Discard
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setShowDiscardModal(false)}
                  className="w-full h-14 bg-blue-600 rounded-2xl items-center justify-center active:opacity-90"
                >
                  <Text className="text-white font-bold text-base">
                    Keep Editing
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  }

  if (!permission) {
    return (
      <View className="flex-1 bg-black items-center justify-center gap-3 px-9">
        <ActivityIndicator color="white" />
        <Text className="text-white/60 text-sm font-medium">
          Checking camera access
        </Text>
      </View>
    );
  }

  if (!permission.granted && !permission.canAskAgain) {
    return (
      <View className="flex-1 bg-black items-center justify-center gap-3 px-9">
        <Ionicons name="camera-outline" size={48} color="rgba(255,255,255,0.3)" />
        <Text className="text-white text-lg font-semibold mt-2">
          Camera Access Denied
        </Text>
        <Text className="text-white/40 text-sm text-center leading-5">
          Enable camera access in your device settings to continue.
        </Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center gap-3 px-9">
        <Ionicons name="camera-outline" size={52} color="rgba(255,255,255,0.6)" />
        <Text className="text-white text-lg font-semibold mt-2">
          Camera access required
        </Text>
        <Pressable
          onPress={requestPermission}
          className="mt-2 bg-white px-8 py-3 rounded-full active:opacity-75"
        >
          <Text className="text-black font-semibold text-base">
            Grant Permission
          </Text>
        </Pressable>
      </View>
    );
  }

  if (mountError) {
    return (
      <View className="flex-1 bg-black items-center justify-center gap-3 px-9">
        <Ionicons name="warning-outline" size={48} color="rgba(255,255,255,0.45)" />
        <Text className="text-white text-lg font-semibold mt-2">
          Camera unavailable
        </Text>
        <Text className="text-white/45 text-sm text-center leading-5">
          {mountError}
        </Text>
        <Pressable
          onPress={pickImage}
          className="mt-2 bg-white px-8 py-3 rounded-full active:opacity-75"
        >
          <Text className="text-black font-semibold text-base">
            Choose from Gallery
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        animateShutter={false}
        onCameraReady={() => setIsCameraReady(true)}
        onMountError={({ message }) => setMountError(message)}
      />

      {!isCameraReady && (
        <View className="absolute inset-0 items-center justify-center bg-black">
          <ActivityIndicator color="white" />
          <Text className="mt-3 text-sm font-medium text-white/60">
            Starting camera
          </Text>
        </View>
      )}

      <LinearGradient
        colors={["rgba(0,0,0,0.72)", "transparent"]}
        className="absolute top-0 left-0 right-0 h-36"
        style={{ paddingTop: insets.top + 6 }}
      />

      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.94)"]}
        className="absolute left-0 right-0 bottom-0 pt-9"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="flex-row items-center justify-center gap-8 mb-7">
          {MODES.map((mode) => {
            const active = activeMode === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setActiveMode(mode)}
                className="items-center gap-1"
                hitSlop={8}
              >
                <Text
                  className={`text-xs font-semibold tracking-widest uppercase ${
                    active ? "text-white" : "text-white/35"
                  }`}
                >
                  {mode}
                </Text>
                {active && <View className="w-1 h-1 rounded-full bg-white" />}
              </Pressable>
            );
          })}
        </View>

        <View className="flex-row items-center justify-between px-10 mb-1.5">
          <Pressable
            onPress={pickImage}
            className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 items-center justify-center active:opacity-70"
            hitSlop={8}
          >
            <Ionicons name="images-outline" size={23} color="white" />
          </Pressable>

          <Pressable
            onPress={takePicture}
            disabled={!isCameraReady || isCapturing}
            hitSlop={6}
            style={{ opacity: isCapturing ? 0.55 : 1 }}
          >
            <View style={styles.shutterRing}>
              <View style={styles.shutterCore} />
            </View>
          </Pressable>

          <Pressable
            onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
            className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 items-center justify-center active:opacity-70"
            hitSlop={8}
          >
            <Image
              source={require("@/assets/homeIcons/cameraflip.png")}
              style={{ width: 22, height: 22 }}
              tintColor="white"
            />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shutterRing: {
    width: SHUTTER_OUTER,
    height: SHUTTER_OUTER,
    borderRadius: SHUTTER_OUTER / 2,
    borderWidth: 3.5,
    borderColor: "rgba(255,255,255,0.82)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterCore: {
    width: SHUTTER_INNER,
    height: SHUTTER_INNER,
    borderRadius: SHUTTER_INNER / 2,
    backgroundColor: "#fff",
  },
});