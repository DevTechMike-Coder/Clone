import { styled } from "nativewind";
import {
  Image,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import {
  SafeAreaView as RNSafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router, useNavigation, useFocusEffect } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from "@/context/AuthContext";
import { profileService } from "@/services/profileService";
import { Post, postService } from "@/services/postService";
import { bookmarkService } from "@/services/bookmarkService";
import { repostService } from "@/services/repostService";
import { followService, UserStats } from "@/services/followService";
import { authService } from "@/services/authService";
import Toast from "react-native-toast-message";
import { useState, useEffect, useRef, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";

const SafeAreaView = styled(RNSafeAreaView);
const SCREEN_WIDTH = Dimensions.get("window").width;

export default function Profile() {
  const { user: authUser } = useAuth();
  // This is strictly the logged-in user's profile tab
  const targetUserId = authUser?.id;
  const isOwnProfile = true;

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reposts, setReposts] = useState<Post[]>([]);
  const [bookmarks, setBookmarks] = useState<Post[]>([]);
  const [stats, setStats] = useState<UserStats>({
    followersCount: 0,
    followingCount: 0,
    likesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "repeat" | "bookmark">("overview");
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

  const fetchProfile = useCallback(async () => {
    if (!targetUserId) return;
    try {
      setLoading(true);
      const [profileData, userPosts, userReposts, userBookmarks, userStats] = await Promise.all([
        profileService.getProfile(targetUserId),
        postService.getPostsByUser(targetUserId),
        repostService.getRepostedPosts(targetUserId),
        bookmarkService.getBookmarkedPosts(targetUserId),
        followService.getUserStats(targetUserId),
      ]);
      setProfile(profileData);
      setPosts(userPosts);
      setReposts(userReposts);
      setBookmarks(userBookmarks);
      setStats(userStats);
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

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: menuOpen
        ? { display: "none" }
        : {
            position: "absolute",
            bottom: Math.max(insets.bottom, 16),
            height: 70,
            marginHorizontal: 20,
            borderRadius: 20,
            borderTopWidth: 0,
            elevation: 0,
          },
    });
  }, [menuOpen, navigation, insets]);

  const openMenu = () => {
    setMenuOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setMenuOpen(false));
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Backdrop — closes menu when tapped */}
      {menuOpen && (
        <TouchableOpacity
          onPress={closeMenu}
          activeOpacity={1}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
          }}
        />
      )}

      {/* Sliding Drawer Panel */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "82%",
          backgroundColor: "#FFFFFF",
          zIndex: 20,
          transform: [{ translateX: slideAnim }],
          shadowColor: "#0F172A",
          shadowOffset: { width: -4, height: 0 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 20,
        }}
      >
        {/* Close Button */}
        <View className="px-5 pt-14 pb-4 flex-row items-center justify-between border-b border-slate-100">
          <View className="flex-row items-center gap-3">
            <Ionicons name="settings-outline" size={22} color="#0F172A" />
            <Text className="text-lg font-bold text-slate-900 tracking-tight">
              Settings
            </Text>
          </View>

          <TouchableOpacity
            onPress={closeMenu}
            className="w-9 h-9 rounded-full items-center justify-center"
          >
            <Image
              source={require("@/assets/homeIcons/delete.png")}
              className="w-4 h-4"
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Drawer Items */}
        <View className="px-5 pt-3">
          {/* Section Label */}
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
            Account
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/(pages)/accountCenter")}
            className="flex-row items-center justify-between py-4 border-b border-slate-100"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="person-circle-outline" size={20} color="#475569" />
              <Text className="text-base text-slate-800">Accounts Center</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between py-4">
            <View className="flex-row items-center gap-3">
              <Ionicons name="lock-closed-outline" size={20} color="#475569" />
              <Text className="text-base text-slate-800">Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between py-4">
            <View className="flex-row items-center gap-3">
              <Ionicons name="notifications-outline" size={20} color="#475569" />
              <Text className="text-base text-slate-800">Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSignOut}
            className="flex-row items-center justify-between py-4"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text className="text-base text-red-500 font-semibold">
                Sign Out
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Header Row */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <View className="flex-row items-center gap-3">
          <Text className="text-xl font-bold uppercase tracking-tighter text-blue-600">
            My Profile
          </Text>
        </View>

        {isOwnProfile && (
          <View className="flex-row items-center gap-2">
            <TouchableOpacity onPress={() => router.push("/(pages)/editProfile")}>
              <Image
                source={require("@/assets/homeIcons/pencil.png")}
                className="w-8 h-8"
                resizeMode="contain"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openMenu}
              className="w-10 h-10 rounded-full items-center justify-center"
            >
              <Image
                source={require("@/assets/homeIcons/burgermenu.png")}
                className="w-9 h-9"
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

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
                {profile?.full_name || authUser?.email?.split("@")[0] || "User"}
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
      <View className="flex-row items-center justify-center gap-3 py-4">
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
          className="items-center px-3 py-1"
        >
          <Text className="text-2xl font-bold text-slate-800">{stats.followingCount}</Text>
          <Text className="text-sm text-slate-500">Following</Text>
        </TouchableOpacity>

        <View className="h-5 w-px bg-slate-300" />

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
        <TouchableOpacity
          onPress={() => setActiveTab("bookmark")}
          className={`flex-1 items-center py-3 border-b-2 ${
            activeTab === "bookmark" ? "border-blue-600" : "border-transparent"
          }`}
        >
          <Image
            source={require("@/assets/homeIcons/bookmark.png")}
            className="w-5 h-5"
            resizeMode="contain"
            style={{
              tintColor: activeTab === "bookmark" ? "#2563EB" : "#64748B",
            }}
          />
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <View className="flex-1">
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
                  <Image
                    source={{ uri: post.media_url }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="flex-1 items-center justify-center py-20 px-10">
              <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
              <Text className="text-lg font-semibold text-slate-900 mt-4">
                No posts yet
              </Text>
              <Text className="text-slate-500 text-center mt-2 mb-6">
                Share your first moment with the world!
              </Text>
              {isOwnProfile && (
                <TouchableOpacity
                  onPress={() => router.push("/(pages)/createNew")}
                  className="bg-blue-600 px-6 py-3 rounded-full shadow-sm"
                >
                  <Text className="text-white font-bold">Create New Post</Text>
                </TouchableOpacity>
              )}
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
                  <Image
                    source={{ uri: post.media_url }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="flex-1 items-center justify-center py-20 px-10">
              <Ionicons name="repeat-outline" size={48} color="#CBD5E1" />
              <Text className="text-lg font-semibold text-slate-900 mt-4">
                No reposts yet
              </Text>
              <Text className="text-slate-500 text-center mt-2">
                Posts you repost will appear here on your profile.
              </Text>
            </View>
          )
        )}

        {activeTab === "bookmark" && (
          bookmarks.length > 0 ? (
            <View className="flex-row flex-wrap">
              {bookmarks.map((post) => (
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
                  <Image
                    source={{ uri: post.media_url }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="flex-1 items-center justify-center py-20 px-10">
              <Ionicons name="bookmark-outline" size={48} color="#CBD5E1" />
              <Text className="text-lg font-semibold text-slate-900 mt-4">
                No bookmarks yet
              </Text>
              <Text className="text-slate-500 text-center mt-2">
                Save posts to watch or view them later.
              </Text>
            </View>
          )
        )}
      </View>
    </SafeAreaView>
  );
}
