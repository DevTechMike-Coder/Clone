import { View, Text, Pressable, TouchableOpacity } from "react-native";
import React from "react";
import { router } from "expo-router";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";

const SafeAreaView = styled(RNSafeAreaView);

const index = () => {
  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-5">
      <Text className="text-2xl font-bold">Welcome To Clone</Text>

      <Pressable onPress={() => router.push("/signUp")} className="border border-gray-500 px-5 py-2 rounded-full">
        <Text className="text-xl font-bold">SignUp</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/signIn")} className="border border-gray-500 px-5 py-2 rounded-full">
        <Text className="text-xl font-bold">SignIn</Text>
      </Pressable>

      <TouchableOpacity onPress={() => router.push("/home")}>
        <Text className="text-sm font-bold">Continue as guest</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default index;
