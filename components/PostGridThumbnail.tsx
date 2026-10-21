import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

type Props = {
  post: {
    media_url: string;
    media_type?: "video" | "image" | null;
  };
  style?: ViewStyle;
  className?: string;
};

/**
 * Small grid/explore thumbnail with sleek video indicator badges.
 */
export default function PostGridThumbnail({ post, style }: Props) {
  return (
    <View style={[styles.container, style]}>
      <Image
        source={{ uri: post.media_url }}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />

      {post.media_type === "video" && (
        <>
          <View style={styles.videoOverlay} />
          <View style={styles.centerBadgeWrapper}>
            <View style={styles.centerPlayBadge}>
              <Ionicons name="play" size={18} color={colors.white} />
            </View>
          </View>
          <View style={styles.cornerVideoBadge}>
            <Ionicons name="videocam" size={11} color={colors.white} />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    position: "relative",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  centerBadgeWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  centerPlayBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  cornerVideoBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
});
