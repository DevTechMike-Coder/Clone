import { router } from "expo-router";
import React from "react";
import {
  FlatList,
  Image,
  ImageSourcePropType,
  ListRenderItemInfo,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; // <-- Add this

type CardItem = {
  id: string;
  name: string;
  description: string;
  image: ImageSourcePropType;
};

type IndexVideoFeedProps = {
  onOptionsPress: (item: CardItem) => void;
};

const FEED_ITEMS: CardItem[] = [
  { id: "1", name: "John", description: "Lorem ipsum dolor sit amet consectetur adipisicing elit. Perspiciatis doloremque ut at commodi, natus sit amet.", image: require("@/assets/test/5624808.jpg") },
  { id: "2", name: "Amara", description: "Omnis alias optio modi? Non culpa ut voluptatem explicabo doloremque excepturi tenetur?", image: require("@/assets/test/5624808.jpg") },
  { id: "3", name: "Micah", description: "Eos aspernatur, omnis alias optio modi. Natus sit amet, perspiciatis doloremque.", image: require("@/assets/test/5624808.jpg") },
];

const IndexVideoFeed = ({ onOptionsPress }: IndexVideoFeedProps) => {
  const openMenu = (item: CardItem) => onOptionsPress(item);

  const renderItem = ({ item }: ListRenderItemInfo<CardItem>) => (
    <View className="flex-row items-start gap-3">
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push("/profile")}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.name}'s profile`}
        className="h-14 w-14 items-center justify-center rounded-full border border-gray-300 bg-white"
      >
        <Image source={require("@/assets/homeIcons/profileUser.png")} className="h-10 w-10" resizeMode="contain" />
      </TouchableOpacity>

      <View className="flex-1 gap-3">
        <View className="gap-1">
          <Text className="text-base font-bold text-gray-900">{item.name}</Text>
          <Text className="text-sm leading-5 text-gray-600">{item.description}</Text>
        </View>

        <View className="relative overflow-hidden rounded-2xl bg-gray-200">
          <Image source={item.image} className="h-56 w-full" resizeMode="cover" />
        </View>

        {/* Action Bar */}
        <View className="flex-row items-center justify-between py-1">
          <TouchableOpacity className="flex-row items-center gap-1" activeOpacity={0.7}>
            <Image source={require("@/assets/homeIcons/heart.png")} className="h-6 w-6" resizeMode="contain" />
            <Text className="text-xs text-gray-600">1.2k</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}>
            <Image source={require("@/assets/homeIcons/bubbleChat.png")} className="h-6 w-6" resizeMode="contain" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}>
            <Image source={require("@/assets/homeIcons/repeat.png")} className="h-6 w-6" resizeMode="contain" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}>
            <Image source={require("@/assets/homeIcons/share.png")} className="h-6 w-6" resizeMode="contain" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}>
            <Image source={require("@/assets/homeIcons/bookmark.png")} className="h-6 w-6" resizeMode="contain" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => openMenu(item)}
        accessibilityRole="button"
        accessibilityLabel={`Open menu for ${item.name}`}
        className="h-10 w-10 items-center justify-center rounded-full bg-gray-50"
      >
        <Image source={require("@/assets/homeIcons/menuV.png")} className="h-6 w-6" resizeMode="contain" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 pt-5">
      <FlatList
        data={FEED_ITEMS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View className="h-5" />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default IndexVideoFeed;