import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StoryRing as StoryRingType } from "@/services/storyService";

type Props = {
  ring: StoryRingType;
  isFirst?: boolean;
  onCreateStory?: () => void;
  onPress?: () => void;
};

/**
 * Instagram-style story ring. A colourful gradient border around an avatar.
 * Viewed stories show a grey border; the first slot is the "Add Story" CTA.
 */
export default function StoryRing({ ring, isFirst, onCreateStory, onPress }: Props) {
  if (isFirst) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onCreateStory}
        className="items-center mr-4"
        style={{ width: 72 }}
      >
        <View className="relative">
          <View className="w-16 h-16 rounded-full bg-slate-200 items-center justify-center border-[2.5px] border-white overflow-hidden">
            {ring.avatar_url ? (
              <Image
                source={{ uri: ring.avatar_url }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <Image
                source={require("@/assets/homeIcons/profileUser.png")}
                style={{ width: 30, height: 30, tintColor: "#94A3B8" }}
                resizeMode="contain"
              />
            )}
          </View>
          <View className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-blue-600 items-center justify-center border-[2.5px] border-white">
            <Text className="text-white text-base font-bold leading-none" style={{ marginTop: -1 }}>+</Text>
          </View>
        </View>
        <Text numberOfLines={1} className="text-[11px] text-slate-700 mt-1.5 font-medium">
          Your story
        </Text>
      </TouchableOpacity>
    );
  }

  const viewed = !ring.has_unviewed;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="items-center mr-4"
      style={{ width: 72 }}
    >
      <LinearGradient
        colors={viewed ? ["#CBD5E1", "#CBD5E1"] : ["#F59E0B", "#EC4899", "#8B5CF6", "#3B82F6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="w-[70px] h-[70px] rounded-full items-center justify-center"
      >
        <View className="w-16 h-16 rounded-full bg-white items-center justify-center overflow-hidden">
          {ring.avatar_url ? (
            <Image
              source={{ uri: ring.avatar_url }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <Image
              source={require("@/assets/homeIcons/profileUser.png")}
              style={{ width: 30, height: 30, tintColor: "#94A3B8" }}
              resizeMode="contain"
            />
          )}
        </View>
      </LinearGradient>
      <Text numberOfLines={1} className="text-[11px] text-slate-700 mt-1.5 font-medium">
        {ring.username}
      </Text>
    </TouchableOpacity>
  );
}
