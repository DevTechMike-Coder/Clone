import { View, Text, Pressable, Animated } from "react-native";
import React, { useEffect, useRef } from "react";
import { Redirect, router } from "expo-router";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";

import { useAuth } from "@/context/AuthContext";
import AuthSplash from "@/components/AuthSplash";

const SafeAreaView = styled(RNSafeAreaView);

const Index = () => {
  const { session, loading } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (loading || session) {
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideUpAnim, loading, session]);

  if (loading) {
    return <AuthSplash />;
  }

  if (session) {
    return <Redirect href="/home" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="flex-1 px-6 pb-12 pt-6">
        <View className="flex-1 items-start justify-end">
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
              width: "100%",
              gap: 20,
            }}
          >
            <View className="items-start gap-3">
              <Text className="text-left text-5xl font-extrabold leading-[56px] tracking-tighter text-slate-950 dark:text-white">
                Welcome To{"\n"}
                <Text className="text-blue-600">Clone</Text>
              </Text>
              <Text className="text-left text-lg leading-7 text-slate-600 dark:text-slate-300 max-w-[90%]">
                Create an account or sign in to join the community.
              </Text>
            </View>

            <View className="w-full gap-4">
              <Pressable
                onPress={() => router.push("/signIn")}
                className="h-12 w-full items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 active:bg-slate-100"
              >
                <Text className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  Get Started
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Index;
