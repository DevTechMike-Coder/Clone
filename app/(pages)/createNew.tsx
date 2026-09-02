import TestCamera, { CaptureMode } from "@/components/TestCamera";
import { router, useLocalSearchParams } from "expo-router";
import { styled } from "nativewind";
import React, { useState } from "react";
import { Image, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

type FlashMode = "off" | "on" | "auto";

const FLASH_CYCLE: FlashMode[] = ["off", "on", "auto"];
const FLASH_ICON: Record<FlashMode, keyof typeof Ionicons.glyphMap> = {
  off: "flash-off-outline",
  on: "flash",
  auto: "flash-outline",
};

const VALID_MODES: CaptureMode[] = ["Photo", "Video", "Story"];

const CreateNew = () => {
  // Optional "mode" param lets callers deep-link straight into a capture mode,
  // e.g. router.push({ pathname: "/(pages)/createNew", params: { mode: "Story" } })
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const initialMode: CaptureMode = VALID_MODES.includes(mode as CaptureMode)
    ? (mode as CaptureMode)
    : "Photo";

  const [flash, setFlash] = useState<FlashMode>("off");
  const [, setIsPreviewing] = useState(false);

  const cycleFlash = () =>
    setFlash((f) => FLASH_CYCLE[(FLASH_CYCLE.indexOf(f) + 1) % 3]);

  return (
    <View className="flex-1 bg-black">
      <TestCamera
        flash={flash}
        onFlashCycle={cycleFlash}
        onClose={() => router.back()}
        onPreviewChange={setIsPreviewing}
        initialMode={initialMode}
      />
    </View>
  );
};

export default CreateNew;
