import { View, Text, Pressable, TouchableOpacity } from "react-native";
import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";

const SafeAreaView = styled(RNSafeAreaView);

const Typewriter = ({
  text = "",
  speed = 70,
  loop = true,
  className = "",
}: {
  text?: string;
  speed?: number;
  loop?: boolean;
  className?: string;
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (currentIndex < text.length) {
      timeoutId = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);
    } else if (loop) {
      // smooth loop restart (slightly shorter feels better)
      timeoutId = setTimeout(() => {
        setDisplayedText("");
        setCurrentIndex(0);
      }, 1200);
    }

    return () => clearTimeout(timeoutId);
  }, [currentIndex, text, speed, loop]);

  return (
    <View className="w-full items-center">
      <Text
        className={`min-h-[96px] w-full text-center text-4xl font-extrabold leading-tight text-gray-900 ${className}`}
        style={{ letterSpacing: 0.8 }}
      >
        {displayedText}
      </Text>
    </View>
  );
};

const index = () => {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-5 pb-8 pt-6">
        <View className="flex-1 items-center justify-center">
          <View className="w-full gap-3">
            <View className="items-center gap-1">
              <Typewriter
                text="Welcome To Clone"
                speed={70}
                className="text-center"
              />
              <Text className="text-center text-base leading-6 text-gray-600">
                Create an account, sign in, or continue exploring as a guest.
              </Text>
            </View>

            <View className="w-full gap-4">
              <Pressable
                onPress={() => router.push("/signUp")}
                className="h-12 w-full items-center justify-center rounded-2xl border border-gray-400 bg-white px-5"
              >
                <Text className="text-base font-semibold text-gray-900">
                  Sign Up
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push("/signIn")}
                className="h-12 w-full items-center justify-center rounded-2xl border border-gray-400 bg-white px-5"
              >
                <Text className="text-base font-semibold text-gray-900">
                  Sign In
                </Text>
              </Pressable>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/home")}
              className="items-center justify-center py-2"
            >
              <Text className="text-sm font-semibold text-gray-700">
                Continue as guest
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default index;
