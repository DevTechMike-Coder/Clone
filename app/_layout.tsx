import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Toast from "react-native-toast-message";
import AuthSplash from "@/components/AuthSplash";
import { toastConfig } from "@/components/ToastConfig";
import { usePushNotifications } from "@/lib/usePushNotifications";

function RootNavigation() {
  const { loading } = useAuth();

  // Registers this device's push token for the signed-in user and routes
  // notification taps. Must be called before the early return: hooks cannot be
  // conditional, and the token registration has to survive the splash screen
  // swap below.
  usePushNotifications();

  if (loading) {
    return <AuthSplash />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
      <Toast config={toastConfig} topOffset={54} />
    </AuthProvider>
  );
}
