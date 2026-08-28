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
import Toast from "react-native-toast-message";

const SafeAreaView = styled(RNSafeAreaView);

export default function Index() {
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
            borderTopWidth: 0,
            elevation: 0,
          },
    });
  }, [isMenuOpen, navigation, insets]);

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
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsMenuOpen(false);
      setSelectedPost(null);
    });
  };

  const handleMenuBookmark = async () => {
    if (!selectedPost) return;
    closeMenu();
    try {
      const res = await bookmarkService.toggleBookmark(selectedPost.id);
      Toast.show({
        type: "success",
        text1: res.bookmarked ? "Saved!" : "Removed Bookmark",
        text2: res.bookmarked ? "Post saved to your bookmarks." : "Bookmark removed.",
        visibilityTime: 2000,
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to update bookmark",
      });
    }
  };

  const handleMenuShare = async () => {
    if (!selectedPost) return;
    closeMenu();
    await shareService.sharePost(selectedPost);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 p-5">
      <View className="flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.push("/createNew")}>
          <Image
            source={require("@/assets/homeIcons/plus.png")}
            className="w-9 h-9 object-contain"
          />
        </TouchableOpacity>

        <Text className="text-xl font-bold uppercase tracking-tighter text-blue-600">
          Clone
        </Text>

        <TouchableOpacity onPress={() => router.push("/inbox")}>
          <Image
            source={require("@/assets/homeIcons/alarm.png")}
            className="w-9 h-9 object-contain"
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
              backgroundColor: "rgba(15,23,42,0.28)",
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
            className="bg-white rounded-t-3xl border border-slate-100 p-6 pb-12"
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <View className="items-center mb-4">
              <View className="w-12 h-1 bg-slate-300 rounded-full" />
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
                />
                <Text className="text-lg font-medium text-slate-800">
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
                />
                <Text className="text-lg font-medium text-slate-800">
                  {selectedPost?.is_bookmarked ? "Remove Bookmark" : "Bookmark Post"}
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
                />
                <Text className="text-lg font-medium text-slate-800">
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
                />
                <Text className="text-lg font-medium text-slate-800">
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
                />
                <Text className="text-lg font-medium text-red-500">Report</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}
