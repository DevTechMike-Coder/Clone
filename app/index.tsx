import { View, Text, Pressable, TouchableOpacity, Animated } from "react-native";
import React, { useEffect, useRef } from "react";
import { router } from "expo-router";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";

const SafeAreaView = styled(RNSafeAreaView);


const Index = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
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
  }, [fadeAnim, slideUpAnim]);

  return (
    <SafeAreaView className="flex-1 bg-white">
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
              <Text className="text-left text-5xl font-extrabold leading-[56px] tracking-tighter text-gray-900">
                Welcome To{"\n"}
                <Text className="text-blue-500">Clone</Text>
              </Text>
              <Text className="text-left text-lg leading-7 text-gray-600 max-w-[90%]">
                Create an account, sign in, or continue exploring as a guest.
              </Text>
            </View>

            <View className="w-full gap-4">
              

              <Pressable
                onPress={() => router.push("/signIn")}
                className="h-12 w-full items-center justify-center rounded-2xl border border-gray-400 bg-white px-5"
              >
                <Text className="text-base font-semibold text-gray-900">
                  Get Started
                </Text>
              </Pressable>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/home")}
              className="items-start justify-center py-2"
            >
              <Text className="text-sm font-semibold text-gray-700">
                Continue as guest
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Index;
