import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useCallback, useState } from "react";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { followService, SuggestedUser } from "@/services/followService";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { colors } from "@/constants/theme";

const SafeAreaView = styled(RNSafeAreaView);

type TabType = "followers" | "following";

export default function FollowList() {
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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prevFollowing = user.is_following;
    const nextFollowing = !prevFollowing;

    // Optimistic update in both lists
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
      // Rollback
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

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.slate[900]} />
          </TouchableOpacity>
          <View>
            <Text className="text-xl font-bold uppercase tracking-tighter text-blue-600">
              Connections
            </Text>
            {username && (
              <Text className="text-xs text-slate-400">@{username}</Text>
            )}
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-slate-200 bg-white">
        <TouchableOpacity
          onPress={() => setActiveTab("followers")}
          className={`flex-1 flex-row items-center justify-center gap-2 py-3.5 border-b-2 ${
            activeTab === "followers"
              ? "border-blue-600"
              : "border-transparent"
          }`}
        >
          <Text
            className={`font-bold text-sm ${
              activeTab === "followers" ? "text-blue-600" : "text-slate-500"
            }`}
          >
            Followers
          </Text>
          <View
            className={`px-2 py-0.5 rounded-full ${
              activeTab === "followers" ? "bg-blue-100" : "bg-slate-100"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === "followers" ? "text-blue-600" : "text-slate-500"
              }`}
            >
              {followers.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab("following")}
          className={`flex-1 flex-row items-center justify-center gap-2 py-3.5 border-b-2 ${
            activeTab === "following"
              ? "border-blue-600"
              : "border-transparent"
          }`}
        >
          <Text
            className={`font-bold text-sm ${
              activeTab === "following" ? "text-blue-600" : "text-slate-500"
            }`}
          >
            Following
          </Text>
          <View
            className={`px-2 py-0.5 rounded-full ${
              activeTab === "following" ? "bg-blue-100" : "bg-slate-100"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === "following" ? "text-blue-600" : "text-slate-500"
              }`}
            >
              {following.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View className="px-5 pt-3 pb-2">
        <View className="flex-row items-center bg-white rounded-2xl px-4 py-2.5 border border-slate-200 shadow-sm">
          <Ionicons name="search-outline" size={18} color={colors.slate[400]} />
          <TextInput
            placeholder={`Search ${activeTab}...`}
            className="flex-1 ml-3 text-base text-slate-800"
            placeholderTextColor={colors.slate[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={colors.slate[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List Content */}
      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.blue[600]} />
        </View>
      ) : filteredList.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="people-outline" size={48} color={colors.slate[300]} />
          <Text className="text-lg font-semibold text-slate-900 mt-4">
            No {activeTab} yet
          </Text>
          <Text className="text-slate-500 text-center mt-2">
            {activeTab === "followers"
              ? "When someone follows this profile, they will appear here."
              : "When this profile follows creators, they will appear here."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30, paddingTop: 6 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.blue[600]}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: "/(pages)/userProfile",
                  params: { userId: item.id },
                })
              }
              className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-3.5 mb-2.5 border border-slate-200/70 shadow-sm"
            >
              <View className="flex-row items-center gap-3.5 flex-1 pr-3">
                <View className="h-12 w-12 rounded-full overflow-hidden bg-slate-100 items-center justify-center border border-slate-200">
                  {item.avatar_url ? (
                    <Image
                      source={{ uri: item.avatar_url }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Image
                      source={require("@/assets/homeIcons/profileUser.png")}
                      className="h-7 w-7"
                      resizeMode="contain"
                    />
                  )}
                </View>

                <View className="flex-1">
                  <Text className="text-base font-bold text-slate-900 leading-tight">
                    {item.full_name || item.username}
                  </Text>
                  <Text className="text-xs text-slate-400 mt-0.5">
                    @{item.username}
                  </Text>
                  {item.bio ? (
                    <Text className="text-xs text-slate-500 mt-1" numberOfLines={1}>
                      {item.bio}
                    </Text>
                  ) : null}
                </View>
              </View>

              <TouchableOpacity
                onPress={() => handleToggleFollow(item)}
                disabled={togglingIds[item.id]}
                activeOpacity={0.7}
                className={`px-4 py-1.5 rounded-xl items-center justify-center ${
                  item.is_following
                    ? "bg-slate-100 border border-slate-300"
                    : "bg-blue-600"
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    item.is_following ? "text-slate-700" : "text-white"
                  }`}
                >
                  {item.is_following ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
