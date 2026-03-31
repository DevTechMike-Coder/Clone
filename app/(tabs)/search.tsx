import {
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useState } from "react";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { Ionicons } from "@expo/vector-icons";


const SafeAreaView = styled(RNSafeAreaView);

export default function Search() {

    const [searchText, setSearchText] = useState("");
  

  return (
    <SafeAreaView className="flex-1 p-5">
      <View className="px-2 py-2">
        <View className="flex-row items-center bg-gray-100 rounded-2xl px-4 py-2 border border-gray-200">
          <Ionicons name="search-outline" size={20} color="#9ca3af" />
          <TextInput
            placeholder="Search characters or messages"
            className="flex-1 ml-3 text-base text-gray-800"
            placeholderTextColor="#9ca3af"
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
