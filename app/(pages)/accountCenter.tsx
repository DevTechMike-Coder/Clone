import { Text, TouchableOpacity, Image, View } from "react-native";
import React from "react";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { router } from "expo-router";
import { useTheme } from "@/context/ThemeContext";

const SafeAreaView = styled(RNSafeAreaView);

const AccountCenter = () => {
  const { mode, setMode } = useTheme();
  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950 p-5">
      <View className="flex-row items-center justify-between px-5 py-4">
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="w-10 h-10 rounded-full border border-slate-100 dark:border-slate-800 items-center justify-center"
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
          <Text className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            Clone
          </Text>
        </View>

        {/* Right spacer — keeps title visually centered */}
        <View className="w-10" />
      </View>

      <View className="px-5 pt-6 pb-2">
        <Text className="text-2xl font-bold text-slate-950 dark:text-white tracking-tight">
          Account Center
        </Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your account settings from here
        </Text>
      </View>

      <View className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-6 py-6 mx-5 mt-4">
        <TouchableOpacity
          onPress={() => router.push("/(pages)/personalDetails")}
          className="flex-col gap-1"
        >
          <View className="flex-row items-center gap-3">
            <Image
              source={require("@/assets/homeIcons/profileUser.png")}
              className="w-6 h-6"
              resizeMode="contain"
            />
            <Text className="text-lg font-medium text-slate-800 dark:text-slate-100 tracking-tight">
              Personal Details
            </Text>
          </View>

          <Text className="text-slate-500 dark:text-slate-400 text-sm tracking-tight">
            Manage your personal information
          </Text>
        </TouchableOpacity>
      </View>

      {/* Appearance — theme preference, persisted across launches */}
      <View className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl px-6 py-6 mx-5 mt-4">
        <View className="flex-col gap-1">
          <Text className="text-lg font-medium text-slate-800 dark:text-slate-100 tracking-tight">
            Appearance
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-sm tracking-tight">
            Choose light, dark, or follow your device
          </Text>
        </View>

        <View className="flex-row gap-2 mt-4">
          {(["system", "light", "dark"] as const).map((option) => {
            const active = mode === option;
            return (
              <TouchableOpacity
                key={option}
                onPress={() => setMode(option)}
                accessibilityRole="button"
                accessibilityLabel={`Appearance: ${option}`}
                className={`flex-1 h-11 rounded-full border items-center justify-center ${
                  active
                    ? "bg-blue-600 border-blue-600"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                }`}
              >
                <Text
                  className={`text-sm font-semibold capitalize ${
                    active
                      ? "text-white"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default AccountCenter;
