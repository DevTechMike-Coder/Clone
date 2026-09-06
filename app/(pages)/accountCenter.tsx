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
import { profileService } from "@/services/profileService";
import { colors } from "@/constants/theme";

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

  const accountSettingItems = [
    {
      id: "personalDetails",
      title: "Personal details",
      subtitle: "Contact info, birthday, account info",
      icon: "person-outline" as const,
      iconColor: colors.blue[600],
      iconBg: colors.blue[50],
      route: "/(pages)/personalDetails",
    },
    {
      id: "passwordSecurity",
      title: "Password and security",
      subtitle: "Change password, 2FA, login activity",
      icon: "shield-checkmark-outline" as const,
      iconColor: colors.emerald[600],
      iconBg: "#ECFDF5",
      route: "/(pages)/passwordSecurity",
    },
    {
      id: "yourInformation",
      title: "Your information & permissions",
      subtitle: "Search history, download your data",
      icon: "file-tray-full-outline" as const,
      iconColor: colors.violet[600],
      iconBg: "#F5F3FF",
      route: "/(pages)/yourInformation",
    },
    {
      id: "accountOwnership",
      title: "Account ownership and control",
      subtitle: "Deactivation or deletion",
      icon: "person-remove-outline" as const,
      iconColor: colors.red[500],
      iconBg: "#FEF2F2",
      route: "/(pages)/accountOwnership",
    },
  ];

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
            tintColor={colors.blue[600]}
            colors={[colors.blue[600]]}
          />
        }
      >
        {/* Intro Banner */}
        <View className="px-5 pt-6 pb-4">
          <Text className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Accounts Center
          </Text>
          <Text className="text-sm text-slate-500 mt-1.5 leading-relaxed">
            Manage your connected experiences, personal details, and account
            security settings across Clone technologies.
          </Text>
        </View>

        {/* Profiles Section */}
        <View className="px-5 mt-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
            Profiles
          </Text>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(pages)/editProfile")}
            className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-3.5 flex-1 pr-3">
              {loading ? (
                <View className="w-14 h-14 rounded-full bg-slate-100 items-center justify-center">
                  <ActivityIndicator size="small" color={colors.blue[600]} />
                </View>
              ) : profile?.avatar_url ? (
                <ExpoImage
                  source={{ uri: profile.avatar_url }}
                  className="w-14 h-14 rounded-full bg-slate-100"
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View className="w-14 h-14 rounded-full bg-blue-100 items-center justify-center">
                  <Ionicons
                    name="person"
                    size={28}
                    color={colors.blue[600]}
                  />
                </View>
              )}

              <View className="flex-1">
                <Text
                  className="text-base font-bold text-slate-900 tracking-tight"
                  numberOfLines={1}
                >
                  {profile?.full_name || profile?.username || "Clone User"}
                </Text>
                <Text
                  className="text-xs text-slate-500 mt-0.5"
                  numberOfLines={1}
                >
                  @{profile?.username || "username"} • Clone
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-1">
              <Text className="text-xs font-semibold text-blue-600">
                Manage
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.slate[400]}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Account Settings List */}
        <View className="px-5 mt-6">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
            Account Settings
          </Text>

          <View className="bg-white rounded-2xl border border-slate-200/90 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {accountSettingItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => router.push(item.route as any)}
                className="flex-row items-center justify-between p-4 active:bg-slate-50"
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
                    <Text
                      className="text-xs text-slate-400 mt-0.5"
                      numberOfLines={1}
                    >
                      {item.subtitle}
                    </Text>
                  </View>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.slate[300]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info Note Card */}
        <View className="px-5 mt-6">
          <View className="bg-blue-50/70 rounded-2xl border border-blue-100 p-4">
            <View className="flex-row items-center gap-2 mb-1.5">
              <Ionicons
                name="information-circle"
                size={18}
                color={colors.blue[600]}
              />
              <Text className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                Security & Privacy
              </Text>
            </View>
            <Text className="text-xs text-blue-800/80 leading-relaxed">
              Settings you manage in Accounts Center apply across all connected
              services and profiles associated with this account.
            </Text>
          </View>
        </View>

        {/* Legal & Help Footer */}
        <View className="px-5 mt-8 items-center">
          <Text className="text-xs text-slate-400 tracking-tight">
            Clone Accounts Center • Version 1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountCenter;
