import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

/**
 * Push notification delivery (Expo push service).
 *
 * Why the lazy `require()` and runtime gating:
 * `expo-notifications` remote-push support was removed from Expo Go
 * (SDK 53+). Importing/calling it there logs errors and throws on token
 * retrieval, so — exactly like `authService.loadGoogleSignin()` — we detect
 * the environment up front and never touch the native module in Expo Go or
 * on web. In a native development or production build the module is present
 * and registration runs normally.
 *
 * Flow:
 *   app boot            -> configure() sets the foreground handler (safe no-op in Expo Go)
 *   sign-in (AuthContext)-> registerDevice() asks permission, fetches the Expo
 *                          push token and upserts it into `public.push_tokens`
 *   sign-out (profile)  -> unregisterDevice() deletes this device's token row
 *   tap on notification -> addResponseListener() in app/_layout.tsx deep-links
 *
 * Server-side: a Database Webhook on `notifications` INSERT calls the
 * `send-push` edge function, which fans out to Expo's push API. See
 * PUSH_NOTIFICATIONS_SETUP.md.
 */

type NotificationsModule = typeof import("expo-notifications");

/** Payload convention carried in every push message's `data` field. */
export type PushNotificationData = {
  type?: "like" | "comment" | "follow" | "repost" | "message" | string;
  postId?: string;
  conversationId?: string;
  fromUserId?: string;
};

const ANDROID_CHANNEL_ID = "default";

let cachedModule: NotificationsModule | null = null;
let handlerConfigured = false;
let cachedToken: string | null = null;

function isExpoGo(): boolean {
  // Same signals as authService: `expoGoConfig` only exists inside the
  // Expo Go app and `appOwnership` is "expo" there (null in dev/prod builds).
  return Constants.expoGoConfig != null || Constants.appOwnership === "expo";
}

export function isPushSupported(): boolean {
  return Platform.OS !== "web" && !isExpoGo();
}

function loadNotifications(): NotificationsModule {
  if (Platform.OS === "web") {
    throw new Error("Push notifications are only available in the mobile app.");
  }
  if (isExpoGo()) {
    throw new Error(
      "Push notifications are not available in Expo Go (remote push was " +
        "removed from Expo Go in SDK 53). Use a development or production " +
        "build — `eas build --profile development` — which is also what the " +
        "rest of this app (e.g. Google Sign-In) targets. See " +
        "PUSH_NOTIFICATIONS_SETUP.md."
    );
  }
  if (!cachedModule) {
    try {
      cachedModule = require("expo-notifications") as NotificationsModule;
    } catch {
      // fall through to the explicit error below
    }
    if (!cachedModule) {
      throw new Error(
        "expo-notifications is missing from this binary. Rebuild the dev " +
          "client after installing the package (`eas build --profile " +
          "development`). See PUSH_NOTIFICATIONS_SETUP.md."
      );
    }
  }
  return cachedModule;
}

function getProjectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    undefined
  );
}

export const pushNotificationService = {
  /**
   * Set the handler that decides how notifications appear while the app is
   * in the foreground. Safe to call multiple times and in Expo Go / web
   * (no-op there).
   */
  configure(): void {
    if (handlerConfigured || !isPushSupported()) return;
    try {
      const Notifications = loadNotifications();
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true, // deprecated alias kept for older binaries
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      handlerConfigured = true;
    } catch (error) {
      console.warn("[push] configure failed:", error);
    }
  },

  /**
   * Ask for permission (if needed), get the Expo push token and store it in
   * `public.push_tokens`. Returns the token, or null when unavailable /
   * denied. Never throws — push must never block sign-in.
   */
  async registerDevice(): Promise<string | null> {
    if (!isPushSupported()) return null;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const Notifications = loadNotifications();

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
          name: "Default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#2563EB",
        });
      }

      const existing = await Notifications.getPermissionsAsync();
      let status = existing.status;
      if (status !== "granted") {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }
      if (status !== "granted") {
        console.warn("[push] Notification permission not granted.");
        return null;
      }

      const projectId = getProjectId();
      if (!projectId) {
        console.warn(
          "[push] No EAS projectId found; cannot fetch Expo push token."
        );
        return null;
      }

      const { data: token } = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      cachedToken = token;

      const { error } = await supabase.from("push_tokens").upsert(
        {
          user_id: user.id,
          token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,token" }
      );
      if (error) {
        console.warn("[push] Failed to store push token:", error.message);
      }
      return token;
    } catch (error) {
      console.warn("[push] registerDevice failed:", error);
      return null;
    }
  },

  /**
   * Remove this device's token. Call BEFORE `signOut()` — RLS only lets the
   * owner delete their rows, so it must run while the session is valid.
   */
  async unregisterDevice(): Promise<void> {
    if (!isPushSupported()) return;
    try {
      const Notifications = loadNotifications();
      let token = cachedToken;
      if (!token) {
        const projectId = getProjectId();
        if (!projectId) return;
        const { data } = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        token = data;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("push_tokens")
        .delete()
        .eq("user_id", user.id)
        .eq("token", token);
      cachedToken = null;
    } catch (error) {
      console.warn("[push] unregisterDevice failed:", error);
    }
  },

  /**
   * Subscribe to notification taps (cold start and background). The handler
   * receives the push `data` payload. Returns an unsubscribe function;
   * no-ops in Expo Go / web.
   */
  addResponseListener(
    handler: (data: PushNotificationData) => void
  ): () => void {
    if (!isPushSupported()) return () => {};
    try {
      const Notifications = loadNotifications();
      const sub = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          handler(
            (response.notification.request.content.data ??
              {}) as PushNotificationData
          );
        }
      );
      return () => sub.remove();
    } catch (error) {
      console.warn("[push] addResponseListener failed:", error);
      return () => {};
    }
  },

  /** Set the iOS app-icon badge (Android ignores this). */
  async setBadgeCount(count: number): Promise<void> {
    if (!isPushSupported()) return;
    try {
      await loadNotifications().setBadgeCountAsync(count);
    } catch {
      /* badge is cosmetic — never surface */
    }
  },
};
