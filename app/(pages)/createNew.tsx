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
  const [isPreviewing, setIsPreviewing] = useState(false);

  const cycleFlash = () =>
    setFlash((f) => FLASH_CYCLE[(FLASH_CYCLE.indexOf(f) + 1) % 3]);

  return (
    <View className="flex-1 bg-black">
      {/* edges={["top"]} — TestCamera handles bottom insets itself */}
      <SafeAreaView edges={["top"]} className="flex-1">
        {/* removed px-4 pb-4 — was cropping CameraView's absoluteFillObject */}
        <View className="flex-1">
          <TestCamera flash={flash} onPreviewChange={setIsPreviewing} />
        </View>

        <View className="absolute left-0 right-0 top-0 pt-12 px-5 flex-row items-center justify-between">
          {/* hidden during preview — TestCamera's Cancel handles discard flow */}
          {!isPreviewing && (
            <View className="absolute left-5 top-12 z-20">
              <Pressable
                onPress={() => router.back()}
                className="h-11 w-11 rounded-full bg-black/45 items-center justify-center active:opacity-80"
              >
                <Image
                  source={require("@/assets/homeIcons/delete.png")}
                  className="w-7 h-7"
                  tintColor="white"
                  resizeMode="contain"
                />
              </Pressable>
            </View>
          )}

          <View className="h-11 w-11" />

          {!isPreviewing && (
            <Pressable
              onPress={cycleFlash}
              className="h-11 w-11 rounded-full bg-black/40 items-center justify-center active:opacity-80"
            >
              <Ionicons name={FLASH_ICON[flash]} size={24} color="white" />
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
};

export default CreateNew;
