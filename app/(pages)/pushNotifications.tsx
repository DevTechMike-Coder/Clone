import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { colors } from "@/constants/theme";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  notificationService,
  type NotificationPreferences,
} from "@/services/notificationService";
import {
  getPermissionState,
  registerPushToken,
  requestPermission,
  type PushPermissionState,
} from "@/services/pushService";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";

type ToggleKey = keyof NotificationPreferences;

type ToggleItem = {
  key: ToggleKey;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
};

const TOGGLES: ToggleItem[] = [
  {
    key: "push_follows",
    title: "New followers",
    subtitle: "When someone starts following you",
    icon: "person-add-outline",
  },
  {
    key: "push_messages",
    title: "Messages",
    subtitle: "When someone sends you a direct message",
    icon: "chatbubble-outline",
  },
  {
    key: "push_comments",
    title: "Comments",
    subtitle: "When someone comments on your post",
    icon: "chatbubble-ellipses-outline",
  },
  {
    key: "push_stories",
    title: "New stories",
    subtitle: "When someone you follow posts a story",
    icon: "play-circle-outline",
  },
  {
    key: "push_story_expiry",
    title: "Stories expiring",
    subtitle: "A story you haven't watched is about to disappear",
    icon: "timer-outline",
  },
  {
    key: "push_likes",
    title: "Likes",
    subtitle: "When someone likes your post",
    icon: "heart-outline",
  },
  {
    key: "push_reposts",
    title: "Reposts",
    subtitle: "When someone reposts your post",
    icon: "repeat-outline",
  },
];

const PERMISSION_COPY: Record<
  PushPermissionState,
  { tone: "ok" | "warn"; title: string; body: string }
> = {
  granted: {
    tone: "ok",
    title: "Push notifications are enabled",
    body: "Notifications will arrive on this device for anything you leave switched on below.",
  },
  denied: {
    tone: "warn",
    title: "Notifications are blocked",
    body: "You turned notifications off for Clone. Turn them back on in your device settings to get alerts.",
  },
  undetermined: {
    tone: "warn",
    title: "Notifications haven't been set up yet",
    body: "Allow notifications so we can tell you when someone follows you or sends you a message.",
  },
  unsupported: {
    tone: "warn",
    title: "Push notifications aren't available here",
    body: "Push notifications need a real device. Your preferences are still saved and will apply the next time you sign in on a phone.",
  },
};

