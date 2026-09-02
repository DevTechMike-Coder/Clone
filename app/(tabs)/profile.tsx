import { styled } from "nativewind";
import {
  Image,
  Text,
  View,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Dimensions,
  Modal,
  Alert,
  Pressable,
  Share,
} from "react-native";
import {
  SafeAreaView as RNSafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router, useNavigation, useFocusEffect } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from "@/context/AuthContext";
import { profileService } from "@/services/profileService";
import { pushNotificationService } from "@/services/pushNotificationService";
import {
  SavedAccountProfile,
  accountService,
} from "@/services/accountService";
import AddAccountModal from "@/components/modal/AddAccountModal";
import { useTheme } from "@/context/ThemeContext";
import { Post, postService } from "@/services/postService";
import PostGridThumbnail from "@/components/PostGridThumbnail";
import { bookmarkService } from "@/services/bookmarkService";
import { repostService } from "@/services/repostService";
import { followService, UserStats } from "@/services/followService";
import { authService } from "@/services/authService";
import { storyService } from "@/services/storyService";
import Toast from "react-native-toast-message";
import { useState, useEffect, useRef, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "@/components/StyledLinearGradient";
import * as Haptics from "expo-haptics";
import { colors, storyRingGradient } from "@/constants/theme";

const SafeAreaView = styled(RNSafeAreaView);
const SCREEN_WIDTH = Dimensions.get("window").width;

export default function Profile() {
  const { user: authUser } = useAuth();
  const { palette } = useTheme();
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
  const [savedAccounts, setSavedAccounts] = useState<SavedAccountProfile[]>([]);
  const [switchingAccountId, setSwitchingAccountId] = useState<string | null>(null);
  const [addAccountOpen, setAddAccountOpen] = useState(false);

  const handleSwitchAccount = async (userId: string) => {
    if (switchingAccountId) return;
    setSwitchingAccountId(userId);
    try {
      await accountService.switchToAccount(userId);
      closeMenu();
      Toast.show({ type: "success", text1: "Switched account" });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Couldn't switch",
        text2: error?.message || "Please try again.",
      });
      // Refresh the list — a failed switch drops dead credentials.
      accountService
        .listAccountsWithProfiles()
        .then(setSavedAccounts)
        .catch(() => {});
    } finally {
      setSwitchingAccountId(null);
    }
  };

  const handleForgetAccount = (userId: string) => {
    Alert.alert("Remove account", "Remove this account from the switcher?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await accountService.removeAccount(userId).catch(() => {});
          setSavedAccounts((prev) => prev.filter((a) => a.userId !== userId));
        },
      },
    ]);
  };
  const [postMenuPost, setPostMenuPost] = useState<Post | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "repeat" | "bookmark">("overview");
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
      // Remove this device's push token before the session ends — RLS only
      // allows the owner to delete their rows, so it must run pre-sign-out.
      await pushNotificationService.unregisterDevice().catch(() => {});
      // Explicit sign-out also drops the account from the switcher.
      if (authUser?.id) {
        await accountService.removeAccount(authUser.id).catch(() => {});
      }
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
    setDeleteConfirmId(null);
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
    // Refresh the multi-account switcher each time the drawer opens
    accountService
      .listAccountsWithProfiles()
      .then(setSavedAccounts)
      .catch(() => setSavedAccounts([]));
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

  const openPostMenu = (post: Post) => {
    setPostMenuPost(post);
  };
  const closePostMenu = () => setPostMenuPost(null);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
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
          backgroundColor: palette.surface,
          zIndex: 20,
          transform: [{ translateX: slideAnim }],
          shadowColor: colors.slate[900],
          shadowOffset: { width: -4, height: 0 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 20,
        }}
      >
        <View className="px-5 pt-14 pb-4 flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <View className="flex-row items-center gap-3">
            <Ionicons name="settings-outline" size={22} color={colors.slate[900]} />
            <Text className="text-lg font-bold text-slate-900 dark:text-slate-50 tracking-tight">
              Settings
            </Text>
          </View>

          <TouchableOpacity
            onPress={closeMenu}
            accessibilityRole="button"
            accessibilityLabel="Close settings"
            className="w-9 h-9 rounded-full items-center justify-center"
          >
            <Image
              source={require("@/assets/homeIcons/delete.png")}
              className="w-4 h-4"
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <View className="px-5 pt-3">
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
            Account
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/(pages)/accountCenter")}
            className="flex-row items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="person-circle-outline" size={20} color={colors.slate[600]} />
              <Text className="text-base text-slate-800 dark:text-slate-100">Accounts Center</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.slate[300]} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              closeMenu();
              router.push("/(pages)/insights");
            }}
            className="flex-row items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="bar-chart-outline" size={20} color={colors.slate[600]} />
              <Text className="text-base text-slate-800 dark:text-slate-100">Insights</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.slate[300]} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleTogglePrivate}
            disabled={privacySaving}
            className="flex-row items-center justify-between py-4"
          >
            <View className="flex-row items-center gap-3 flex-1 pr-3">
              <Ionicons name="lock-closed-outline" size={20} color={colors.slate[600]} />
              <View className="flex-1">
                <Text className="text-base text-slate-800 dark:text-slate-100">Private account</Text>
                <Text className="text-xs text-slate-400 mt-0.5">
                  Only people who follow you can see your posts
                </Text>
              </View>
            </View>
            <View
              className={`w-11 h-6 rounded-full justify-center ${
                profile?.is_private ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              <View
                className={`w-5 h-5 rounded-full bg-white dark:bg-slate-900 ${
                  profile?.is_private ? "self-end mr-0.5" : "self-start ml-0.5"
                }`}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              closeMenu();
              router.push("/(pages)/inbox");
            }}
            accessibilityRole="button"
            accessibilityLabel="Open notifications"
            className="flex-row items-center justify-between py-4"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="notifications-outline" size={20} color={colors.slate[600]} />
              <Text className="text-base text-slate-800 dark:text-slate-100">Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.slate[300]} />
          </TouchableOpacity>

          {/* Multi-account switcher */}
          {savedAccounts.length > 0 && (
            <View className="mt-2 border-t border-slate-100 dark:border-slate-800 pt-4">
              <Text className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                Switch account
              </Text>
              {savedAccounts.map((account) => {
                const isCurrent = account.userId === authUser?.id;
                return (
                  <TouchableOpacity
                    key={account.userId}
                    disabled={isCurrent || !!switchingAccountId}
                    onPress={() => handleSwitchAccount(account.userId)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`Switch to ${account.username || account.email || "saved account"}`}
                    className="flex-row items-center gap-3 py-2.5"
                  >
                    <View className="h-9 w-9 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700">
                      {account.avatar_url ? (
                        <Image
                          source={{ uri: account.avatar_url }}
                          className="h-full w-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="person" size={16} color={colors.slate[400]} />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-900 dark:text-slate-50" numberOfLines={1}>
                        {account.full_name || account.username || account.email || "Account"}
                      </Text>
                      {!!(account.username || account.email) && (
                        <Text className="text-xs text-slate-400" numberOfLines={1}>
                          {account.username ? `@${account.username}` : account.email}
                        </Text>
                      )}
                    </View>
                    {switchingAccountId === account.userId ? (
                      <ActivityIndicator size="small" color={colors.blue[600]} />
                    ) : isCurrent ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.blue[600]} />
                    ) : (
                      <TouchableOpacity
                        hitSlop={10}
                        onPress={() => handleForgetAccount(account.userId)}
                        accessibilityRole="button"
                        accessibilityLabel="Remove saved account"
                      >
                        <Ionicons name="close-circle-outline" size={20} color={colors.slate[300]} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                onPress={() => setAddAccountOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Log into another account"
                className="flex-row items-center gap-3 py-2.5"
              >
                <View className="h-9 w-9 rounded-full bg-blue-50 dark:bg-blue-950 items-center justify-center border border-blue-100 dark:border-blue-900">
                  <Ionicons name="add" size={18} color={colors.blue[600]} />
                </View>
                <Text className="text-sm font-bold text-blue-600">
                  Log into another account
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSignOut}
            className="flex-row items-center justify-between py-4"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="log-out-outline" size={20} color={colors.red[500]} />
              <Text className="text-base text-red-500 font-semibold">
                Sign Out
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <AddAccountModal
        visible={addAccountOpen}
        onClose={() => setAddAccountOpen(false)}
      />

      {/* Header Row */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <View className="flex-row items-center gap-3">
          <Text className="text-xl font-bold uppercase tracking-tighter text-blue-600">
            My Profile
          </Text>
        </View>

        {isOwnProfile && (
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={handleShareProfile}
              accessibilityRole="button"
              accessibilityLabel="Share profile"
            >
              <Ionicons name="share-social-outline" size={26} color={colors.slate[900]} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/(pages)/editProfile")}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              <Image
                source={require("@/assets/homeIcons/pencil.png")}
                className="w-8 h-8"
                resizeMode="contain"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openMenu}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
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
          <ActivityIndicator size="large" color={colors.blue[600]} />
        ) : (
          <>
            <View className="relative">
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
                <LinearGradient
                  colors={activeStoryCount > 0 ? [...storyRingGradient] : [colors.slate[200], colors.slate[200]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 104,
                    height: 104,
                    borderRadius: 52,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View className="w-[96px] h-[96px] rounded-full bg-white dark:bg-slate-900 items-center justify-center overflow-hidden">
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
                </LinearGradient>
              </TouchableOpacity>
              {/* Add story button — sits outside the story-ring tap target so it never triggers the viewer */}
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
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-blue-600 items-center justify-center border-[3px] border-white z-10"
              >
                <Ionicons name="add" size={19} color="white" />
              </TouchableOpacity>
            </View>

            <View className="items-center pt-2">
              <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
                {profile?.full_name || authUser?.email?.split("@")[0] || "User"}
              </Text>
              {profile?.username && (
                <Text className="text-sm text-slate-500 dark:text-slate-400">
                  @{profile.username}
                </Text>
              )}
              {profile?.is_private && (
                <View className="flex-row items-center gap-1 mt-1">
                  <Ionicons name="lock-closed" size={12} color={colors.slate[500]} />
                  <Text className="text-xs text-slate-400">Private account</Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>

      {/* Bio & Social Links */}
      <View className="p-5 flex-col items-center justify-center">
        <Text className="text-base text-slate-500 dark:text-slate-400">
          {profile?.bio || "No bio yet. Tap edit to add one!"}
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

      {/* Edit Profile + Share buttons */}
      <View className="flex-row px-5 gap-3 mb-2">
        <TouchableOpacity
          onPress={() => router.push("/(pages)/editProfile")}
          activeOpacity={0.8}
          className="flex-1 h-11 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl items-center justify-center"
        >
          <Text className="text-slate-900 dark:text-slate-50 font-bold">Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(pages)/createNew")}
          activeOpacity={0.8}
          className="flex-1 h-11 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl items-center justify-center"
        >
          <Text className="text-slate-900 dark:text-slate-50 font-bold">New Post</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleShareProfile}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Share profile"
          className="w-11 h-11 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl items-center justify-center"
        >
          <Ionicons name="share-outline" size={20} color={colors.slate[900]} />
        </TouchableOpacity>
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
          <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.followingCount}</Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400">Following</Text>
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
          <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.followersCount}</Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400">Followers</Text>
        </TouchableOpacity>

        <View className="h-5 w-px bg-slate-300" />

        <View className="items-center px-3 py-1">
          <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.likesCount}</Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400">Likes</Text>
        </View>
      </View>

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
        <TouchableOpacity
          onPress={() => setActiveTab("bookmark")}
          accessibilityRole="tab"
          accessibilityLabel="Bookmarks"
          accessibilityState={{ selected: activeTab === "bookmark" }}
          className={`flex-1 items-center py-3 border-b-2 ${
            activeTab === "bookmark" ? "border-blue-600" : "border-transparent"
          }`}
        >
          <Image
            source={require("@/assets/homeIcons/bookmark.png")}
            className="w-5 h-5"
            resizeMode="contain"
            style={{
              tintColor: activeTab === "bookmark" ? colors.blue[600] : colors.slate[500],
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
                  onLongPress={() => openPostMenu(post)}
                  onPress={() =>
                    router.push({
                      pathname: "/(pages)/viewPost",
                      params: { postId: post.id },
                    })
                  }
                  className="w-1/3 aspect-square border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 relative"
                >
                  <PostGridThumbnail post={post} />
                  {deletingId === post.id && (
                    <View className="absolute inset-0 bg-black/60 items-center justify-center">
                      <ActivityIndicator color="white" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="flex-1 items-center justify-center py-20 px-10">
              <Ionicons name="document-text-outline" size={48} color={colors.slate[300]} />
              <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50 mt-4">
                No posts yet
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-center mt-2 mb-6">
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
                  onLongPress={() => openPostMenu(post)}
                  onPress={() =>
                    router.push({
                      pathname: "/(pages)/viewPost",
                      params: { postId: post.id },
                    })
                  }
                  className="w-1/3 aspect-square border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 relative"
                >
                  <PostGridThumbnail post={post} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="flex-1 items-center justify-center py-20 px-10">
              <Ionicons name="repeat-outline" size={48} color={colors.slate[300]} />
              <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50 mt-4">
                No reposts yet
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-center mt-2">
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
                  onLongPress={() => openPostMenu(post)}
                  onPress={() =>
                    router.push({
                      pathname: "/(pages)/viewPost",
                      params: { postId: post.id },
                    })
                  }
                  className="w-1/3 aspect-square border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 relative"
                >
                  <PostGridThumbnail post={post} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="flex-1 items-center justify-center py-20 px-10">
              <Ionicons name="bookmark-outline" size={48} color={colors.slate[300]} />
              <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50 mt-4">
                No bookmarks yet
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-center mt-2">
                Save posts to watch or view them later.
              </Text>
            </View>
          )
        )}
      </View>

      {/* Post Options Modal */}
      <Modal
        transparent
        visible={!!postMenuPost}
        animationType="fade"
        onRequestClose={closePostMenu}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={closePostMenu}
        >
          <Pressable className="bg-white dark:bg-slate-900 rounded-t-3xl p-5 pb-8" onPress={(e) => e.stopPropagation()}>
            <View className="items-center mb-4">
              <View className="w-12 h-1 bg-slate-300 rounded-full" />
            </View>

            {/* Post thumbnail */}
            {postMenuPost && (
              <View className="flex-row items-center gap-3 mb-4 px-2">
                <View className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <PostGridThumbnail post={postMenuPost} />
                </View>
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-sm font-bold text-slate-900 dark:text-slate-50">
                    {postMenuPost.caption || "Post"}
                  </Text>
                  <Text className="text-xs text-slate-500 dark:text-slate-400">
                    {postMenuPost.media_type === "video" ? "Video" : "Photo"}
                  </Text>
                </View>
              </View>
            )}

            <View className="gap-2">
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
                      ],
                    );
                  }}
                  className="flex-row items-center gap-3 py-4 px-2 border-b border-slate-100 dark:border-slate-800"
                >
                  <Ionicons name="trash-outline" size={22} color={colors.red[500]} />
                  <Text className="text-red-500 font-bold text-base">Delete post</Text>
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
                className="flex-row items-center gap-3 py-4 px-2 border-b border-slate-100 dark:border-slate-800"
              >
                <Ionicons name="eye-outline" size={22} color={colors.slate[900]} />
                <Text className="text-slate-800 dark:text-slate-100 font-semibold text-base">View post</Text>
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
                className="flex-row items-center gap-3 py-4 px-2 border-b border-slate-100 dark:border-slate-800"
              >
                <Ionicons name="share-outline" size={22} color={colors.slate[900]} />
                <Text className="text-slate-800 dark:text-slate-100 font-semibold text-base">Share post</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={closePostMenu}
                className="flex-row items-center gap-3 py-4 px-2"
              >
                <Ionicons name="close-circle-outline" size={22} color={colors.slate[500]} />
                <Text className="text-slate-500 dark:text-slate-400 font-semibold text-base">Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
