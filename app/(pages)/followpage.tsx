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
import React, { useCallback, useEffect, useState } from "react";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { followService, SuggestedUser } from "@/services/followService";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { colors } from "@/constants/theme";

const SafeAreaView = styled(RNSafeAreaView);

const FollowPage = () => {
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [togglingIds, setTogglingIds] = useState<Record<string, boolean>>({});

  const fetchSuggested = useCallback(async () => {
    try {
      const data = await followService.getSuggestedUsers(30);
      setUsers(data);
    } catch (error) {
      console.error("Error loading suggested users:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSuggested();
    }, [fetchSuggested])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSuggested();
  };

  const handleToggleFollow = async (user: SuggestedUser) => {
    if (togglingIds[user.id]) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const prevFollowing = user.is_following;
    const nextFollowing = !prevFollowing;

    // Optimistic Update
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id
          ? {
              ...u,
              is_following: nextFollowing,
              followers_count: u.followers_count + (nextFollowing ? 1 : -1),
            }
          : u
      )
    );

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
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? {
                ...u,
                is_following: prevFollowing,
                followers_count: u.followers_count + (prevFollowing ? 1 : -1),
              }
            : u
        )
      );
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to update follow",
      });
    } finally {
      setTogglingIds((prev) => ({ ...prev, [user.id]: false }));
    }
  };

  const filteredUsers = users.filter((u) => {
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
          <Text className="text-xl font-bold uppercase tracking-tighter text-blue-600">
            Discover People
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center bg-white rounded-2xl px-4 py-2.5 border border-slate-200 shadow-sm">
          <Ionicons name="search-outline" size={18} color={colors.slate[400]} />
          <TextInput
            placeholder="Search suggested creators..."
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

      {/* Title */}
      <View className="px-5 py-3">
        <Text className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Suggested For You
        </Text>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.blue[600]} />
        </View>
      ) : filteredUsers.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="people-outline" size={48} color={colors.slate[300]} />
          <Text className="text-lg font-semibold text-slate-900 mt-4">
            No suggestions found
          </Text>
          <Text className="text-slate-500 text-center mt-2">
            Try searching for another user or check back later!
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
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
              className="flex-row items-center justify-between bg-white rounded-2xl px-4 py-3.5 mb-3 border border-slate-200/70 shadow-sm"
            >
              {/* Avatar & User Details */}
              <View className="flex-row items-center gap-3.5 flex-1 pr-3">
                <View className="h-13 w-13 rounded-full overflow-hidden bg-slate-100 items-center justify-center border border-slate-200">
                  {item.avatar_url ? (
                    <Image
                      source={{ uri: item.avatar_url }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Image
                      source={require("@/assets/homeIcons/profileUser.png")}
                      className="h-8 w-8"
                      resizeMode="contain"
                    />
                  )}
                </View>

                <View className="flex-1">
                  <Text className="text-base font-bold text-slate-900 leading-tight">
                    {item.full_name || item.username}
                  </Text>
                  <Text className="text-xs text-slate-400 mt-0.5">
                    @{item.username} • {item.followers_count} followers
                  </Text>
                  {item.bio ? (
                    <Text
                      className="text-xs text-slate-500 mt-1"
                      numberOfLines={1}
                    >
                      {item.bio}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Follow Button */}
              <TouchableOpacity
                onPress={() => handleToggleFollow(item)}
                disabled={togglingIds[item.id]}
                activeOpacity={0.7}
                className={`px-4 py-2 rounded-xl items-center justify-center ${
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
};

export default FollowPage;
