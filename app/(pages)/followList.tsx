import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import { followService, SuggestedUser } from "@/services/followService";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { SegmentedTabs, TabItem } from "@/components/ui/SegmentedTabs";
import { EmptyState } from "@/components/ui/EmptyState";

type TabType = "followers" | "following";

export default function FollowList() {
  const { user: authUser } = useAuth();
  const { palette } = useTheme();
  const { userId, initialTab, username } = useLocalSearchParams<{
    userId: string;
    initialTab?: TabType;
    username?: string;
  }>();

  const [activeTab, setActiveTab] = useState<TabType>(
    initialTab === "following" ? "following" : "followers"
  );
  const [followers, setFollowers] = useState<SuggestedUser[]>([]);
  const [following, setFollowing] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [togglingIds, setTogglingIds] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const [followersData, followingData] = await Promise.all([
        followService.getFollowers(userId),
        followService.getFollowing(userId),
      ]);
      setFollowers(followersData);
      setFollowing(followingData);
    } catch (error) {
      console.error("Error loading follow list:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleToggleFollow = async (user: SuggestedUser) => {
    if (togglingIds[user.id]) return;
    if (authUser?.id && user.id === authUser.id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prevFollowing = user.is_following;
    const nextFollowing = !prevFollowing;

    const updater = (list: SuggestedUser[]) =>
      list.map((u) =>
        u.id === user.id ? { ...u, is_following: nextFollowing } : u
      );

    setFollowers(updater);
    setFollowing(updater);
    setTogglingIds((prev) => ({ ...prev, [user.id]: true }));

    try {
      const res = await followService.toggleFollow(user.id);
      Toast.show({
        type: "success",
        text1: res.following ? "Following" : "Unfollowed",
        text2: res.following
          ? `You are now following @${user.username}`
          : `You unfollowed @${user.username}`,
        visibilityTime: 1800,
      });
    } catch (error: any) {
      console.error("Error toggling follow:", error);
      const rollback = (list: SuggestedUser[]) =>
        list.map((u) =>
          u.id === user.id ? { ...u, is_following: prevFollowing } : u
        );
      setFollowers(rollback);
      setFollowing(rollback);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to update follow",
      });
    } finally {
      setTogglingIds((prev) => ({ ...prev, [user.id]: false }));
    }
  };

  const currentList = activeTab === "followers" ? followers : following;
  const filteredList = currentList.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.full_name && u.full_name.toLowerCase().includes(q))
    );
  });

  const tabs: TabItem<TabType>[] = [
    { key: "followers", label: "Followers", badge: followers.length },
    { key: "following", label: "Following", badge: following.length },
  ];

  return (
    <Screen style={{ backgroundColor: palette.background }}>
      <ScreenHeader
        title={username ? `@${username}` : "Connections"}
        showBack
        borderBottom
      />

      {/* Tabs */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <SegmentedTabs<TabType>
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
        />
      </View>

      {/* Search Input */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <TextField
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon={<Ionicons name="search-outline" size={18} color={palette.muted} />}
          rightIcon={
            searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={18} color={palette.muted} />
              </TouchableOpacity>
            ) : undefined
          }
        />
      </View>

      {/* List Content */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={palette.accent} />
        </View>
      ) : filteredList.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="people-outline" size={44} color={palette.muted} />}
          title={`No ${activeTab} yet`}
          description={
            activeTab === "followers"
              ? "When someone follows this profile, they will appear here."
              : "When this profile follows creators, they will appear here."
          }
        />
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.primary}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: "/(pages)/userProfile",
                  params: { userId: item.id },
                })
              }
              style={[
                styles.userCard,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.borderSubtle,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, paddingRight: 12 }}>
                <Avatar
                  url={item.avatar_url}
                  name={item.full_name || item.username}
                  size="md"
                />

                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" weight="bold" style={{ color: palette.text }}>
                    {item.full_name || item.username}
                  </Text>
                  <Text variant="caption" style={{ color: palette.muted, marginTop: 2 }}>
                    @{item.username}
                  </Text>
                  {item.bio ? (
                    <Text variant="micro" style={{ color: palette.muted, marginTop: 2 }} numberOfLines={1}>
                      {item.bio}
                    </Text>
                  ) : null}
                </View>
              </View>

              {item.id !== authUser?.id && (
                <Button
                  title={item.is_following ? "Following" : "Follow"}
                  variant={item.is_following ? "outline" : "primary"}
                  size="sm"
                  loading={Boolean(togglingIds[item.id])}
                  onPress={() => handleToggleFollow(item)}
                />
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
});

