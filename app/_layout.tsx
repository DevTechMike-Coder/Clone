import { useEffect } from "react";
import { router, Stack } from "expo-router";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Toast from "react-native-toast-message";
import AuthSplash from "@/components/AuthSplash";
import {
  pushNotificationService,
  PushNotificationData,
} from "@/services/pushNotificationService";

/** Route a push-notification tap to the right screen. */
function handlePushResponse(data: PushNotificationData) {
  try {
    if (data.type === "message" && data.conversationId) {
      router.push({
        pathname: "/(pages)/conversation",
        params: { conversationId: data.conversationId },
      });
    } else if (data.postId) {
      router.push({
        pathname: "/(pages)/viewPost",
        params: { postId: data.postId },
      });
    } else if (data.type === "follow" && data.fromUserId) {
      router.push({
        pathname: "/(pages)/userProfile",
        params: { userId: data.fromUserId },
      });
    }
  } catch (error) {
    console.warn("[push] navigation from notification failed:", error);
  }
}

function RootNavigation() {
  const { loading } = useAuth();

  useEffect(() => {
    // Foreground presentation handler + tap → deep-link. Both are guarded
    // no-ops in Expo Go / web (see pushNotificationService).
    pushNotificationService.configure();
    const unsubscribe = pushNotificationService.addResponseListener(
      handlePushResponse
    );
    return unsubscribe;
  }, []);

  if (loading) {
    return <AuthSplash />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigation />
        <Toast />
      </AuthProvider>
    </ThemeProvider>
  );
}
