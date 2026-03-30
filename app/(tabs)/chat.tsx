import { Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { router } from "expo-router";

const SafeAreaView = styled(RNSafeAreaView);

export default function Chat() {
  return (
    <SafeAreaView className="flex-1 p-5">
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.push("/followpage")}
          activeOpacity={0.7}
        >
          <Image
            source={require("@/assets/homeIcons/add-user.png")}
            className="w-10 h-10"
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text className="text-xl font-semibold tracking-tight">Chat</Text>
        <Image
          source={require("@/assets/homeIcons/menuV.png")}
          className="w-10 h-10"
          resizeMode="contain"
        />
      </View>

      <View className="py-7 px-4">
        <Text className="text-xl font-semibold tracking-tight">
          DM for More
        </Text>
      </View>
    </SafeAreaView>
  );
}
