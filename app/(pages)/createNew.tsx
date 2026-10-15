import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import TestCamera, { CaptureMode } from "@/components/TestCamera";
import { colors } from "@/constants/theme";

type FlashMode = "off" | "on" | "auto";

const FLASH_CYCLE: FlashMode[] = ["off", "on", "auto"];
const VALID_MODES: CaptureMode[] = ["Photo", "Video", "Story"];

export default function CreateNew() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const initialMode: CaptureMode = VALID_MODES.includes(mode as CaptureMode)
    ? (mode as CaptureMode)
    : "Photo";

  const [flash, setFlash] = useState<FlashMode>("off");
  const [, setIsPreviewing] = useState(false);

  const cycleFlash = () =>
    setFlash((f) => FLASH_CYCLE[(FLASH_CYCLE.indexOf(f) + 1) % 3]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <TestCamera
        flash={flash}
        onFlashCycle={cycleFlash}
        onClose={() => router.back()}
        onPreviewChange={setIsPreviewing}
        initialMode={initialMode}
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
});
