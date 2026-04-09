import { Text, TouchableOpacity, Image, View } from "react-native";
import React from "react";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { router } from "expo-router";

const SafeAreaView = styled(RNSafeAreaView);

const accountCenter = () => {
  return (
    <SafeAreaView className="flex-1 p-5">
      <View className="flex-row items-center justify-between px-5 py-4">
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center"
        >
          <Image
            source={require("@/assets/homeIcons/delete.png")}
            className="w-5 h-5"
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Title — centered absolutely so it's always mid-screen */}
        <View
          className="absolute left-0 right-0 items-center"
          pointerEvents="none"
        >
          <Text className="text-lg font-bold text-gray-800 tracking-tight">
            Clone
          </Text>
        </View>

        {/* Right spacer — keeps title visually centered */}
        <View className="w-10" />
      </View>

      <View className="px-5 pt-6 pb-2">
        <Text className="text-2xl font-bold text-gray-900 tracking-tight">
          Account Center
        </Text>
        <Text className="text-sm text-gray-400 mt-1">
          Manage your account settings from here
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default accountCenter;
