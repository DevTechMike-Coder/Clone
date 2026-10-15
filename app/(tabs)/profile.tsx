import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Dimensions,
  Modal,
  Alert,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
} from "react-native";
import { router, useNavigation, useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import { useAuth } from "@/context/AuthContext";
import { profileService } from "@/services/profileService";
import { Post, postService } from "@/services/postService";
import PostGridThumbnail from "@/components/PostGridThumbnail";
import { bookmarkService } from "@/services/bookmarkService";
import { repostService } from "@/services/repostService";
import { followService, UserStats } from "@/services/followService";
import { authService } from "@/services/authService";
import { storyService } from "@/services/storyService";
import { useTheme } from "@/context/ThemeContext";

import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { SegmentedTabs, TabItem } from "@/components/ui/SegmentedTabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { PressableScale } from "@/components/ui/PressableScale";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function Profile() {
  const { isDark, palette } = useTheme();
  const { user: authUser } = useAuth();
  const targetUserId = authUser?.id;
  const isOwnProfile = true;

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reposts, setReposts] = useState<Post[]>([]);
  const [bookmarks, setBookmarks] = useState<Post[]>([]);
  const [activeStoryCount, setActiveStoryCount] = useState(0);
  const [stats, setStats] = useState<UserStats>({
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
    likesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [postMenuPost, setPostMenuPost] = useState<Post | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "repeat" | "bookmark">("overview");

  const navigation = useNavigation();
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  const fetchProfile = useCallback(async () => {
    if (!targetUserId) return;
    try {
      setLoading(true);
      const [profileData, userPosts, userReposts, userBookmarks, userStats, storyCount] = await Promise.all([
        profileService.getProfile(targetUserId),
        postService.getPostsByUser(targetUserId),
        repostService.getRepostedPosts(targetUserId),
        bookmarkService.getBookmarkedPosts(targetUserId),
        followService.getUserStats(targetUserId),
        storyService.getActiveStoryCount(targetUserId),
      ]);
      setProfile(profileData);
      setPosts(userPosts);
      setReposts(userReposts);
      setBookmarks(userBookmarks);
      setStats(userStats);
      setActiveStoryCount(storyCount);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const handleTogglePrivate = async () => {
    if (!targetUserId || !profile || privacySaving) return;
    const nextValue = !profile.is_private;
    setProfile((prev: any) => (prev ? { ...prev, is_private: nextValue } : prev));
    setPrivacySaving(true);
    try {
      await profileService.updateProfile(targetUserId, { is_private: nextValue });
      Toast.show({
        type: "success",
        text1: nextValue ? "Account is private" : "Account is public",
        text2: nextValue
          ? "Only people who follow you can see your posts."
          : "Anyone can see your posts.",
      });
    } catch (error: any) {
      setProfile((prev: any) => (prev ? { ...prev, is_private: !nextValue } : prev));
      Toast.show({
        type: "error",
        text1: "Couldn't update privacy",
        text2: error.message || "Please try again.",
      });
    } finally {
      setPrivacySaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      router.replace("/");
      Toast.show({
        type: "success",
        text1: "Signed out",
        text2: "You have been successfully signed out.",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message,
      });
    }
  };

  const handleDeletePost = async (postId: string) => {
    setPostMenuPost(null);
    setDeletingId(postId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await postService.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setReposts((prev) => prev.filter((p) => p.id !== postId));
      setBookmarks((prev) => prev.filter((p) => p.id !== postId));
      setStats((s) => ({ ...s, postsCount: Math.max(0, s.postsCount - 1) }));
      Toast.show({
        type: "success",
        text1: "Post deleted",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Couldn't delete post",
        text2: error.message || "Please try again.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleShareProfile = async () => {
    if (!profile?.username) return;
    try {
      await Share.share({
        message: `Check out @${profile.username} on Clone!`,
      });
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: menuOpen ? { display: "none" } : undefined,
    });
  }, [menuOpen, navigation]);

  const openMenu = () => {
    setMenuOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setMenuOpen(false));
  };

  const openPostMenu = (post: Post) => setPostMenuPost(post);
  const closePostMenu = () => setPostMenuPost(null);

  const tabs: TabItem<"overview" | "repeat" | "bookmark">[] = [
    { key: "overview", label: "Posts", badge: posts.length },
    { key: "repeat", label: "Reposts", badge: reposts.length },
    { key: "bookmark", label: "Saved", badge: bookmarks.length },
  ];

  return (
    <Screen style={{ backgroundColor: palette.background }}>
      {/* Backdrop */}
      {menuOpen && (
        <TouchableOpacity
          onPress={closeMenu}
          activeOpacity={1}
          style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlay, zIndex: 10 }]}
        />
      )}

      {/* Settings Drawer Panel */}
      <Animated.View
        style={[
          styles.drawerPanel,
          {
            backgroundColor: palette.surface,
            borderLeftColor: palette.borderSubtle,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.drawerHeader,
            { borderBottomColor: palette.borderSubtle },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="settings-outline" size={20} color={palette.text} />
            <Text variant="headline" weight="bold" style={{ color: palette.text }}>
              Settings
            </Text>
          </View>

          <IconButton
            icon={<Ionicons name="close" size={20} color={palette.text} />}
            variant="ghost"
            size="sm"
            onPress={closeMenu}
            accessibilityLabel="Close settings"
          />
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text
            variant="micro"
            weight="semibold"
            style={{ color: palette.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}
          >
            Account & Appearance
          </Text>

          <TouchableOpacity
            onPress={() => {
              closeMenu();
              router.push("/(pages)/accountCenter");
            }}
            style={[styles.menuItem, { borderBottomColor: palette.borderSubtle }]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Ionicons name="person-circle-outline" size={20} color={palette.accent} />
              <Text variant="bodyMedium" style={{ color: palette.text }}>
                Accounts Center
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              closeMenu();
              router.push("/(pages)/accountCenter");
            }}
            style={[styles.menuItem, { borderBottomColor: palette.borderSubtle }]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Ionicons name="color-palette-outline" size={20} color={palette.accent} />
              <Text variant="bodyMedium" style={{ color: palette.text }}>
                Appearance & Theme
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleTogglePrivate}
            disabled={privacySaving}
            style={[styles.menuItem, { borderBottomColor: palette.borderSubtle }]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, paddingRight: 12 }}>
              <Ionicons name="lock-closed-outline" size={20} color={palette.muted} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium" style={{ color: palette.text }}>
                  Private account
                </Text>
                <Text variant="micro" style={{ color: palette.muted, marginTop: 2 }}>
                  Only followers can see your posts
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.togglePill,
                {
                  backgroundColor: profile?.is_private
                    ? palette.accent
                    : palette.surfaceMuted,
                },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  {
                    alignSelf: profile?.is_private ? "flex-end" : "flex-start",
                    backgroundColor: palette.onAccent,
                  },
                ]}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignOut}
            style={[styles.menuItem, { borderBottomWidth: 0, marginTop: 8 }]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Ionicons name="log-out-outline" size={20} color={palette.danger} />
              <Text variant="bodyMedium" weight="semibold" style={{ color: palette.danger }}>
                Sign Out
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Screen Header */}
      <ScreenHeader
        title={profile?.username ? `@${profile.username}` : "Profile"}
        showBack={false}
        rightAction={
          isOwnProfile ? (
            <IconButton
              icon={<Ionicons name="menu-outline" size={24} color={palette.text} />}
              variant="ghost"
              size="md"
              onPress={openMenu}
              accessibilityLabel="Open settings menu"
            />
          ) : undefined
        }
        borderBottom
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Profile Hero Block */}
        <View style={styles.heroBlock}>
          {loading ? (
            <ActivityIndicator size="large" color={palette.accent} style={{ paddingVertical: 24 }} />
          ) : (
            <>
              {/* Avatar with Story Ring and Add Story Button */}
              <View style={{ position: "relative" }}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    if (activeStoryCount > 0) {
                      router.push({
                        pathname: "/(pages)/storyViewer",
                        params: { initialUserId: targetUserId },
                      });
                    }
                  }}
                  disabled={activeStoryCount === 0}
                >
                  <Avatar
                    url={profile?.avatar_url}
                    name={profile?.full_name || profile?.username}
                    size="2xl"
                    hasStory={activeStoryCount > 0}
                    isStoryViewed={false}
                  />
                </TouchableOpacity>

                {/* Add Story Button Badge */}
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/(pages)/createNew",
                      params: { mode: "Story" },
                    })
                  }
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Add story"
                  style={[
                    styles.addStoryBadge,
                    {
                      backgroundColor: palette.accent,
                      borderColor: palette.background,
                    },
                  ]}
                >
                  <Ionicons name="add" size={16} color={palette.onAccent} />
                </TouchableOpacity>
              </View>

              {/* Names & Private Status */}
              <View style={{ alignItems: "center", marginTop: 12 }}>
                <Text variant="headline" weight="bold" style={{ color: palette.text }}>
                  {profile?.full_name || authUser?.email?.split("@")[0] || "User"}
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
            {profile?.bio || "No bio yet. Tap edit to add one!"}
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

        {/* Action Buttons */}
        <View style={styles.actionsBlock}>
          <Button
            title="Edit Profile"
            variant="secondary"
            size="md"
            onPress={() => router.push("/(pages)/editProfile")}
            style={{ flex: 1 }}
          />

          <Button
            title="New Post"
            variant="secondary"
            size="md"
            onPress={() => router.push("/(pages)/createNew")}
            style={{ flex: 1 }}
          />

          <IconButton
            icon={<Ionicons name="share-outline" size={20} color={palette.text} />}
            variant="filled"
            size="md"
            onPress={handleShareProfile}
            accessibilityLabel="Share profile"
          />
        </View>

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
              if (targetUserId) {
                router.push({
                  pathname: "/(pages)/followList",
                  params: {
                    userId: targetUserId,
                    initialTab: "following",
                    username: profile?.username || "user",
                  },
                });
              }
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
              if (targetUserId) {
                router.push({
                  pathname: "/(pages)/followList",
                  params: {
                    userId: targetUserId,
                    initialTab: "followers",
                    username: profile?.username || "user",
                  },
                });
              }
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
          <SegmentedTabs<"overview" | "repeat" | "bookmark">
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
          />
        </View>

        {/* Content Grids */}
        {activeTab === "overview" && (
          posts.length > 0 ? (
            <View style={styles.gridContainer}>
              {posts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  activeOpacity={0.85}
                  onLongPress={() => openPostMenu(post)}
                  onPress={() =>
                    router.push({
                      pathname: "/(pages)/viewPost",
                      params: { postId: post.id },
                    })
                  }
                  style={[styles.gridCell, { borderColor: palette.background }]}
                >
                  <PostGridThumbnail post={post} />
                  {deletingId === post.id && (
                    <View style={styles.deletingOverlay}>
                      <ActivityIndicator color={palette.onAccent} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <EmptyState
              icon={<Ionicons name="document-text-outline" size={44} color={palette.muted} />}
              title="No posts yet"
              description="Share your first moment with the world!"
              actionTitle={isOwnProfile ? "Create New Post" : undefined}
              onActionPress={isOwnProfile ? () => router.push("/(pages)/createNew") : undefined}
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
                  onLongPress={() => openPostMenu(post)}
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
              description="Posts you repost will appear here on your profile."
            />
          )
        )}

        {activeTab === "bookmark" && (
          bookmarks.length > 0 ? (
            <View style={styles.gridContainer}>
              {bookmarks.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  activeOpacity={0.85}
                  onLongPress={() => openPostMenu(post)}
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
              icon={<Ionicons name="bookmark-outline" size={44} color={palette.muted} />}
              title="No bookmarks yet"
              description="Save posts to watch or view them later."
            />
          )
        )}
      </ScrollView>

      {/* Post Options Modal */}
      <Modal
        transparent
        visible={Boolean(postMenuPost)}
        animationType="fade"
        onRequestClose={closePostMenu}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: palette.overlay }]}
          onPress={closePostMenu}
        >
          <Pressable
            style={[
              styles.modalSheet,
              {
                backgroundColor: palette.surface,
                borderColor: palette.borderSubtle,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View style={[styles.handleBar, { backgroundColor: palette.borderSubtle }]} />
            </View>

            {postMenuPost && (
              <View style={styles.postModalPreview}>
                <View style={[styles.postModalThumb, { backgroundColor: palette.surfaceMuted }]}>
                  <PostGridThumbnail post={postMenuPost} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" weight="bold" numberOfLines={1} style={{ color: palette.text }}>
                    {postMenuPost.caption || "Post"}
                  </Text>
                  <Text variant="caption" style={{ color: palette.muted, marginTop: 2 }}>
                    {postMenuPost.media_type === "video" ? "Video" : "Photo"}
                  </Text>
                </View>
              </View>
            )}

            <View style={{ gap: 4 }}>
              {postMenuPost && postMenuPost.user_id === targetUserId && (
                <TouchableOpacity
                  onPress={() => {
                    const id = postMenuPost.id;
                    closePostMenu();
                    Alert.alert(
                      "Delete Post?",
                      "This post will be permanently removed.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => handleDeletePost(id),
                        },
                      ]
                    );
                  }}
                  style={[styles.modalRow, { borderBottomColor: palette.borderSubtle }]}
                >
                  <Ionicons name="trash-outline" size={20} color={palette.danger} />
                  <Text variant="bodyMedium" weight="semibold" style={{ color: palette.danger }}>
                    Delete post
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => {
                  if (postMenuPost) {
                    router.push({
                      pathname: "/(pages)/viewPost",
                      params: { postId: postMenuPost.id },
                    });
                    closePostMenu();
                  }
                }}
                style={[styles.modalRow, { borderBottomColor: palette.borderSubtle }]}
              >
                <Ionicons name="eye-outline" size={20} color={palette.text} />
                <Text variant="bodyMedium" weight="medium" style={{ color: palette.text }}>
                  View post
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  if (postMenuPost) {
                    try {
                      await Share.share({
                        message: (postMenuPost.caption ? `${postMenuPost.caption}\n\n` : "") + postMenuPost.media_url,
                      });
                    } catch {
                      // ignore
                    }
                  }
                  closePostMenu();
                }}
                style={[styles.modalRow, { borderBottomColor: palette.borderSubtle }]}
              >
                <Ionicons name="share-outline" size={20} color={palette.text} />
                <Text variant="bodyMedium" weight="medium" style={{ color: palette.text }}>
                  Share post
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={closePostMenu}
                style={[styles.modalRow, { borderBottomWidth: 0, marginTop: 4 }]}
              >
                <Ionicons name="close-circle-outline" size={20} color={palette.muted} />
                <Text variant="bodyMedium" style={{ color: palette.muted }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  drawerPanel: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: "82%",
    borderLeftWidth: 1,
    zIndex: 20,
    elevation: 20,
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  togglePill: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  heroBlock: {
    alignItems: "center",
    paddingTop: 16,
  },
  addStoryBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    zIndex: 10,
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
    gap: 8,
    marginVertical: 8,
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
  deletingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
  },
  postModalPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  postModalThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    overflow: "hidden",
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

