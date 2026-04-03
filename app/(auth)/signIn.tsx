import { View, Text, TouchableOpacity, Image } from "react-native";
import React from "react";
import { router } from "expo-router";

import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";

const SafeAreaView = styled(RNSafeAreaView);

const signIn = () => {
  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-5">
      <View>
        <TouchableOpacity onPress={() => router.back()}>
          <Image
            source={require("@/assets/homeIcons/arrowleft.png")}
            className="w-5 h-5"
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      <Text>signIn</Text>
    </SafeAreaView>
  );
};

export default signIn;
