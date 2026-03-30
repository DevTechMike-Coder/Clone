import "@/global.css";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { router } from "expo-router";

const SafeAreaView = styled(RNSafeAreaView);

export default function Index() {
  return (
    <SafeAreaView className="flex-1 p-5">
      <View className="flex-row items-center justify-between">
        <Image
          source={require("@/assets/homeIcons/plus.png")}
          className="w-9 h-9 object-contain"
        />
        <Text className="text-xl font-bold uppercase tracking-tighter text-blue-500">
          Clone
        </Text>

        <TouchableOpacity onPress={() => router.push("/inbox")}>
          <Image
            source={require("@/assets/homeIcons/alarm.png")}
            className="w-9 h-9 object-contain"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
