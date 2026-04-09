import { View, Text, TouchableOpacity, Image } from "react-native";
import React from "react";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { router } from "expo-router";

const SafeAreaView = styled(RNSafeAreaView);

const FollowPage = () => {
  return (
    <SafeAreaView className="flex-1 p-5">
      <View className="flex-row items-center px-4 py-3 gap-4">
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Image
            source={require("@/assets/homeIcons/arrowleft.png")}
            className="w-8 h-8" // Slightly larger for better tap targets/visibility
            resizeMode="contain"
          />
        </TouchableOpacity>

        <Text className="text-xl font-bold uppercase tracking-tighter text-blue-500">
          Discover People
        </Text>
      </View>

      <View className="px-4 py-3">
        <Text className="text-xl font-semibold tracking-tight">Suggested for you</Text>
      </View>
    </SafeAreaView>
  );
};

export default FollowPage;
