import { View, Text, TouchableOpacity, Image, TextInput } from "react-native";
import React from "react";
import { router } from "expo-router";

import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { Ionicons } from "@expo/vector-icons";

const SafeAreaView = styled(RNSafeAreaView);

const signUp = () => {

  return (
    <SafeAreaView className="flex-1 p-5 gap-5">
      <View>
        <TouchableOpacity onPress={() => router.back()}>
          <Image
            source={require("@/assets/homeIcons/arrowleft.png")}
            className="w-6 h-6"
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      <View>
        <View className="flex flex-col items-center justify-center gap-2">
          <Text className="text-2xl font-bold">Create Account</Text>
          <Text>Join the community</Text>
        </View>

        <View className="gap-6 py-5">
          {/* Inputs */}
          <View className="gap-4">
            <TextInput
              placeholder="Full Name"
              className="h-12 rounded-2xl border border-gray-300 px-4 text-gray-900"
            />

            <TextInput
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              className="h-12 rounded-2xl border border-gray-300 px-4 text-gray-900"
            />

            <View className="relative">
              <TextInput
                placeholder="Password"
                secureTextEntry={!showPassword}
                className="h-12 rounded-2xl border border-gray-300 pl-4 pr-12 text-gray-900"
              />

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-0 h-12 w-10 items-center justify-center"
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Primary button */}
          <TouchableOpacity
            activeOpacity={0.85}
            className="h-12 items-center justify-center rounded-2xl bg-blue-600"
          >
            <Text className="text-base font-semibold text-white">Sign Up</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View className="flex-row items-center gap-3">
            <View className="h-px flex-1 bg-gray-200" />
            <Text className="text-sm text-gray-500">OR</Text>
            <View className="h-px flex-1 bg-gray-200" />
          </View>

          {/* Google button */}

          <View className="flex-row items-center justify-center gap-4">
            <TouchableOpacity
              activeOpacity={0.85}
              className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-4"
            >
              <Image
                source={require("@/assets/brandIcon/google.png")}
                className="h-5 w-5"
                resizeMode="contain"
              />
              <Text className="text-base font-semibold text-gray-900">
                Google
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-4"
            >
              <Image
                source={require("@/assets/brandIcon/facebook.png")}
                className="h-5 w-5"
                resizeMode="contain"
              />
              <Text className="text-base font-semibold text-gray-900">
                Facebook
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex flex-row items-center justify-center gap-2">
          <Text>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.push("/signIn")}>
            <Text className="text-blue-500">Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default signUp;
