import { Stack } from "expo-router";
import { AuthProvider } from "@/context/AuthContext";
import Toast from "react-native-toast-message";
import { toastConfig } from "@/components/ToastConfig";
import { usePushNotifications } from "@/lib/usePushNotifications";

function RootNavigation() {
  // Registers this device's push token for the signed-in user and routes
  // notification taps.
  usePushNotifications();

  // NOTE: this must ALWAYS render the Stack, even while auth is still
  // loading. Conditionally swapping between a splash screen and the Stack
  // (e.g. `if (loading) return <AuthSplash />`) leaves expo-router's linking
  // subscription with no mounted navigator when the initial URL resolves,
  // which trips React's "state update on a component that hasn't mounted
  // yet" warning. Auth gating lives one level down instead: app/index.tsx
  // and each group layout render <AuthSplash /> while loading and redirect
  // once the session is known.
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
