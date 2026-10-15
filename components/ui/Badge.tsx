import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { radius } from "@/constants/theme";
import { Text } from "./Text";

export type BadgeVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "success"
  | "warning"
  | "verified";

export interface BadgeProps {
  content?: string | number;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  content,
  variant = "primary",
  size = "md",
  dot = false,
  style,
}) => {
  const { palette } = useTheme();

  if (variant === "verified") {
    return (
      <View style={[styles.verifiedWrapper, style]}>
        <Ionicons name="checkmark-circle" size={16} color={palette.accent} />
      </View>
    );
  }

  let backgroundColor: string = palette.accent;
  let textColor = palette.onAccent;

  switch (variant) {
    case "primary":
      backgroundColor = palette.accent;
      break;
    case "secondary":
      backgroundColor = palette.surfaceMuted;
      textColor = palette.text;
      break;
    case "danger":
      backgroundColor = palette.danger;
      break;
    case "success":
      backgroundColor = palette.success;
      break;
    case "warning":
      backgroundColor = palette.warning;
      break;
  }

  if (dot) {
    const dotSize = size === "sm" ? 6 : 8;
    return (
      <View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor,
          },
          style,
        ]}
      />
    );
  }

  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor,
          paddingHorizontal: isSmall ? 5 : 7,
          paddingVertical: isSmall ? 1 : 2,
          minWidth: isSmall ? 16 : 20,
        },
        style,
      ]}
    >
      <Text
        variant="micro"
        weight="bold"
        style={{
          color: textColor,
          fontSize: isSmall ? 10 : 11,
          lineHeight: isSmall ? 12 : 14,
          textAlign: "center",
        }}
      >
        {content}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  dot: {
    alignSelf: "flex-start",
  },
  verifiedWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
});
