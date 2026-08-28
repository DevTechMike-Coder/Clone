import { Text, TouchableOpacity, View, Image } from "react-native";
import { styled } from "nativewind";
import { router } from "expo-router";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

export default function PersonalDetails() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50 p-5">
      <View className="flex-row items-center justify-between px-5 py-4">
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full border border-slate-100 items-center justify-center"
        >
          <Image
            source={require("@/assets/homeIcons/chevronleft.png")}
            className="w-5 h-5"
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Title — centered absolutely so it's always mid-screen */}
        <View
          className="absolute left-0 right-0 items-center"
          pointerEvents="none"
        >
          <Text className="text-lg font-bold text-slate-800 tracking-tight">
            Personal Details
          </Text>
        </View>

        {/* Right spacer — keeps title visually centered */}
        <View className="w-10" />
      </View>

      <View className="p-5">
        <Text className="text-slate-500 text-center">
            Personal details content will go here.
        </Text>
      </View>
    </SafeAreaView>
  );
}
