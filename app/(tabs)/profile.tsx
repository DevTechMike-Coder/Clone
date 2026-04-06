import { styled } from "nativewind";
import {
  Image,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import { router } from "expo-router";

const SafeAreaView = styled(RNSafeAreaView);
const SCREEN_WIDTH = Dimensions.get("window").width;

export default function Profile() {
  const [menuOpen, setMenuOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current; // starts off-screen right

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
    <SafeAreaView className="flex-1 bg-gray-100">
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
            backgroundColor: "rgba(0,0,0,0.3)",
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
          backgroundColor: "#fff",
          zIndex: 20,
          transform: [{ translateX: slideAnim }],
          shadowColor: "#000",
          shadowOffset: { width: -4, height: 0 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 20,
        }}
      >
        {/* Close Button */}
        <View className="px-5 pt-14 pb-4 flex-row items-center justify-between border-b border-gray-100">
          <View className="flex-row items-center gap-3">
            <Ionicons name="settings-outline" size={22} color="#111" />
            <Text className="text-lg font-bold text-gray-900 tracking-tight">
              Settings
            </Text>
          </View>

          <TouchableOpacity
            onPress={closeMenu}
            className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
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
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
            Account
          </Text>

          <TouchableOpacity
            onPress={() => router.push("/(pages)/accountCenter")}
            className="flex-row items-center justify-between py-4 border-b border-gray-100"
          >
            <View className="flex-row items-center gap-3">
              <Ionicons name="person-circle-outline" size={20} color="#555" />
              <Text className="text-base text-gray-800">Accounts Center</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-gray-100">
            <View className="flex-row items-center gap-3">
              <Ionicons name="lock-closed-outline" size={20} color="#555" />
              <Text className="text-base text-gray-800">Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-gray-100">
            <View className="flex-row items-center gap-3">
              <Ionicons name="notifications-outline" size={20} color="#555" />
              <Text className="text-base text-gray-800">Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Header Row */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <Text className="text-xl font-bold uppercase tracking-tighter text-blue-500">
          Profile
        </Text>

        <TouchableOpacity
          onPress={openMenu}
          className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
        >
          <Image
            source={require("@/assets/homeIcons/burgermenu.png")}
            className="w-9 h-9"
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View className="flex items-center pt-4">
        <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center border-2 border-blue-500">
          <Image
            source={require("@/assets/homeIcons/profileUser.png")}
            className="w-14 h-14"
            resizeMode="contain"
          />
        </View>

        <View className="items-center pt-2">
          <Text className="text-lg font-semibold text-gray-900 tracking-tight">
            User
          </Text>
        </View>
      </View>

      {/* Stats Row */}
      <View className="flex-row items-center justify-center gap-3 py-4">
        <View className="items-center">
          <Text className="text-2xl font-bold text-gray-800">0</Text>
          <Text className="text-sm text-gray-500">Following</Text>
        </View>
        <View className="h-5 w-px bg-gray-300" />
        <View className="items-center">
          <Text className="text-2xl font-bold text-gray-800">0</Text>
          <Text className="text-sm text-gray-500">Followers</Text>
        </View>
        <View className="h-5 w-px bg-gray-300" />
        <View className="items-center">
          <Text className="text-2xl font-bold text-gray-800">0</Text>
          <Text className="text-sm text-gray-500">Likes</Text>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-gray-200">
        <TouchableOpacity className="flex-1 items-center py-3 border-b-2 border-blue-500">
          <Image
            source={require("@/assets/homeIcons/overview.png")}
            className="w-5 h-5"
            resizeMode="contain"
          />
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 items-center py-3 border-b-2 border-transparent">
          <Image
            source={require("@/assets/homeIcons/repeat.png")}
            className="w-5 h-5"
            resizeMode="contain"
          />
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 items-center py-3 border-b-2 border-transparent">
          <Image
            source={require("@/assets/homeIcons/bookmark.png")}
            className="w-5 h-5"
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* Grid */}
      <View className="flex-row flex-wrap">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View
            key={i}
            className="w-[33.33%] h-32 bg-gray-200 border border-gray-100"
          />
        ))}
      </View>
    </SafeAreaView>
  );
}