const PushNotifications = () => {
  const { user } = useAuth();
  const { palette } = useTheme();

  const [prefs, setPrefs] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  const [permission, setPermission] =
    useState<PushPermissionState>("undetermined");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<ToggleKey | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [preferences, state] = await Promise.all([
          notificationService.getPreferences(),
          getPermissionState(),
        ]);
        if (!isMounted) return;
        setPrefs(preferences);
        setPermission(state);
      } catch (err) {
        console.error("Failed to load notification settings:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggle = async (key: ToggleKey, value: boolean) => {
    const previous = prefs;
    setPrefs((current) => ({ ...current, [key]: value }));
    setSavingKey(key);

    try {
      const saved = await notificationService.updatePreferences({ [key]: value });
      if (saved) setPrefs(saved);
    } catch (err) {
      setPrefs(previous);
      console.error("Failed to save notification preference:", err);
    } finally {
      setSavingKey(null);
    }
  };

  const handleEnableNotifications = async () => {
    const status = await requestPermission();
    setPermission(status);
    if (status === "granted" && user?.id) {
      await registerPushToken(user.id);
    }
  };

  const status = PERMISSION_COPY[permission];
  const masterOn = prefs.push_enabled;

  return (
    <Screen
      scrollable
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <ScreenHeader
        title="Push Notifications"
        showBack
        onBackPress={() => router.back()}
        borderBottom
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80 }}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : (
        <View>
          {/* Intro */}
          <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
            <Text variant="title">Push Notifications</Text>
            <Text
              variant="body"
              color="muted"
              style={{ marginTop: 6, lineHeight: 22 }}
            >
              Choose what reaches your phone. These settings control the alerts
              you receive — your inbox still keeps a record of everything.
            </Text>
          </View>

          {/* Device permission status */}
          <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
            <View
              style={{
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 12,
                backgroundColor:
                  status.tone === "ok"
                    ? palette.success + "1A"
                    : palette.warning + "1A",
                borderColor:
                  status.tone === "ok"
                    ? palette.success + "33"
                    : palette.warning + "33",
              }}
            >
              <Ionicons
                name={status.tone === "ok" ? "checkmark-circle" : "warning-outline"}
                size={22}
                color={status.tone === "ok" ? palette.success : palette.warning}
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text variant="headline" style={{ fontSize: 15 }}>
                  {status.title}
                </Text>
                <Text
                  variant="caption"
                  color="muted"
                  style={{ marginTop: 4, lineHeight: 18 }}
                >
                  {status.body}
                </Text>

                {permission === "undetermined" && (
                  <View style={{ marginTop: 12, alignSelf: "flex-start" }}>
                    <Button
                      title="Allow notifications"
                      variant="primary"
                      size="sm"
                      onPress={handleEnableNotifications}
                    />
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Master switch */}
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <Text
              variant="caption"
              weight="bold"
              color="muted"
              style={{
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 10,
                paddingHorizontal: 4,
              }}
            >
              All notifications
            </Text>

            <View
              style={{
                backgroundColor: palette.surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: palette.border,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 16,
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text variant="body" weight="semibold">
                    Pause all
                  </Text>
                  <Text variant="micro" color="muted" style={{ marginTop: 2 }}>
                    Silence every push without losing your choices below
                  </Text>
                </View>
                <Switch
                  value={!masterOn}
                  onValueChange={(v) => handleToggle("push_enabled", !v)}
                  trackColor={{ false: palette.border, true: palette.danger }}
                  thumbColor={colors.white}
                />
              </View>
            </View>
          </View>

          {/* Per-event switches */}
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <Text
              variant="caption"
              weight="bold"
              color="muted"
              style={{
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 10,
                paddingHorizontal: 4,
              }}
            >
              What you get notified about
            </Text>

            <View
              style={[
                {
                  backgroundColor: palette.surface,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: palette.border,
                  overflow: "hidden",
                },
                !masterOn && { opacity: 0.5 },
              ]}
              pointerEvents={masterOn ? "auto" : "none"}
            >
              {TOGGLES.map((item, index) => {
                const isLast = index === TOGGLES.length - 1;
                return (
                  <View
                    key={item.key}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 16,
                      borderBottomWidth: isLast ? 0 : 1,
                      borderBottomColor: palette.borderSubtle,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flex: 1,
                        paddingRight: 12,
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          backgroundColor: palette.accent + "1A",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name={item.icon}
                          size={20}
                          color={palette.accent}
                        />
                      </View>

                      <View style={{ flex: 1, marginLeft: 14 }}>
                        <Text variant="body" weight="semibold">
                          {item.title}
                        </Text>
                        <Text variant="micro" color="muted" style={{ marginTop: 2 }}>
                          {item.subtitle}
                        </Text>
                      </View>
                    </View>

                    <Switch
                      value={prefs[item.key]}
                      onValueChange={(v) => handleToggle(item.key, v)}
                      disabled={savingKey === item.key}
                      trackColor={{
                        false: palette.border,
                        true: palette.accent,
                      }}
                      thumbColor={colors.white}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          <Text
            variant="micro"
            color="muted"
            style={{
              paddingHorizontal: 24,
              marginTop: 16,
              lineHeight: 18,
            }}
          >
            Turning something off here stops it reaching your phone. It will
            still appear in your inbox.
          </Text>
        </View>
      )}
    </Screen>
  );
};

export default PushNotifications;
