import { Text } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";

const SafeAreaView = styled(RNSafeAreaView);

export default function Profile() {
  return (
    <SafeAreaView className="flex-1 p-5">
      <Text className="text-2xl font-semibold text-center py-4">Profile</Text>
    </SafeAreaView>
  );
}
