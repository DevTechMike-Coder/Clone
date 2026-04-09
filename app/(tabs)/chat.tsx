import {
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

const SafeAreaView = styled(RNSafeAreaView);

export default function Chat() {
  const [menuVisible, setVisible] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [searchText, setSearchText] = useState("");
  const menuIconRef = useRef(null);

  const openMenu = () => {
    menuIconRef.current?.measure((fx, fy, width, height, px, py) => {
      setMenuPos({ x: px - 160 + width, y: py + height + 6 });
      setVisible(true);
    });
  };

  const menuOptions = [
    { label: "New Group", onPress: () => {} },
    { label: "New Broadcast", onPress: () => {} },
    { label: "Starred Messages", onPress: () => {} },
    { label: "Settings", onPress: () => {} },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* --- Header Section --- */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <TouchableOpacity
          onPress={() => router.push("/followpage")}
          activeOpacity={0.7}
          className="w-13 h-13 items-center justify-center rounded-full bg-gray-50"
        >
          <Image
            source={require("@/assets/homeIcons/add-user.png")}
            className="w-10 h-10"
            resizeMode="contain"
          />
        </TouchableOpacity>

        <Text className="text-xl font-bold uppercase tracking-tighter text-blue-500">
          Messages
        </Text>

        <TouchableOpacity
          ref={menuIconRef}
          onPress={openMenu}
          activeOpacity={0.7}
          className="w-10 h-10 items-center justify-center rounded-full bg-gray-50"
        >
          <Image
            source={require("@/assets/homeIcons/menuV.png")}
            className="w-6 h-6"
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* --- Search Bar Section --- */}
      <View className="px-5 py-2">
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

      {/* --- Main Content Section --- */}
      <View className="flex-1 mt-4 px-5">
        <Text className="text-lg font-semibold text-gray-400 text-center mt-5">
          No recent messages.{"\n"}Start a new conversation!
        </Text>
      </View>

      <Modal transparent visible={menuVisible} animationType="fade">
        <Pressable 
          className="flex-1 bg-black/10" 
          onPress={() => setVisible(false)} 
        />

        <View
          className="absolute w-52 bg-white rounded-2xl overflow-hidden shadow-2xl border border-gray-100"
          style={{ 
            top: menuPos.y, 
            right: 20, 
            elevation: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 20
          }}
        >
          {menuOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                setVisible(false);
                option.onPress();
              }}
              className={`flex-row items-center gap-3 px-5 py-4 
                ${index < menuOptions.length - 1 ? "border-b border-gray-50" : ""}
              `}
            >
              <Text className="text-base font-medium text-gray-700">
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
