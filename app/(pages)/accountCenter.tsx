import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { profileService } from "@/services/profileService";
import { ThemeMode, colors } from "@/constants/theme";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/ui/Avatar";
import { ListRow } from "@/components/ui/ListRow";

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
    fetchProfile();
  }, [fetchProfile]);

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
      route: "/(pages)/personalDetails",
    },
    {
      id: "passwordSecurity",
      title: "Password and security",
      subtitle: "Change password, 2FA, login activity",
      icon: "shield-checkmark-outline" as const,
      route: "/(pages)/passwordSecurity",
    },
    {
      id: "pushNotifications",
      title: "Push notifications",
      subtitle: "Followers, messages, stories, likes",
      icon: "notifications-outline" as const,
      route: "/(pages)/pushNotifications",
    },
    {
      id: "yourInformation",
      title: "Your information & permissions",
      subtitle: "Search history, download your data",
      icon: "file-tray-full-outline" as const,
      route: "/(pages)/yourInformation",
    },
    {
      id: "accountOwnership",
      title: "Account ownership and control",
      subtitle: "Deactivation or deletion",
      icon: "person-remove-outline" as const,
      route: "/(pages)/accountOwnership",
    },
  ];

  return (
    <Screen
      scrollable
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header */}
      <ScreenHeader
        title="Accounts Center"
        showBack
        onBackPress={() => router.back()}
        borderBottom
      />

      {/* Intro Banner */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
        <Text variant="title">Accounts Center</Text>
        <Text
          variant="body"
          color="muted"
          style={{ marginTop: 6, lineHeight: 22 }}
        >
          Manage your connected experiences, personal details, appearance, and
          account security settings across Clone technologies.
        </Text>
      </View>

      {/* Profiles Section */}
      <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
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
          Profiles
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/(pages)/editProfile")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: palette.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: palette.border,
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
            {loading ? (
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: palette.surfaceMuted,
                }}
              >
                <ActivityIndicator size="small" color={palette.primary} />
              </View>
            ) : (
              <Avatar
                url={profile?.avatar_url}
                name={profile?.full_name || profile?.username}
                size={52}
              />
            )}

            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text variant="body" weight="bold" numberOfLines={1}>
                {profile?.full_name || profile?.username || "Clone User"}
              </Text>
              <Text
                variant="caption"
                color="muted"
                style={{ marginTop: 2 }}
                numberOfLines={1}
              >
                @{profile?.username || "username"} • Clone
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text variant="caption" weight="semibold" color="accent">
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
          Appearance & Theme
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
          {themeOptions.map((opt, index) => {
            const isSelected = themePreference === opt.mode;
            const isLast = index === themeOptions.length - 1;

            return (
              <TouchableOpacity
                key={opt.mode}
                activeOpacity={0.7}
                onPress={() => setThemePreference(opt.mode)}
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
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isSelected
                        ? palette.primary + "1A"
                        : palette.surfaceMuted,
                    }}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={20}
                      color={isSelected ? palette.primary : palette.muted}
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text
                      variant="body"
                      weight={isSelected ? "bold" : "semibold"}
                      color={isSelected ? "accent" : "default"}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      variant="caption"
                      color="muted"
                      style={{ marginTop: 2 }}
                      numberOfLines={1}
                    >
                      {opt.description}
                    </Text>
                  </View>
                </View>

                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: isSelected
                      ? palette.primary
                      : palette.border,
                    backgroundColor: isSelected
                      ? palette.primary
                      : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
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
          Account Settings
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
          {accountSettingItems.map((item, idx) => (
            <ListRow
              key={item.id}
              title={item.title}
              subtitle={item.subtitle}
              icon={
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={palette.accent}
                />
              }
              onPress={() => router.push(item.route as any)}
              style={
                idx < accountSettingItems.length - 1
                  ? { borderBottomWidth: 1, borderBottomColor: palette.borderSubtle }
                  : undefined
              }
            />
          ))}
        </View>
      </View>

      {/* Info Card */}
      <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <View
          style={{
            borderRadius: 16,
            borderWidth: 1,
            padding: 16,
            backgroundColor: palette.surfaceMuted,
            borderColor: palette.border,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <Ionicons
              name="information-circle"
              size={18}
              color={palette.primary}
            />
            <Text
              variant="caption"
              weight="bold"
              style={{
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Security & Privacy
            </Text>
          </View>
          <Text variant="caption" color="muted" style={{ lineHeight: 18 }}>
            Settings you manage in Accounts Center apply across all connected
            services and profiles associated with this account.
          </Text>
        </View>
      </View>

      {/* Developer UI Gallery Link */}
      {__DEV__ && (
        <View style={{ paddingHorizontal: 20, marginTop: 16, alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.push("/(pages)/uiGallery")}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 16,
              borderRadius: 20,
              borderWidth: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderColor: palette.accent,
              backgroundColor: palette.surface,
            }}
          >
            <Ionicons name="color-palette-outline" size={16} color={palette.accent} />
            <Text variant="caption" weight="semibold" color="accent">
              Open UI Component Gallery
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Legal & Version Footer */}
      <View style={{ paddingHorizontal: 20, marginTop: 24, alignItems: "center" }}>
        <Text variant="micro" color="muted">
          Clone Accounts Center • Version 1.0.0
        </Text>
      </View>
    </Screen>
  );
};

export default AccountCenter;
