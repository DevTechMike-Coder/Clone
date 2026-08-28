import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import React, { useState } from "react";
import { router } from "expo-router";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";

import { authService } from "@/services/authService";
import Toast from "react-native-toast-message";

const SafeAreaView = styled(RNSafeAreaView);

const eyeOutline = require("@/assets/authicons/eye.png");
const eyeOffOutline = require("@/assets/authicons/eyeInvincible.png");

const SignUp = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const handleGoogleSignUp = async () => {
    try {
      setOauthLoading("google");
      const data = await authService.signInWithGoogle();
      // `data` is null when the user cancels the Google account picker —
      // stay on this screen instead of navigating.
      if (data) {
        router.replace("/home");
      }
    } catch (error: any) {
      if (error?.message && !error.message.includes("cancelled")) {
        Toast.show({
          type: "error",
          text1: "Google Sign In Failed",
          text2: error.message || "Failed to authenticate with Google",
        });
      }
    } finally {
      setOauthLoading(null);
    }
  };

  const handleAppleSignUp = async () => {
    try {
      setOauthLoading("apple");
      await authService.signInWithApple();
      router.replace("/home");
    } catch (error: any) {
      if (error?.message && !error.message.includes("cancelled")) {
        Toast.show({
          type: "error",
          text1: "Apple Sign In Failed",
          text2: error.message || "Failed to authenticate with Apple",
        });
      }
    } finally {
      setOauthLoading(null);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !fullName) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please fill in all fields",
      });
      return;
    }

    try {
      setLoading(true);
      const data = await authService.signUp(email, password, fullName);

      console.log("Signup success, session:", !!data?.session);

      if (data?.session) {
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Welcome to Clone!",
        });
        router.replace("/home");
      } else {
        Toast.show({
          type: "info",
          text1: "Verification Required",
          text2: "Please check your email to verify your account.",
        });
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      Toast.show({
        type: "error",
        text1: "Sign Up Error",
        text2: error.message || "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
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
                  source={require("@/assets/homeIcons/chevronleft.png")}
                  className="h-6 w-6"
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            <View className="flex-1 items-center justify-center py-8">
              <View className="w-full gap-6" style={{ maxWidth: 420 }}>
                <View className="items-center gap-2">
                  <Text className="text-2xl font-bold text-slate-950">
                    Create Account
                  </Text>
                  <Text className="text-center text-slate-600">
                    Join the community
                  </Text>
                </View>

                <View className="w-full gap-6">
                  <View className="w-full gap-4">
                    <TextInput
                      placeholder="Full Name"
                      placeholderTextColor="#94A3B8"
                      value={fullName}
                      onChangeText={setFullName}
                      className="h-12 rounded-2xl border border-slate-200 bg-white pl-4 pr-12 text-slate-900"
                    />

                    <TextInput
                      placeholder="Email"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                      className="h-12 rounded-2xl border border-slate-200 bg-white pl-4 pr-12 text-slate-900"
                    />

                    <View className="relative w-full">
                      <TextInput
                        placeholder="Password"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                        className="h-12 rounded-2xl border border-slate-200 bg-white pl-4 pr-12 text-slate-900"
                      />
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-0 h-12 w-10 items-center justify-center"
                      >
                        <Image
                          source={showPassword ? eyeOffOutline : eyeOutline}
                          className="h-6 w-6"
                          style={{ tintColor: "#64748B" }}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleSignUp}
                    disabled={loading}
                    className={`h-12 w-full items-center justify-center rounded-2xl ${
                      loading ? "bg-blue-400" : "bg-blue-600"
                    }`}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-base font-semibold text-white">
                        Sign Up
                      </Text>
                    )}
                  </TouchableOpacity>

                  <View className="w-full flex-row items-center gap-3">
                    <View className="h-px flex-1 bg-slate-200" />
                    <Text className="text-sm font-semibold text-slate-500">
                      OR
                    </Text>
                    <View className="h-px flex-1 bg-slate-200" />
                  </View>

                  <View className="w-full flex-row items-center justify-center gap-4">
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleGoogleSignUp}
                      disabled={!!oauthLoading}
                      className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 bg-white"
                    >
                      {oauthLoading === "google" ? (
                        <ActivityIndicator size="small" color="#2563EB" />
                      ) : (
                        <>
                          <Image
                            source={require("@/assets/brandIcon/google.png")}
                            className="h-5 w-5"
                            resizeMode="contain"
                          />
                          <Text className="text-base font-semibold text-slate-900">
                            Google
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleAppleSignUp}
                      disabled={!!oauthLoading}
                      className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 bg-white"
                    >
                      {oauthLoading === "apple" ? (
                        <ActivityIndicator size="small" color="#0F172A" />
                      ) : (
                        <>
                          <Image
                            source={require("@/assets/brandIcon/apple.png")}
                            className="h-5 w-5"
                            resizeMode="contain"
                          />
                          <Text className="text-base font-semibold text-slate-900">
                            Apple
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View className="flex-row items-center justify-center gap-2">
                    <Text className="text-slate-600">
                      Already have an account?
                    </Text>
                    <TouchableOpacity onPress={() => router.push("/signIn")}>
                      <Text className="font-semibold text-blue-600">
                        Sign In
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

export default SignUp;
