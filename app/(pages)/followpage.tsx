import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
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
import { EmptyState } from "@/components/ui/EmptyState";

const FollowPage = () => {
  const { palette } = useTheme();
  const { user: authUser } = useAuth();
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
    if (authUser?.id && user.id === authUser.id) return;

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
    <Screen>
      {/* Header */}
      <ScreenHeader
        title="Discover People"
        showBack
        onBackPress={() => router.back()}
        borderBottom
      />

      {/* Search Input */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <TextField
          placeholder="Search suggested creators..."
          leftIcon={
            <Ionicons name="search-outline" size={18} color={palette.muted} />
          }
          rightIcon={
            searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color={palette.muted} />
              </TouchableOpacity>
            ) : undefined
          }
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Section Subheading */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
        <Text
          variant="caption"
          color="muted"
          weight="bold"
          style={{
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          Suggested For You
        </Text>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No suggestions found"
          description={
            searchQuery
              ? "No creators match your search query."
              : "Try checking back later for more recommendations!"
          }
        />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
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
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: palette.surface,
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: palette.border,
              }}
            >
              {/* Avatar & User Details */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flex: 1,
                  marginRight: 12,
                }}
              >
                <Avatar
                  url={item.avatar_url}
                  name={item.full_name || item.username}
                  size={46}
                />

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="body" weight="semibold" numberOfLines={1}>
                    {item.full_name || item.username}
                  </Text>
                  <Text
                    variant="caption"
                    color="muted"
                    style={{ marginTop: 2 }}
                    numberOfLines={1}
                  >
                    @{item.username} • {item.followers_count} followers
                  </Text>
                  {item.bio ? (
                    <Text
                      variant="micro"
                      color="muted"
                      style={{ marginTop: 2 }}
                      numberOfLines={1}
                    >
                      {item.bio}
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Follow Button */}
              {item.id !== authUser?.id && (
                <Button
                  title={item.is_following ? "Following" : "Follow"}
                  variant={item.is_following ? "outline" : "primary"}
                  size="sm"
                  loading={togglingIds[item.id]}
                  onPress={() => handleToggleFollow(item)}
                />
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </Screen>
  );
};

export default FollowPage;
