import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { storyRingGradient, storyRingViewed } from "@/constants/theme";
import { StoryRing as StoryRingType } from "@/services/storyService";
import { Text } from "@/components/ui/Text";

type Props = {
  ring: StoryRingType;
  isFirst?: boolean;
  onCreateStory?: () => void;
  onPress?: () => void;
};

/**
 * Instagram-style story ring with full dark/light theme support.
 */
export default function StoryRing({
  ring,
  isFirst,
  onCreateStory,
  onPress,
}: Props) {
  const { palette } = useTheme();

  if (isFirst) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onCreateStory}
        accessibilityRole="button"
        accessibilityLabel="Add your story"
        style={styles.container}
      >
        <View style={styles.avatarWrapper}>
          <View
            style={[
              styles.avatarCircle,
              {
                backgroundColor: palette.surfaceMuted,
                borderColor: palette.background,
              },
            ]}
          >
            {ring.avatar_url ? (
              <Image
                source={{ uri: ring.avatar_url }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={150}
              />
            ) : (
              <Ionicons name="person" size={28} color={palette.muted} />
            )}
          </View>

          {/* Plus Badge */}
          <View
            style={[
              styles.plusBadge,
              {
                backgroundColor: palette.accent,
                borderColor: palette.background,
              },
            ]}
          >
            <Ionicons name="add" size={14} color={palette.onAccent} />
          </View>
        </View>

        <Text
          variant="micro"
          weight="medium"
          numberOfLines={1}
          style={styles.usernameText}
        >
          Your story
        </Text>
      </TouchableOpacity>
    );
  }

  const viewed = !ring.has_unviewed;
  const gradientColors = viewed ? storyRingViewed : storyRingGradient;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${ring.username}'s story`}
      style={styles.container}
    >
      <LinearGradient
        colors={gradientColors as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientRing}
      >
        <View
          style={[
            styles.innerAvatarContainer,
            { backgroundColor: palette.background },
          ]}
        >
          {ring.avatar_url ? (
            <Image
              source={{ uri: ring.avatar_url }}
              style={styles.avatarImage}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <Ionicons name="person" size={28} color={palette.muted} />
          )}
        </View>
      </LinearGradient>

      <Text
        variant="micro"
        weight="medium"
        numberOfLines={1}
        style={styles.usernameText}
      >
        {ring.username}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginRight: 14,
    width: 68,
  },
  avatarWrapper: {
    position: "relative",
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  plusBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  gradientRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  innerAvatarContainer: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  usernameText: {
    marginTop: 5,
    textAlign: "center",
    maxWidth: 68,
  },
});
