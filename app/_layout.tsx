import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import Toast from "react-native-toast-message";
import { toastConfig } from "@/components/ToastConfig";
import { usePushNotifications } from "@/lib/usePushNotifications";

function RootNavigation() {
  const { isDark, palette } = useTheme();

  // Keep system UI background in sync with theme to avoid white flash
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(palette.background).catch(() => {});
  }, [palette.background]);

  // Registers this device's push token for the signed-in user and routes taps
  usePushNotifications();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigation />
        <Toast config={toastConfig} topOffset={54} />
      </AuthProvider>
    </ThemeProvider>
  );
}
