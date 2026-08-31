import React from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  post: {
    media_url: string;
    media_type?: "video" | "image" | null;
  };
  className?: string;
};

/**
 * Small grid/explore thumbnail. Videos get a play badge instead of being
 * rendered as a broken static image. Video playback happens on the full
 * post screen where we actually have audio controls.
 */
export default function PostGridThumbnail({ post, className = "" }: Props) {
  return (
    <View className={`w-full h-full relative ${className}`}>
      <Image
        source={{ uri: post.media_url }}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        transition={200}
      />

      {post.media_type === "video" && (
        <>
          <View className="absolute inset-0 bg-black/25" />
          <View className="absolute inset-0 items-center justify-center">
            <View className="w-10 h-10 rounded-full bg-black/50 items-center justify-center border border-white/30">
              <Ionicons name="play" size={18} color="white" />
            </View>
          </View>
          <View className="absolute bottom-1.5 right-1.5 bg-black/60 rounded-md px-1.5 py-0.5">
            <Ionicons name="videocam" size={11} color="white" />
          </View>
        </>
      )}
    </View>
  );
}
