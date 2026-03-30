import { Image, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { router } from "expo-router";

const SafeAreaView = styled(RNSafeAreaView);

export default function Search() {
  return (
    <SafeAreaView className="flex-1 p-5">
      <View className="flex-row items-center justify-between gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Image
            source={require("@/assets/homeIcons/arrowleft.png")}
            className="w-5 h-5 opacity-50"
            resizeMode="contain"
          />
        </TouchableOpacity>
        <View className="flex-row items-center border border-gray-300 rounded-2xl px-3">
          <Image
            source={require("@/assets/homeIcons/search.png")}
            className="w-5 h-5 opacity-50"
            resizeMode="contain"
          />

          <TextInput placeholder="Search..." className="flex-1 h-10 ml-2" />
        </View>
      </View>
    </SafeAreaView>
  );
}
