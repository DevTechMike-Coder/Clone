import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import React, { useRef, useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type CaptureMode = "Post" | "Story" | "Reel";

const MODES: CaptureMode[] = ["Post", "Story", "Reel"];

const SHUTTER_OUTER = 82;
const SHUTTER_INNER = 66;

export default function TestCamera() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [activeMode, setActiveMode] = useState<CaptureMode>("Post");
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (permission && !permission.granted && !permission.canAskAgain) {
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

  if (permission && !permission.granted) {
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

  const takePicture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({
      quality: 0.85,
      base64: false,
      exif: false,
      skipProcessing: false,
    });
    if (photo) console.log("Captured:", photo.uri);
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing={facing}
      />

      {/* ── Top gradient + controls ── */}
      <LinearGradient
        colors={["rgba(0,0,0,0.72)", "transparent"]}
        className="absolute top-0 left-0 right-0 h-36"
        style={{ paddingTop: insets.top + 6 }}
      >
      </LinearGradient>

      {/* ── Bottom gradient + controls ── */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.94)"]}
        className="absolute left-0 right-0 bottom-0 pt-9"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {/* Mode tabs */}
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

        {/* Shutter row */}
        <View className="flex-row items-center justify-between px-10 mb-1.5">
          {/* Gallery */}
          <Pressable
            className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 items-center justify-center active:opacity-70"
            hitSlop={8}
          >
            <Ionicons name="images-outline" size={23} color="white" />
          </Pressable>

          {/* Shutter */}
          <Pressable onPress={takePicture} hitSlop={6}>
            <View style={styles.shutterRing}>
              <View style={styles.shutterCore} />
            </View>
          </Pressable>

          {/* Flip */}
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