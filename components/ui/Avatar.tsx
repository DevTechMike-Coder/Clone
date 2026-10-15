import React, { useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/context/ThemeContext";
import { storyRingGradient, storyRingViewed } from "@/constants/theme";
import { Text } from "./Text";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface AvatarProps {
  url?: string | null;
  name?: string | null;
  size?: AvatarSize | number;
  hasStory?: boolean;
  isStoryViewed?: boolean;
  style?: ViewStyle;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
  "2xl": 96,
};

export const Avatar: React.FC<AvatarProps> = ({
  url,
  name,
  size = "md",
  hasStory = false,
  isStoryViewed = false,
  style,
}) => {
  const { palette } = useTheme();
  const [hasError, setHasError] = useState(false);

  const dimension = typeof size === "number" ? size : SIZE_MAP[size] || 40;
  const initial = (name || "U").trim().charAt(0).toUpperCase();

  const fontSize = Math.max(10, Math.floor(dimension * 0.42));

  const imageContent = (
    <View
      style={[
        styles.avatarContainer,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: palette.surfaceMuted,
        },
      ]}
    >
      {url && !hasError ? (
        <Image
          source={{ uri: url }}
          style={{ width: dimension, height: dimension, borderRadius: dimension / 2 }}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
          onError={() => setHasError(true)}
        />
      ) : (
        <Text
          variant="headline"
          weight="semibold"
          style={{
            fontSize,
            lineHeight: fontSize * 1.2,
            color: palette.muted,
          }}
        >
          {initial}
        </Text>
      )}
    </View>
  );

  if (!hasStory) {
    return <View style={style}>{imageContent}</View>;
  }

  // Story ring gradient wrapping
  const ringPadding = dimension >= 56 ? 3 : 2;
  const outerDimension = dimension + ringPadding * 2 + 2;
  const gradientColors = isStoryViewed ? storyRingViewed : storyRingGradient;

  return (
    <View style={style}>
      <LinearGradient
        colors={gradientColors as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.ring,
          {
            width: outerDimension,
            height: outerDimension,
            borderRadius: outerDimension / 2,
            padding: ringPadding,
          },
        ]}
      >
        <View
          style={[
            styles.innerRing,
            {
              backgroundColor: palette.background,
              borderRadius: (dimension + 4) / 2,
              padding: 1.5,
            },
          ]}
        >
          {imageContent}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  avatarContainer: {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  ring: {
    justifyContent: "center",
    alignItems: "center",
  },
  innerRing: {
    justifyContent: "center",
    alignItems: "center",
  },
});
