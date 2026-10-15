import React, { useState, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { profileService } from "@/services/profileService";
import { Post, postService } from "@/services/postService";
import PostGridThumbnail from "@/components/PostGridThumbnail";
import { repostService } from "@/services/repostService";
import { followService, UserStats } from "@/services/followService";
import { chatService } from "@/services/chatService";

import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { SegmentedTabs, TabItem } from "@/components/ui/SegmentedTabs";
import { EmptyState } from "@/components/ui/EmptyState";

export default function UserProfile() {
  const { user: authUser } = useAuth();
  const { palette } = useTheme();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const isOwnProfile = userId === authUser?.id;

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reposts, setReposts] = useState<Post[]>([]);
  const [stats, setStats] = useState<UserStats>({
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    likesCount: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "repeat">("overview");

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const [profileData, userPosts, userReposts, userStats, followingStatus] = await Promise.all([
        profileService.getProfile(userId),
        postService.getPostsByUser(userId),
        repostService.getRepostedPosts(userId),
        followService.getUserStats(userId),
        followService.checkIsFollowing(userId),
      ]);
      setProfile(profileData);
      setPosts(userPosts);
      setReposts(userReposts);
      setStats(userStats);
      setIsFollowing(followingStatus);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const handleToggleFollow = async () => {
    if (!userId || isOwnProfile || followLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const prevIsFollowing = isFollowing;
    const nextIsFollowing = !prevIsFollowing;

    // Optimistic Update
    setIsFollowing(nextIsFollowing);
    setStats((prev) => ({
      ...prev,
      followersCount: prev.followersCount + (nextIsFollowing ? 1 : -1),
    }));

    try {
      setFollowLoading(true);
      const res = await followService.toggleFollow(userId);
      Toast.show({
        type: "success",
        text1: res.following ? "Following" : "Unfollowed",
        text2: res.following
          ? `You are now following @${profile?.username || "user"}`
          : `You unfollowed @${profile?.username || "user"}`,
        visibilityTime: 2000,
      });
    } catch (error: any) {
      console.error("Error toggling follow:", error);
      // Rollback
      setIsFollowing(prevIsFollowing);
      setStats((prev) => ({
        ...prev,
        followersCount: prev.followersCount + (prevIsFollowing ? 1 : -1),
      }));
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to update follow status",
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const tabs: TabItem<"overview" | "repeat">[] = [
    { key: "overview", label: "Posts", badge: posts.length },
    { key: "repeat", label: "Reposts", badge: reposts.length },
  ];

  return (
    <Screen style={{ backgroundColor: palette.background }}>
      <ScreenHeader
        title={profile?.username ? `@${profile.username}` : "Profile"}
        showBack
        borderBottom
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Avatar & Info */}
        <View style={styles.heroBlock}>
          {loading ? (
            <ActivityIndicator size="large" color={palette.accent} style={{ paddingVertical: 24 }} />
          ) : (
            <>
              <Avatar
                url={profile?.avatar_url}
                name={profile?.full_name || profile?.username}
                size="2xl"
              />

              <View style={{ alignItems: "center", marginTop: 12 }}>
                <Text variant="headline" weight="bold" style={{ color: palette.text }}>
                  {profile?.full_name || "User"}
                </Text>
                {profile?.username && (
                  <Text variant="caption" style={{ color: palette.muted, marginTop: 2 }}>
                    @{profile.username}
                  </Text>
                )}
                {profile?.is_private && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Ionicons name="lock-closed" size={12} color={palette.muted} />
                    <Text variant="micro" style={{ color: palette.muted }}>
                      Private account
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {/* Bio & Social Links */}
        <View style={styles.bioBlock}>
          <Text variant="body" align="center" style={{ color: palette.muted, lineHeight: 20 }}>
            {profile?.bio || "No bio"}
          </Text>

          {profile?.website && (
            <TouchableOpacity
              onPress={() =>
                WebBrowser.openBrowserAsync(
                  profile.website.startsWith("http") ? profile.website : `https://${profile.website}`
                )
              }
              style={{ marginTop: 8 }}
            >
              <Text variant="bodyMedium" weight="semibold" style={{ color: palette.accent }}>
                {profile.website.replace(/^https?:\/\//, "")}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons (Follow / Message) */}
        {!isOwnProfile && (
          <View style={styles.actionsBlock}>
            <Button
              title={isFollowing ? "Following" : "Follow"}
              variant={isFollowing ? "outline" : "primary"}
              size="md"
              loading={followLoading}
              onPress={handleToggleFollow}
              style={{ flex: 1 }}
            />

            <Button
              title="Message"
              variant="secondary"
              size="md"
              loading={messageLoading}
              onPress={async () => {
                if (!userId || messageLoading) return;
                try {
                  setMessageLoading(true);
                  const convId = await chatService.getOrCreateDirectConversation(userId);
                  router.push({
                    pathname: "/(pages)/conversation",
                    params: { conversationId: convId, otherUserId: userId },
                  });
                } catch (error: any) {
                  console.error("Error starting chat:", error);
                  Toast.show({
                    type: "error",
                    text1: "Chat Error",
                    text2: error.message || "Failed to start conversation",
                  });
                } finally {
                  setMessageLoading(false);
                }
              }}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {/* Stats Row */}
        <View style={[styles.statsRow, { borderColor: palette.borderSubtle }]}>
          <View style={styles.statItem}>
            <Text variant="headline" weight="bold" style={{ color: palette.text }}>
              {stats.postsCount}
            </Text>
            <Text variant="caption" style={{ color: palette.muted, marginTop: 2 }}>
              Posts
            </Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: palette.borderSubtle }]} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (!userId) return;
              if (profile?.is_private && !isOwnProfile && !isFollowing) return;
              router.push({
                pathname: "/(pages)/followList",
                params: {
                  userId,
                  initialTab: "following",
                  username: profile?.username || "user",
                },
              });
            }}
            style={styles.statItem}
          >
            <Text variant="headline" weight="bold" style={{ color: palette.text }}>
              {stats.followingCount}
            </Text>
            <Text variant="caption" style={{ color: palette.muted, marginTop: 2 }}>
              Following
            </Text>
          </TouchableOpacity>

          <View style={[styles.statDivider, { backgroundColor: palette.borderSubtle }]} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (!userId) return;
              if (profile?.is_private && !isOwnProfile && !isFollowing) return;
              router.push({
                pathname: "/(pages)/followList",
                params: {
                  userId,
                  initialTab: "followers",
                  username: profile?.username || "user",
                },
              });
            }}
            style={styles.statItem}
          >
            <Text variant="headline" weight="bold" style={{ color: palette.text }}>
              {stats.followersCount}
            </Text>
            <Text variant="caption" style={{ color: palette.muted, marginTop: 2 }}>
              Followers
            </Text>
          </TouchableOpacity>

          <View style={[styles.statDivider, { backgroundColor: palette.borderSubtle }]} />

          <View style={styles.statItem}>
            <Text variant="headline" weight="bold" style={{ color: palette.text }}>
              {stats.likesCount}
            </Text>
            <Text variant="caption" style={{ color: palette.muted, marginTop: 2 }}>
              Likes
            </Text>
          </View>
        </View>

        {/* Segmented Tabs */}
        <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 12 }}>
          <SegmentedTabs<"overview" | "repeat">
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
          />
        </View>

        {/* Content Area */}
        <View style={{ minHeight: 300 }}>
          {profile?.is_private && !isOwnProfile && !isFollowing ? (
            <EmptyState
              icon={<Ionicons name="lock-closed-outline" size={44} color={palette.muted} />}
              title="This account is private"
              description="Follow this account to see their posts and updates."
            />
          ) : (
            <>
              {activeTab === "overview" && (
                posts.length > 0 ? (
                  <View style={styles.gridContainer}>
                    {posts.map((post) => (
                      <TouchableOpacity
                        key={post.id}
                        activeOpacity={0.85}
                        onPress={() =>
                          router.push({
                            pathname: "/(pages)/viewPost",
                            params: { postId: post.id },
                          })
                        }
                        style={[styles.gridCell, { borderColor: palette.background }]}
                      >
                        <PostGridThumbnail post={post} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    icon={<Ionicons name="document-text-outline" size={44} color={palette.muted} />}
                    title="No posts yet"
                    description="This user hasn't posted anything yet."
                  />
                )
              )}

              {activeTab === "repeat" && (
                reposts.length > 0 ? (
                  <View style={styles.gridContainer}>
                    {reposts.map((post) => (
                      <TouchableOpacity
                        key={post.id}
                        activeOpacity={0.85}
                        onPress={() =>
                          router.push({
                            pathname: "/(pages)/viewPost",
                            params: { postId: post.id },
                          })
                        }
                        style={[styles.gridCell, { borderColor: palette.background }]}
                      >
                        <PostGridThumbnail post={post} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    icon={<Ionicons name="repeat-outline" size={44} color={palette.muted} />}
                    title="No reposts yet"
                    description="This user hasn't reposted anything yet."
                  />
                )
              )}
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroBlock: {
    alignItems: "center",
    paddingTop: 16,
  },
  bioBlock: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionsBlock: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 16,
    marginHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 22,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridCell: {
    width: "33.333%",
    aspectRatio: 1,
    borderWidth: 0.5,
    position: "relative",
  },
});

