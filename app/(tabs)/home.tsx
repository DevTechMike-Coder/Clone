import "@/global.css";
import React, { useState, useRef } from "react";
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  Animated,
  StyleSheet,
} from "react-native";
import {
  SafeAreaView as RNSafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { styled } from "nativewind";
import { router, useNavigation } from "expo-router";
import IndexVideoFeed from "@/components/IndexVideoFeed";
import { Post } from "@/services/postService";
import { bookmarkService } from "@/services/bookmarkService";
import { shareService } from "@/services/shareService";
import { useTheme } from "@/context/ThemeContext";
import { colors } from "@/constants/theme";
import Toast from "react-native-toast-message";

const SafeAreaView = styled(RNSafeAreaView);

export default function Index() {
  const { isDark, palette } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    navigation.setOptions({
      tabBarStyle: isMenuOpen
        ? { display: "none" }
        : {
            position: "absolute",
            bottom: Math.max(insets.bottom, 16),
            height: 70,
            marginHorizontal: 20,
            borderRadius: 20,
            borderTopWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.surface,
            elevation: 6,
            shadowColor: isDark ? "#000000" : colors.slate[900],
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDark ? 0.35 : 0.08,
            shadowRadius: 18,
          },
    });
  }, [isMenuOpen, navigation, insets, palette, isDark]);

  const openMenu = (post: Post) => {
    setSelectedPost(post);
    setIsMenuOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsMenuOpen(false);
      setSelectedPost(null);
    });
  };

  const handleMenuBookmark = async () => {
    if (!selectedPost) return;
    try {
      const res = await bookmarkService.toggleBookmark(selectedPost.id);
      setSelectedPost((prev) =>
        prev ? { ...prev, is_bookmarked: res.bookmarked } : null
      );
      Toast.show({
        type: "success",
        text1: res.bookmarked ? "Post Bookmarked" : "Bookmark Removed",
        text2: res.bookmarked
          ? "Post saved to your profile"
          : "Post removed from saved",
      });
    } catch {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update bookmark",
      });
    } finally {
      closeMenu();
    }
  };

  const handleMenuShare = async () => {
    if (!selectedPost) return;
    try {
      await shareService.sharePost(selectedPost);
    } catch {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to share post",
      });
    } finally {
      closeMenu();
    }
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: palette.background }}
    >
      {/* Top Header Bar */}
      <View
        className="flex-row items-center justify-between px-5 pt-2 pb-1 border-b"
        style={{ borderColor: palette.borderSubtle }}
      >
        <TouchableOpacity
          onPress={() => router.push("/(pages)/createNew")}
          accessibilityRole="button"
          accessibilityLabel="Create Post"
        >
          <Image
            source={require("@/assets/homeIcons/plus.png")}
            className="w-9 h-9 object-contain"
            style={{ tintColor: isDark ? palette.text : undefined }}
          />
        </TouchableOpacity>

        <Text
          className="text-xl font-bold uppercase tracking-tighter"
          style={{ color: palette.primary }}
        >
          Clone
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/inbox")}
          accessibilityRole="button"
          accessibilityLabel="Notifications"
        >
          <Image
            source={require("@/assets/homeIcons/alarm.png")}
            className="w-9 h-9 object-contain"
            style={{ tintColor: isDark ? palette.text : undefined }}
          />
        </TouchableOpacity>
      </View>

      <IndexVideoFeed onOptionsPress={openMenu} />

      {/* Ellipsis Menu (fade from bottom animation) */}
      {isMenuOpen && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              zIndex: 50,
              backgroundColor: palette.overlay,
              justifyContent: "flex-end",
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeMenu}
          />
          <Animated.View
            className="rounded-t-3xl border p-6 pb-12"
            style={{
              backgroundColor: palette.surface,
              borderColor: palette.border,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <View className="items-center mb-4">
              <View
                className="w-12 h-1 rounded-full"
                style={{
                  backgroundColor: isDark
                    ? colors.slate[700]
                    : colors.slate[300],
                }}
              />
            </View>
            <View className="flex-col gap-6 mt-2">
              <TouchableOpacity
                className="flex-row items-center gap-4"
                onPress={() => {
                  if (selectedPost) {
                    closeMenu();
                    router.push({
                      pathname: "/(pages)/userProfile",
                      params: { userId: selectedPost.user_id },
                    });
                  }
                }}
              >
                <Image
                  source={require("@/assets/homeIcons/profilePlus.png")}
                  className="w-6 h-6"
                  resizeMode="contain"
                  style={{ tintColor: palette.text }}
                />
                <Text
                  className="text-lg font-medium"
                  style={{ color: palette.text }}
                >
                  View Profile
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center gap-4"
                onPress={handleMenuBookmark}
              >
                <Image
                  source={require("@/assets/homeIcons/bookmark.png")}
                  className="w-6 h-6"
                  resizeMode="contain"
                  style={{ tintColor: palette.text }}
                />
                <Text
                  className="text-lg font-medium"
                  style={{ color: palette.text }}
                >
                  {selectedPost?.is_bookmarked
                    ? "Remove Bookmark"
                    : "Bookmark Post"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center gap-4"
                onPress={handleMenuShare}
              >
                <Image
                  source={require("@/assets/homeIcons/share.png")}
                  className="w-6 h-6"
                  resizeMode="contain"
                  style={{ tintColor: palette.text }}
                />
                <Text
                  className="text-lg font-medium"
                  style={{ color: palette.text }}
                >
                  Share Post
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center gap-4"
                onPress={closeMenu}
              >
                <Image
                  source={require("@/assets/homeIcons/dislike.png")}
                  className="w-6 h-6"
                  resizeMode="contain"
                  style={{ tintColor: palette.text }}
                />
                <Text
                  className="text-lg font-medium"
                  style={{ color: palette.text }}
                >
                  Not Interested
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center gap-4"
                onPress={closeMenu}
              >
                <Image
                  source={require("@/assets/homeIcons/warning.png")}
                  className="w-6 h-6"
                  resizeMode="contain"
                  style={{ tintColor: palette.danger }}
                />
                <Text
                  className="text-lg font-medium"
                  style={{ color: palette.danger }}
                >
                  Report
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}
