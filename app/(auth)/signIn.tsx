import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import React, { useState } from "react";
import { router } from "expo-router";

import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { Ionicons } from "@expo/vector-icons";

const SafeAreaView = styled(RNSafeAreaView);

const signIn = () => {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-5 pb-8 pt-2">
            <View className="h-12 justify-center">
              <TouchableOpacity
                onPress={() => router.back()}
                className="h-10 w-10 items-center justify-center"
              >
                <Image
                  source={require("@/assets/homeIcons/arrowleft.png")}
                  className="h-6 w-6"
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            <View className="flex-1 items-center justify-center py-8">
              <View className="w-full gap-6" style={{ maxWidth: 420 }}>
                <View className="items-center gap-2">
                  <Text className="text-2xl font-bold text-gray-900">
                    Access Your Account
                  </Text>
                  <Text className="text-center text-gray-600">
                    Welcome back, you&apos;ve been missed!
                  </Text>
                </View>

                <View className="w-full gap-6">
                  <View className="w-full gap-4">
                    <TextInput
                      placeholder="Email"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className="h-12 rounded-2xl border border-gray-300 bg-white pl-4 pr-12 text-gray-900"
                    />

                    <View className="relative w-full">
                      <TextInput
                        placeholder="Password"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry={!showPassword}
                        className="h-12 rounded-2xl border border-gray-300 bg-white pl-4 pr-12 text-gray-900"
                      />
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-0 h-12 w-10 items-center justify-center"
                      >
                        <Ionicons
                          name={
                            showPassword ? "eye-off-outline" : "eye-outline"
                          }
                          size={22}
                          color="#6B7280"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    className="h-12 w-full items-center justify-center rounded-2xl bg-blue-600"
                  >
                    <Text className="text-base font-semibold text-white">
                      Sign In
                    </Text>
                  </TouchableOpacity>

                  <View className="w-full flex-row items-center gap-3">
                    <View className="h-px flex-1 bg-gray-200" />
                    <Text className="text-sm font-semibold text-gray-500">
                      OR
                    </Text>
                    <View className="h-px flex-1 bg-gray-200" />
                  </View>

                  <View className="w-full flex-row items-center justify-center gap-4">
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

                  <View className="flex-row items-center justify-center gap-2">
                    <Text className="text-gray-700">
                      Don&apos;t have an account?
                    </Text>
                    <TouchableOpacity onPress={() => router.push("/signUp")}>
                      <Text className="font-semibold text-blue-600">
                        Sign Up
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default signIn;
