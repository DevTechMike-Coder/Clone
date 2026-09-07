import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
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
import { colors } from "@/constants/theme";

const SafeAreaView = styled(RNSafeAreaView);

type ToggleKey = keyof NotificationPreferences;

type ToggleItem = {
  key: ToggleKey;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  iconBg: string;
};

/**
 * Ordered by how much the user is likely to care. Likes and reposts sit at the
 * bottom because they are the two that default OFF — a follow changes your
 * account, a like on a week-old post does not, and only one of those is worth
 * interrupting someone for.
 */
const TOGGLES: ToggleItem[] = [
  {
    key: "push_follows",
    title: "New followers",
    subtitle: "When someone starts following you",
    icon: "person-add-outline",
    iconColor: "#9333EA",
    iconBg: "#F3E8FF",
  },
  {
    key: "push_messages",
    title: "Messages",
    subtitle: "When someone sends you a direct message",
    icon: "chatbubble-outline",
    iconColor: colors.blue[600],
    iconBg: colors.blue[50],
  },
  {
    key: "push_comments",
    title: "Comments",
    subtitle: "When someone comments on your post",
    icon: "chatbubble-ellipses-outline",
    iconColor: "#0EA5E9",
    iconBg: "#E0F2FE",
  },
  {
    key: "push_stories",
    title: "New stories",
    subtitle: "When someone you follow posts a story",
    icon: "play-circle-outline",
    iconColor: colors.emerald[600],
    iconBg: "#ECFDF5",
  },
  {
    key: "push_story_expiry",
    title: "Stories expiring",
    subtitle: "A story you haven't watched is about to disappear",
    icon: "timer-outline",
    iconColor: colors.orange[500],
    iconBg: "#FFF7ED",
  },
  {
    key: "push_likes",
    title: "Likes",
    subtitle: "When someone likes your post",
    icon: "heart-outline",
    iconColor: colors.red[500],
    iconBg: "#FEF2F2",
  },
  {
    key: "push_reposts",
    title: "Reposts",
    subtitle: "When someone reposts your post",
    icon: "repeat-outline",
    iconColor: colors.emerald[600],
    iconBg: "#ECFDF5",
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
    // Optimistic: the switch should never feel like it is waiting on a network
    // round-trip. Reverted below only if the write actually fails.
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
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="w-10 h-10 rounded-full items-center justify-center -ml-2 active:bg-slate-100"
        >
          <Ionicons name="arrow-back" size={24} color={colors.slate[800]} />
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-base font-bold text-slate-900 tracking-tight">
            Push Notifications
          </Text>
        </View>

        <View className="w-10" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.blue[600]} />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Intro */}
          <View className="px-5 pt-6 pb-4">
            <Text className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Push Notifications
            </Text>
            <Text className="text-sm text-slate-500 mt-1.5 leading-relaxed">
              Choose what reaches your phone. These settings control the alerts
              you receive — your inbox still keeps a record of everything.
            </Text>
          </View>

          {/* Device permission status */}
          <View className="px-5 mt-2">
            <View
              className="rounded-2xl p-4 border flex-row items-start gap-3"
              style={{
                backgroundColor: status.tone === "ok" ? "#ECFDF5" : "#FFFBEB",
                borderColor: status.tone === "ok" ? "#A7F3D0" : "#FDE68A",
              }}
            >
              <Ionicons
                name={status.tone === "ok" ? "checkmark-circle" : "warning-outline"}
                size={20}
                color={status.tone === "ok" ? colors.emerald[600] : "#D97706"}
                style={{ marginTop: 1 }}
              />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-900">
                  {status.title}
                </Text>
                <Text className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {status.body}
                </Text>

                {permission === "undetermined" && (
                  <TouchableOpacity
                    onPress={handleEnableNotifications}
                    className="mt-3 self-start rounded-xl px-4 py-2"
                    style={{ backgroundColor: colors.blue[600] }}
                  >
                    <Text className="text-xs font-bold text-white">
                      Allow notifications
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Master switch */}
          <View className="px-5 mt-6">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
              All notifications
            </Text>

            <View className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-1 pr-3">
                  <Text className="text-base font-semibold text-slate-800 tracking-tight">
                    Pause all
                  </Text>
                  <Text className="text-xs text-slate-400 mt-0.5">
                    Silence every push without losing your choices below
                  </Text>
                </View>
                <Switch
                  value={!masterOn}
                  onValueChange={(v) => handleToggle("push_enabled", !v)}
                  trackColor={{ false: colors.slate[200], true: colors.red[500] }}
                  thumbColor={colors.white}
                />
              </View>
            </View>
          </View>

          {/* Per-event switches */}
          <View className="px-5 mt-6">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
              What you get notified about
            </Text>

            <View
              className="bg-white rounded-2xl border border-slate-200/90 shadow-sm divide-y divide-slate-100 overflow-hidden"
              style={masterOn ? undefined : { opacity: 0.5 }}
              pointerEvents={masterOn ? "auto" : "none"}
            >
              {TOGGLES.map((item) => (
                <View
                  key={item.key}
                  className="flex-row items-center justify-between p-4"
                >
                  <View className="flex-row items-center gap-3.5 flex-1 pr-3">
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: item.iconBg }}
                    >
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={item.iconColor}
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-base font-semibold text-slate-800 tracking-tight">
                        {item.title}
                      </Text>
                      <Text className="text-xs text-slate-400 mt-0.5">
                        {item.subtitle}
                      </Text>
                    </View>
                  </View>

                  <Switch
                    value={prefs[item.key]}
                    onValueChange={(v) => handleToggle(item.key, v)}
                    disabled={savingKey === item.key}
                    trackColor={{
                      false: colors.slate[200],
                      true: colors.blue[600],
                    }}
                    thumbColor={colors.white}
                  />
                </View>
              ))}
            </View>
          </View>

          <Text className="px-6 mt-4 text-xs text-slate-400 leading-relaxed">
            Turning something off here stops it reaching your phone. It will
            still appear in your inbox.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default PushNotifications;
