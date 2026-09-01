import { styled } from "nativewind";
import {
  Image,
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
import { useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

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
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header Row */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
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
            <ActivityIndicator size="large" color="#2563EB" />
          ) : (
            <>
              <View className="w-24 h-24 rounded-full bg-white items-center justify-center border-2 border-blue-600 overflow-hidden">
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
                <Text className="text-lg font-semibold text-slate-900 tracking-tight">
                  {profile?.full_name || "User"}
                </Text>
                {profile?.username && (
                  <Text className="text-sm text-slate-500">
                    @{profile.username}
                  </Text>
                )}
              </View>
            </>
          )}
        </View>

        {/* Bio & Social Links */}
        <View className="p-5 flex-col items-center justify-center">
          <Text className="text-base text-slate-500">
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
            <Text className="text-2xl font-bold text-slate-800">{stats.postsCount}</Text>
            <Text className="text-sm text-slate-500">Posts</Text>
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
            <Text className="text-2xl font-bold text-slate-800">{stats.followingCount}</Text>
            <Text className="text-sm text-slate-500">Following</Text>
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
            <Text className="text-2xl font-bold text-slate-800">{stats.followersCount}</Text>
            <Text className="text-sm text-slate-500">Followers</Text>
          </TouchableOpacity>

          <View className="h-5 w-px bg-slate-300" />

          <View className="items-center px-3 py-1">
            <Text className="text-2xl font-bold text-slate-800">{stats.likesCount}</Text>
            <Text className="text-sm text-slate-500">Likes</Text>
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
                  ? "bg-slate-100 border border-slate-300"
                  : "bg-blue-600"
              }`}
            >
              <Text
                className={`font-bold ${
                  isFollowing ? "text-slate-800" : "text-white"
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
              className="flex-1 bg-white border border-slate-200 h-11 rounded-xl items-center justify-center shadow-sm"
            >
              {messageLoading ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Text className="text-slate-900 font-bold">Message</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Tabs */}
        <View className="flex-row border-b border-slate-200">
          <TouchableOpacity
            onPress={() => setActiveTab("overview")}
            className={`flex-1 items-center py-3 border-b-2 ${
              activeTab === "overview" ? "border-blue-600" : "border-transparent"
            }`}
          >
            <Image
              source={require("@/assets/homeIcons/overview.png")}
              className="w-5 h-5"
              resizeMode="contain"
              style={{
                tintColor: activeTab === "overview" ? "#2563EB" : "#64748B",
              }}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("repeat")}
            className={`flex-1 items-center py-3 border-b-2 ${
              activeTab === "repeat" ? "border-blue-600" : "border-transparent"
            }`}
          >
            <Image
              source={require("@/assets/homeIcons/repeat.png")}
              className="w-5 h-5"
              resizeMode="contain"
              style={{
                tintColor: activeTab === "repeat" ? "#2563EB" : "#64748B",
              }}
            />
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        <View className="min-h-[300px]">
          {profile?.is_private && !isOwnProfile && !isFollowing ? (
            <View className="items-center justify-center py-20 px-10">
              <Ionicons name="lock-closed-outline" size={48} color="#CBD5E1" />
              <Text className="text-lg font-semibold text-slate-900 mt-4">
                This account is private
              </Text>
              <Text className="text-slate-500 text-center mt-2">
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
                        className="w-1/3 aspect-square border border-slate-100 bg-slate-100"
                      >
                        <PostGridThumbnail post={post} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View className="items-center justify-center py-20 px-10">
                    <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
                    <Text className="text-lg font-semibold text-slate-900 mt-4">
                      No posts yet
                    </Text>
                    <Text className="text-slate-500 text-center mt-2">
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
                        className="w-1/3 aspect-square border border-slate-100 bg-slate-100"
                      >
                        <PostGridThumbnail post={post} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View className="items-center justify-center py-20 px-10">
                    <Ionicons name="repeat-outline" size={48} color="#CBD5E1" />
                    <Text className="text-lg font-semibold text-slate-900 mt-4">
                      No reposts yet
                    </Text>
                    <Text className="text-slate-500 text-center mt-2">
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
