import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/context/AuthContext";
import {
  configurePushPresentation,
  handleNotificationNavigation,
  registerPushToken,
  unregisterPushToken,
  type PushNotificationData,
} from "@/services/pushService";

/**
 * Wires push notifications into the auth lifecycle.
 *
 * Three concerns, deliberately separated:
 *   - presentation config runs once, at mount;
 *   - token registration follows the signed-in user (register on sign-in and
 *     on every app start, deactivate the previous user's token on sign-out);
 *   - tap handling listens for responses, including the cold-start case
 *     where the app was killed and relaunched by a tap.
 */
export function usePushNotifications(): void {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // Tracks the last user we registered for, so signing out (or switching
  // accounts) deactivates the token that is about to be orphaned. Without
  // this, the next account to sign in on this device keeps receiving the
  // previous account's notifications.
  const registeredUserId = useRef<string | null>(null);

  // Notifications we have already navigated for. The cold-start response and
  // the live listener can both hand us the same notification; navigating twice
  // would push the same screen onto the stack twice.
  const handledNotificationIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    configurePushPresentation();
  }, []);

  useEffect(() => {
    const previous = registeredUserId.current;

    if (previous && previous !== userId) {
      void unregisterPushToken(previous);
    }

    registeredUserId.current = userId;

    if (!userId) return;

    // Fire-and-forget, and never throw into render: a failed token
    // registration must not block the signed-in app. registerPushToken
    // already logs expected cases (simulator, missing Firebase config) and
    // returns null for them, so this only fires on something unexpected —
    // log the message, not the whole object, to keep LogBox readable.
    void registerPushToken(userId).catch((err: unknown) => {
      console.warn(
        "Push token registration failed:",
        err instanceof Error ? err.message : String(err),
      );
    });
  }, [userId]);

  useEffect(() => {
    let disposed = false;
    let coldStartTimer: ReturnType<typeof setTimeout> | undefined;

    const navigateFor = (data: PushNotificationData | undefined, id: string) => {
      if (disposed) return;
      if (handledNotificationIds.current.has(id)) return;
      handledNotificationIds.current.add(id);
      // A tap arriving before the navigator is ready (or for an unknown
      // route) must never crash the app — drop it and stay put.
      try {
        handleNotificationNavigation(data);
      } catch (err) {
        console.warn(
          "Notification navigation failed:",
          err instanceof Error ? err.message : String(err),
        );
      }
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const notification = response.notification;
        navigateFor(
          notification.request.content.data as PushNotificationData | undefined,
          notification.request.identifier,
        );
      },
    );

    // Cold start: if a tap launched the app, the response already exists by
    // the time this effect runs, and no listener was mounted to catch it.
    // The delay gives expo-router a tick to mount the navigator — pushing
    // before that silently drops the navigation.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (disposed || !response) return;
      const notification = response.notification;
      coldStartTimer = setTimeout(() => {
        navigateFor(
          notification.request.content.data as PushNotificationData | undefined,
          notification.request.identifier,
        );
      }, 500);
    });

    return () => {
      disposed = true;
      if (coldStartTimer) clearTimeout(coldStartTimer);
      subscription.remove();
    };
  }, []);
}
