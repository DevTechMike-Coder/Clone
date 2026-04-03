import { router } from "expo-router";
import { styled } from "nativewind";
import { Image, TouchableOpacity, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const createNew = () => {
  return (
    <SafeAreaView className="flex-1 p-5">
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Image
            source={require("@/assets/homeIcons/delete.png")}
            className="w-9 h-9" // Slightly larger for better tap targets/visibility
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default createNew;
