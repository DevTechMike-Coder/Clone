import TestCamera from "@/components/TestCamera";
import { router } from "expo-router";
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

const CreateNew = () => {
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
      />
    </View>
  );
};

export default CreateNew;
