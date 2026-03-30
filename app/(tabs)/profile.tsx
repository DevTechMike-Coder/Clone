import { styled } from "nativewind";
import { Image, Text, View, TouchableOpacity } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const SafeAreaView = styled(RNSafeAreaView);

export default function Profile() {
  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      
      {/* ✅ Header Row */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <Text className="text-2xl font-semibold">Profile</Text>
        <TouchableOpacity className="w-10 h-10 rounded-full bg-gray-300 items-center justify-center">
          <Ionicons name="settings-outline" size={20} color="#555" />
        </TouchableOpacity>
      </View>

      {/* ✅ Avatar */}
      <View className="items-center pt-4">
        <View className="w-24 h-24 rounded-full bg-gray-200 items-center justify-center border-2 border-blue-500">
          <Image
            source={require("@/assets/homeIcons/profileUser.png")}
            className="w-14 h-14"
            resizeMode="contain"
          />
        </View>
      </View>

      {/* ✅ Stats Row */}
      <View className="flex-row items-center justify-center gap-6 py-6">
        
        <View className="items-center">
          <Text className="text-base font-bold text-gray-800">0</Text>
          <Text className="text-xl text-gray-500">Following</Text>
        </View>

        {/* Separator */}
        <View className="h-8 w-px bg-gray-300" />

        <View className="items-center">
          <Text className="text-base font-bold text-gray-800">0</Text>
          <Text className="text-xl text-gray-500">Followers</Text>
        </View>

        {/* Separator */}
        <View className="h-8 w-px bg-gray-300" />

        <View className="items-center">
          <Text className="text-base font-bold text-gray-800">0</Text>
          <Text className="text-xl text-gray-500">Likes</Text>
        </View>

      </View>

    </SafeAreaView>
  );
}