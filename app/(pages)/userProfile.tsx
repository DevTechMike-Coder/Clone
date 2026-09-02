import { styled } from "nativewind";
import {
  Alert,
  Image,
  Modal,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import {
  SafeAreaView as RNSafeAreaView,
} from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from "@/context/AuthContext";
import { profileService } from "@/services/profileService";
import { Post, postService } from "@/services/postService";
import PostGridThumbnail from "@/components/PostGridThumbnail";
import { repostService } from "@/services/repostService";
import { followService, UserStats } from "@/services/followService";
import { chatService } from "@/services/chatService";
import { moderationService } from "@/services/moderationService";
import ReportSheet from "@/components/modal/ReportSheet";
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { colors } from "@/constants/theme";

const SafeAreaView = styled(RNSafeAreaView);

export default function UserProfile() {
  const { user: authUser } = useAuth();
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
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const [profileData, userPosts, userReposts, userStats, followingStatus, blockedStatus] = await Promise.all([
        profileService.getProfile(userId),
        postService.getPostsByUser(userId),
        repostService.getRepostedPosts(userId),
        followService.getUserStats(userId),
        followService.checkIsFollowing(userId),
        moderationService.isBlocked(userId),
      ]);
      setProfile(profileData);
      setPosts(userPosts);
      setReposts(userReposts);
      setStats(userStats);
      setIsFollowing(followingStatus);
      setIsBlocked(blockedStatus);
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

  const handleBlockToggle = async () => {
    if (!userId || blockLoading) return;
    const username = profile?.username ?? "this user";

    const doToggle = async () => {
      setBlockLoading(true);
      try {
        if (isBlocked) {
          await moderationService.unblockUser(userId);
          setIsBlocked(false);
          Toast.show({ type: "success", text1: `Unblocked @${username}` });
          fetchProfile();
        } else {
          await moderationService.blockUser(userId);
          setIsBlocked(true);
          Toast.show({
            type: "success",
            text1: `Blocked @${username}`,
            text2: "You won't see each other's content anymore.",
          });
          router.back();
        }
      } catch (error: any) {
        Toast.show({
          type: "error",
          text1: "Action failed",
          text2: error?.message || "Please try again.",
        });
      } finally {
        setBlockLoading(false);
      }
    };

    if (isBlocked) {
      doToggle();
    } else {
      Alert.alert(
        "Block user",
        `Block @${username}? They won't be able to find your profile or posts, and you'll stop seeing theirs.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Block", style: "destructive", onPress: doToggle },
        ]
      );
    }
  };

  const handleToggleFollow = async () => {
    if (!userId || isOwnProfile || followLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const prevIsFollowing = isFollowing;
    const nextIsFollowing = !prevIsFollowing;

    // 1. Optimistic Update
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

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Header Row */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.slate[900]} />
          </TouchableOpacity>
          <Text className="text-xl font-bold uppercase tracking-tighter text-blue-600">
            {isOwnProfile ? "My Profile" : "Profile"}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View className="flex items-center pt-4">
          {loading ? (
            <ActivityIndicator size="large" color={colors.blue[600]} />
          ) : (
            <>
              <View className="w-24 h-24 rounded-full bg-white dark:bg-slate-900 items-center justify-center border-2 border-blue-600 overflow-hidden">
                {profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Image
                    source={require("@/assets/homeIcons/profileUser.png")}
                    className="w-14 h-14"
                    resizeMode="contain"
                  />
                )}
              </View>

              <View className="items-center pt-2">
                <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
                  {profile?.full_name || "User"}
                </Text>
                {profile?.username && (
                  <Text className="text-sm text-slate-500 dark:text-slate-400">
                    @{profile.username}
                  </Text>
                )}
              </View>
            </>
          )}
        </View>

        {/* Bio & Social Links */}
        <View className="p-5 flex-col items-center justify-center">
          <Text className="text-base text-slate-500 dark:text-slate-400">
            {profile?.bio || "No bio"}
          </Text>

          {profile?.website && (
            <View className="flex-row items-center gap-2 mt-2">
              <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(profile.website.startsWith('http') ? profile.website : `https://${profile.website}`)}>
                <Text className="text-blue-600 font-medium">
                  {profile.website.replace(/^https?:\/\//, '')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stats Row */}
        <View className="flex-row items-center justify-center gap-1 py-4">
          <View className="items-center px-3 py-1">
            <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.postsCount}</Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400">Posts</Text>
          </View>

          <View className="h-5 w-px bg-slate-300" />

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
            className="items-center px-3 py-1"
          >
            <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.followingCount}</Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400">Following</Text>
          </TouchableOpacity>

          <View className="h-5 w-px bg-slate-300" />

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
            className="items-center px-3 py-1"
          >
            <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.followersCount}</Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400">Followers</Text>
          </TouchableOpacity>

          <View className="h-5 w-px bg-slate-300" />

          <View className="items-center px-3 py-1">
            <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.likesCount}</Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400">Likes</Text>
          </View>
        </View>

        {/* Action Buttons (Follow/Message) */}
        {!isOwnProfile && (
          <View className="flex-row px-5 gap-3 mb-6">
            <TouchableOpacity
              onPress={handleToggleFollow}
              disabled={followLoading}
              activeOpacity={0.8}
              className={`flex-1 h-11 rounded-xl items-center justify-center shadow-sm ${
                isFollowing
                  ? "bg-slate-100 dark:bg-slate-800 border border-slate-300"
                  : "bg-blue-600"
              }`}
            >
              <Text
                className={`font-bold ${
                  isFollowing ? "text-slate-800 dark:text-slate-100" : "text-white"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
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
              disabled={messageLoading}
              activeOpacity={0.8}
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 h-11 rounded-xl items-center justify-center shadow-sm"
            >
              {messageLoading ? (
                <ActivityIndicator size="small" color={colors.blue[600]} />
              ) : (
                <Text className="text-slate-900 dark:text-slate-50 font-bold">Message</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setOverflowOpen(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="More actions"
              className="h-11 w-11 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl items-center justify-center shadow-sm"
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={20}
                color={colors.slate[500]}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* More-actions sheet: Report / Block */}
        <Modal
          transparent
          visible={overflowOpen}
          animationType="fade"
          onRequestClose={() => setOverflowOpen(false)}
        >
          <View className="flex-1 bg-black/45 justify-end">
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => setOverflowOpen(false)}
              accessibilityLabel="Dismiss actions"
            />
            <View className="bg-white dark:bg-slate-900 rounded-t-3xl border border-slate-100 dark:border-slate-800 px-6 pt-4 pb-10">
              <View className="items-center mb-4">
                <View className="w-12 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
              </View>

              <TouchableOpacity
                className="flex-row items-center gap-4 py-3"
                onPress={() => {
                  setOverflowOpen(false);
                  setReportOpen(true);
                }}
              >
                <Ionicons name="flag-outline" size={22} color={colors.red[500]} />
                <Text className="text-base font-medium text-slate-800 dark:text-slate-100">
                  Report @{profile?.username ?? "user"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center gap-4 py-3"
                onPress={() => {
                  setOverflowOpen(false);
                  handleBlockToggle();
                }}
              >
                <Ionicons
                  name={isBlocked ? "person-add-outline" : "person-remove-outline"}
                  size={22}
                  color={colors.red[500]}
                />
                <Text className="text-base font-medium text-red-500">
                  {isBlocked ? "Unblock" : "Block"} @
                  {profile?.username ?? "user"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setOverflowOpen(false)}
                className="mt-3 h-12 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
              >
                <Text className="font-semibold text-slate-700 dark:text-slate-200">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <ReportSheet
          visible={reportOpen}
          userId={userId}
          onClose={() => setReportOpen(false)}
        />

        {/* Tabs */}
        <View className="flex-row border-b border-slate-200 dark:border-slate-700">
          <TouchableOpacity
            onPress={() => setActiveTab("overview")}
            accessibilityRole="tab"
            accessibilityLabel="Posts"
            accessibilityState={{ selected: activeTab === "overview" }}
            className={`flex-1 items-center py-3 border-b-2 ${
              activeTab === "overview" ? "border-blue-600" : "border-transparent"
            }`}
          >
            <Image
              source={require("@/assets/homeIcons/overview.png")}
              className="w-5 h-5"
              resizeMode="contain"
              style={{
                tintColor: activeTab === "overview" ? colors.blue[600] : colors.slate[500],
              }}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("repeat")}
            accessibilityRole="tab"
            accessibilityLabel="Reposts"
            accessibilityState={{ selected: activeTab === "repeat" }}
            className={`flex-1 items-center py-3 border-b-2 ${
              activeTab === "repeat" ? "border-blue-600" : "border-transparent"
            }`}
          >
            <Image
              source={require("@/assets/homeIcons/repeat.png")}
              className="w-5 h-5"
              resizeMode="contain"
              style={{
                tintColor: activeTab === "repeat" ? colors.blue[600] : colors.slate[500],
              }}
            />
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        <View className="min-h-[300px]">
          {profile?.is_private && !isOwnProfile && !isFollowing ? (
            <View className="items-center justify-center py-20 px-10">
              <Ionicons name="lock-closed-outline" size={48} color={colors.slate[300]} />
              <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50 mt-4">
                This account is private
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-center mt-2">
                Follow this account to see their posts.
              </Text>
            </View>
          ) : (
            <>
              {activeTab === "overview" && (
                posts.length > 0 ? (
                  <View className="flex-row flex-wrap">
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
                        className="w-1/3 aspect-square border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800"
                      >
                        <PostGridThumbnail post={post} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View className="items-center justify-center py-20 px-10">
                    <Ionicons name="document-text-outline" size={48} color={colors.slate[300]} />
                    <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50 mt-4">
                      No posts yet
                    </Text>
                    <Text className="text-slate-500 dark:text-slate-400 text-center mt-2">
                      This user hasn&apos;t posted anything yet.
                    </Text>
                  </View>
                )
              )}

              {activeTab === "repeat" && (
                reposts.length > 0 ? (
                  <View className="flex-row flex-wrap">
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
                        className="w-1/3 aspect-square border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800"
                      >
                        <PostGridThumbnail post={post} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View className="items-center justify-center py-20 px-10">
                    <Ionicons name="repeat-outline" size={48} color={colors.slate[300]} />
                    <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50 mt-4">
                      No reposts yet
                    </Text>
                    <Text className="text-slate-500 dark:text-slate-400 text-center mt-2">
                      This user hasn&apos;t reposted anything yet.
                    </Text>
                  </View>
                )
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
