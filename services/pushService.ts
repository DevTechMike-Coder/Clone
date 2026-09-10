import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

/**
 * Client half of push notifications.
 *
 * The server half (Postgres trigger -> Edge Function -> Expo Push API) is in
 * supabase/migrations and supabase/functions. This file's only jobs are:
 *   - ask for permission at a moment that makes sense (after sign-in),
 *   - keep the current device's Expo push token in `push_tokens`, and
 *   - route a tap on a notification to the screen it is about.
 *
 * It never sends a push. Doing that from the device would mean exposing other
 * users' tokens to the client, and would silently drop the notification
 * whenever the actor's app was offline.
 */

const DEVICE_ID_STORAGE_KEY = "clone.push_device_id";

/** Must match the channel used by the send-push-notification Edge Function. */
export const ANDROID_CHANNEL_ID = "default";

export type PushPermissionState = "granted" | "denied" | "undetermined" | "unsupported";

/** Mirrors the notification `type` column in Postgres. */
export type PushNotificationType =
  | "like"
  | "comment"
  | "follow"
  | "repost"
  | "message"
  | "story"
  | "story_expiring";

/** The `data` payload attached by the Edge Function. */
export type PushNotificationData = {
  type?: PushNotificationType;
  notificationId?: string;
  postId?: string;
  storyId?: string;
  conversationId?: string;
  fromUserId?: string;
};

const getEasProjectId = (): string | undefined =>
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

// Logged once per app launch: without Firebase configured, registerPushToken
// runs on every sign-in and every app start, and each attempt would otherwise
// print the same wall of text to the console.
let warnedMissingFirebase = false;

/**
 * How notifications behave while the app is in the foreground.
 *
 * Without this the OS drops pushes that arrive while the app is open, which
 * reads as "push notifications don't work" even when delivery is fine.
 * Badge is left off: the count is meaningless once the inbox shows the same
 * rows, and iOS badge clearing is a separate lifecycle to get right.
 */
export function configurePushPresentation(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // Android 8+ requires a channel before it will display anything at all.
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563EB",
    }).catch((err) => {
      console.warn("Failed to create Android notification channel:", err);
    });
  }
}

/**
 * A stable id for this app install.
 *
 * Not the Expo push token: that rotates, and using it as the identity would
 * leave an orphaned row behind on every rotation. Persisted in AsyncStorage so
 * it survives app restarts but not reinstalls — which is exactly the lifetime
 * we want, since a reinstall genuinely is a new device from our point of view.
 */
export async function getDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing) return existing;
  } catch {
    // Storage unavailable (private browsing / restricted device). Fall
    // through and use an in-memory id for this session.
  }

  const generated = Crypto.randomUUID();
  try {
    await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
  } catch {
    // Non-fatal: worst case we generate a new id next launch.
  }
  return generated;
}

export async function getPermissionState(): Promise<PushPermissionState> {
  // Simulators cannot register for remote notifications; asking there only
  // produces confusing failures.
  if (!Device.isDevice) return "unsupported";

  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

export async function requestPermission(): Promise<PushPermissionState> {
  if (!Device.isDevice) return "unsupported";

  const { status } = await Notifications.requestPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

/**
 * Fetch this device's Expo push token and upsert it for `userId`.
 *
 * Safe to call on every sign-in and every app start: the upsert is keyed on
 * (user_id, device_id), so a re-run refreshes `last_seen_at` on one row rather
 * than accumulating duplicates.
 *
 * Returns the token, or null when the device cannot or must not receive pushes
 * (simulator, permission denied, no EAS project id). Callers should treat null
 * as "not now", not as an error worth surfacing to the user.
 */
export async function registerPushToken(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    // Not an error — this is the normal case in a simulator.
    return null;
  }

  const permission = await getPermissionState();
  if (permission !== "granted") {
    return null;
  }

  const projectId = getEasProjectId();
  if (!projectId) {
    console.warn(
      "Push registration skipped: no EAS projectId found in app config.",
    );
    return null;
  }

  let token: string | undefined;
  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    token = tokenResult?.data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // The common Android case: expo-notifications needs Firebase (FCM) and
    // the native build has no google-services.json wired up, so there is no
    // FirebaseApp to mint a token from. This is a setup step the developer
    // hasn't done yet — not a user-facing error — so log one short,
    // actionable line instead of the raw native stack trace, and let the
    // app continue normally without pushes.
    if (/firebase|googleServicesFile|FirebaseApp|Firebase Messaging/i.test(message)) {
      if (!warnedMissingFirebase) {
        warnedMissingFirebase = true;
        console.warn(
          "Push notifications disabled: Android Firebase (FCM) is not configured " +
            "— add google-services.json and set android.googleServicesFile in app.json " +
            "(see PUSH_NOTIFICATIONS_SETUP.md, Step 0), then rebuild. The app works normally without it.",
        );
      }
      return null;
    }

    console.warn("Push token registration failed:", message);
    return null;
  }
  if (!token) return null;

  const deviceId = await getDeviceId();

  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: userId,
      token,
      device_id: deviceId,
      platform: Platform.OS === "ios" ? "ios" : "android",
      is_active: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id,device_id" },
  );

  if (error) {
    console.warn("Failed to save push token:", error.message);
    return null;
  }

  return token;
}

/**
 * Stop sending pushes to this device for `userId`.
 *
 * Called on sign-out. Deactivating rather than deleting keeps the row (and its
 * history) around, and means a sign-in/sign-out loop is a single row flip
 * instead of a delete-then-insert race.
 */
export async function unregisterPushToken(userId: string): Promise<void> {
  try {
    const deviceId = await getDeviceId();
    const { error } = await supabase
      .from("push_tokens")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("device_id", deviceId);

    if (error) {
      console.warn("Failed to deactivate push token:", error.message);
    }
  } catch (err) {
    console.warn("Failed to deactivate push token:", err);
  }
}

/**
 * Route a notification tap to the screen it refers to.
 *
 * Handles the cold-start case too: `addNotificationResponseReceivedListener`
 * fires after the response even when the app was killed, and expo-router
 * queues the navigation until the navigator is ready.
 */
export function handleNotificationNavigation(
  data: PushNotificationData | undefined,
): void {
  if (!data) return;

  switch (data.type) {
    case "follow":
      if (data.fromUserId) {
        router.push({
          pathname: "/(pages)/userProfile",
          params: { userId: data.fromUserId },
        });
      }
      return;

    case "message":
      if (data.conversationId) {
        router.push({
          pathname: "/(pages)/conversation",
          params: {
            conversationId: data.conversationId,
            ...(data.fromUserId ? { otherUserId: data.fromUserId } : {}),
          },
        });
      }
      return;

    case "story":
    case "story_expiring":
      if (data.fromUserId) {
        router.push({
          pathname: "/(pages)/storyViewer",
          params: { initialUserId: data.fromUserId },
        });
      }
      return;

    case "like":
    case "comment":
    case "repost":
      if (data.postId) {
        router.push({
          pathname: "/(pages)/viewPost",
          params: { postId: data.postId },
        });
      }
      return;

    default:
      // Unknown or missing payload: the inbox is the safest landing spot.
      router.push("/(pages)/inbox");
  }
}
