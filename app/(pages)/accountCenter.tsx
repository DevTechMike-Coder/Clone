import React, { useEffect, useState, useCallback } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { profileService } from "@/services/profileService";
import { colors, ThemeMode } from "@/constants/theme";

const SafeAreaView = styled(RNSafeAreaView);

type UserProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

const AccountCenter = () => {
  const { user } = useAuth();
  const { themePreference, activeTheme, isDark, setThemePreference, palette } =
    useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const data = await profileService.getProfile(user.id);
      if (data) {
        setProfile(data);
      }
    } catch (err) {
      console.error("Failed to load profile in AccountCenter:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const data = await profileService.getProfile(user.id);
        if (isMounted && data) {
          setProfile(data);
        }
      } catch (err) {
        console.error("Failed to load profile in AccountCenter:", err);
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
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
  };

  const themeOptions: {
    mode: ThemeMode;
    label: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    {
      mode: "system",
      label: "Match System",
      description: `Adapts to device settings (${activeTheme === "dark" ? "Dark" : "Light"} active)`,
      icon: "phone-portrait-outline",
    },
    {
      mode: "light",
      label: "Light Mode",
      description: "Clean, crisp light background",
      icon: "sunny-outline",
    },
    {
      mode: "dark",
      label: "Dark Mode",
      description: "Deep dark surface with reduced glare",
      icon: "moon-outline",
    },
  ];

  const accountSettingItems = [
    {
      id: "personalDetails",
      title: "Personal details",
      subtitle: "Contact info, birthday, account info",
      icon: "person-outline" as const,
      iconColor: colors.blue[600],
      iconBg: isDark ? colors.blue[900] + "40" : colors.blue[50],
      route: "/(pages)/personalDetails",
    },
    {
      id: "passwordSecurity",
      title: "Password and security",
      subtitle: "Change password, 2FA, login activity",
      icon: "shield-checkmark-outline" as const,
      iconColor: colors.emerald[600],
      iconBg: isDark ? colors.emerald[900] + "40" : "#ECFDF5",
      route: "/(pages)/passwordSecurity",
    },
    {
      id: "pushNotifications",
      title: "Push notifications",
      subtitle: "Followers, messages, stories, likes",
      icon: "notifications-outline" as const,
      iconColor: colors.orange[500],
      iconBg: isDark ? colors.orange[900] + "40" : "#FFF7ED",
      route: "/(pages)/pushNotifications",
    },
    {
      id: "yourInformation",
      title: "Your information & permissions",
      subtitle: "Search history, download your data",
      icon: "file-tray-full-outline" as const,
      iconColor: colors.violet[600],
      iconBg: isDark ? colors.violet[900] + "40" : "#F5F3FF",
      route: "/(pages)/yourInformation",
    },
    {
      id: "accountOwnership",
      title: "Account ownership and control",
      subtitle: "Deactivation or deletion",
      icon: "person-remove-outline" as const,
      iconColor: colors.red[500],
      iconBg: isDark ? colors.red[900] + "40" : "#FEF2F2",
      route: "/(pages)/accountOwnership",
    },
  ];

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: palette.background }}
    >
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: palette.border }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="w-10 h-10 rounded-full items-center justify-center -ml-2"
          style={{
            backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
          }}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={isDark ? colors.slate[200] : colors.slate[800]}
          />
        </TouchableOpacity>

        <View className="items-center">
          <Text
            className="text-base font-bold tracking-tight"
            style={{ color: palette.text }}
          >
            Accounts Center
          </Text>
        </View>

        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }
      >
        {/* Intro Banner */}
        <View className="px-5 pt-6 pb-4">
          <Text
            className="text-2xl font-extrabold tracking-tight"
            style={{ color: palette.text }}
          >
            Accounts Center
          </Text>
          <Text
            className="text-sm mt-1.5 leading-relaxed"
            style={{ color: palette.muted }}
          >
            Manage your connected experiences, personal details, appearance, and
            account security settings across Clone technologies.
          </Text>
        </View>

        {/* Profiles Section */}
        <View className="px-5 mt-2">
          <Text
            className="text-xs font-bold uppercase tracking-wider mb-2.5 px-1"
            style={{ color: palette.muted }}
          >
            Profiles
          </Text>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(pages)/editProfile")}
            className="rounded-2xl p-4 flex-row items-center justify-between border"
            style={{
              backgroundColor: palette.surface,
              borderColor: palette.border,
            }}
          >
            <View className="flex-row items-center gap-3.5 flex-1 pr-3">
              {loading ? (
                <View
                  className="w-14 h-14 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: isDark
                      ? colors.slate[800]
                      : colors.slate[100],
                  }}
                >
                  <ActivityIndicator size="small" color={palette.primary} />
                </View>
              ) : profile?.avatar_url ? (
                <ExpoImage
                  source={{ uri: profile.avatar_url }}
                  className="w-14 h-14 rounded-full"
                  style={{
                    backgroundColor: isDark
                      ? colors.slate[800]
                      : colors.slate[100],
                  }}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View
                  className="w-14 h-14 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: isDark
                      ? colors.blue[950]
                      : colors.blue[100],
                  }}
                >
                  <Ionicons name="person" size={28} color={palette.primary} />
                </View>
              )}

              <View className="flex-1">
                <Text
                  className="text-base font-bold tracking-tight"
                  style={{ color: palette.text }}
                  numberOfLines={1}
                >
                  {profile?.full_name || profile?.username || "Clone User"}
                </Text>
                <Text
                  className="text-xs mt-0.5"
                  style={{ color: palette.muted }}
                  numberOfLines={1}
                >
                  @{profile?.username || "username"} • Clone
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-1">
              <Text
                className="text-xs font-semibold"
                style={{ color: palette.primary }}
              >
                Manage
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={palette.muted}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Appearance / Theme Section */}
        <View className="px-5 mt-6">
          <Text
            className="text-xs font-bold uppercase tracking-wider mb-2.5 px-1"
            style={{ color: palette.muted }}
          >
            Appearance & Theme
          </Text>

          <View
            className="rounded-2xl border overflow-hidden"
            style={{
              backgroundColor: palette.surface,
              borderColor: palette.border,
            }}
          >
            {themeOptions.map((opt, index) => {
              const isSelected = themePreference === opt.mode;
              const isLast = index === themeOptions.length - 1;

              return (
                <TouchableOpacity
                  key={opt.mode}
                  activeOpacity={0.7}
                  onPress={() => setThemePreference(opt.mode)}
                  className="flex-row items-center justify-between p-4"
                  style={{
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: palette.borderSubtle,
                  }}
                >
                  <View className="flex-row items-center gap-3.5 flex-1 pr-3">
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{
                        backgroundColor: isSelected
                          ? palette.primary + "20"
                          : isDark
                          ? colors.slate[800]
                          : colors.slate[100],
                      }}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={20}
                        color={isSelected ? palette.primary : palette.muted}
                      />
                    </View>

                    <View className="flex-1">
                      <Text
                        className="text-base font-semibold tracking-tight"
                        style={{
                          color: isSelected ? palette.primary : palette.text,
                        }}
                      >
                        {opt.label}
                      </Text>
                      <Text
                        className="text-xs mt-0.5"
                        style={{ color: palette.muted }}
                        numberOfLines={1}
                      >
                        {opt.description}
                      </Text>
                    </View>
                  </View>

                  <View
                    className="w-6 h-6 rounded-full border items-center justify-center"
                    style={{
                      borderColor: isSelected
                        ? palette.primary
                        : palette.border,
                      backgroundColor: isSelected
                        ? palette.primary
                        : "transparent",
                    }}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color={colors.white} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Account Settings List */}
        <View className="px-5 mt-6">
          <Text
            className="text-xs font-bold uppercase tracking-wider mb-2.5 px-1"
            style={{ color: palette.muted }}
          >
            Account Settings
          </Text>

          <View
            className="rounded-2xl border overflow-hidden"
            style={{
              backgroundColor: palette.surface,
              borderColor: palette.border,
            }}
          >
            {accountSettingItems.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => router.push(item.route as any)}
                className="flex-row items-center justify-between p-4"
                style={{
                  borderBottomWidth:
                    idx === accountSettingItems.length - 1 ? 0 : 1,
                  borderBottomColor: palette.borderSubtle,
                }}
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
                    <Text
                      className="text-base font-semibold tracking-tight"
                      style={{ color: palette.text }}
                    >
                      {item.title}
                    </Text>
                    <Text
                      className="text-xs mt-0.5"
                      style={{ color: palette.muted }}
                      numberOfLines={1}
                    >
                      {item.subtitle}
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={palette.muted}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info Note Card */}
        <View className="px-5 mt-6">
          <View
            className="rounded-2xl border p-4"
            style={{
              backgroundColor: isDark
                ? colors.blue[950] + "40"
                : colors.blue[50] + "B3",
              borderColor: isDark
                ? colors.blue[800] + "60"
                : colors.blue[100],
            }}
          >
            <View className="flex-row items-center gap-2 mb-1.5">
              <Ionicons
                name="information-circle"
                size={18}
                color={palette.primary}
              />
              <Text
                className="text-xs font-bold uppercase tracking-wide"
                style={{
                  color: isDark ? colors.blue[300] : colors.blue[900],
                }}
              >
                Security & Privacy
              </Text>
            </View>
            <Text
              className="text-xs leading-relaxed"
              style={{
                color: isDark ? colors.blue[200] : colors.blue[800],
              }}
            >
              Settings you manage in Accounts Center apply across all connected
              services and profiles associated with this account.
            </Text>
          </View>
        </View>

        {/* Legal & Help Footer */}
        <View className="px-5 mt-8 items-center">
          <Text
            className="text-xs tracking-tight"
            style={{ color: palette.muted }}
          >
            Clone Accounts Center • Version 1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountCenter;
