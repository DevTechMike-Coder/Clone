import React from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { radius } from "@/constants/theme";
import { PressableScale, PressableScaleProps } from "./PressableScale";
import { Text } from "./Text";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<PressableScaleProps, "children"> {
  title?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  children,
  fullWidth = false,
  style,
  ...props
}) => {
  const { palette } = useTheme();
  const isDisabled = disabled || loading;

  // Sizes: sm (36 height, 44 min touch hitSlop), md (44 height), lg (52 height)
  let height = 44;
  let paddingHorizontal = 16;
  let textVariant: "caption" | "bodyMedium" | "headline" = "bodyMedium";

  if (size === "sm") {
    height = 36;
    paddingHorizontal = 12;
    textVariant = "caption";
  } else if (size === "lg") {
    height = 52;
    paddingHorizontal = 20;
    textVariant = "headline";
  }

  // Variant styles
  let backgroundColor: string = palette.accent;
  let textColor: string = palette.onAccent;
  let borderColor: string = "transparent";
  let borderWidth = 0;

  switch (variant) {
    case "primary":
      backgroundColor = palette.accent;
      textColor = palette.onAccent;
      break;
    case "secondary":
      backgroundColor = palette.surfaceMuted;
      textColor = palette.text;
      break;
    case "outline":
      backgroundColor = "transparent";
      borderColor = palette.border;
      borderWidth = 1;
      textColor = palette.text;
      break;
    case "ghost":
      backgroundColor = "transparent";
      textColor = palette.text;
      break;
    case "danger":
      backgroundColor = palette.danger;
      textColor = palette.onAccent;
      break;
  }

  return (
    <PressableScale
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      hitSlop={size === "sm" ? { top: 4, bottom: 4, left: 4, right: 4 } : undefined}
      style={[
        styles.base,
        {
          height,
          paddingHorizontal,
          backgroundColor,
          borderColor,
          borderWidth,
          opacity: isDisabled ? 0.55 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
          {title ? (
            <Text
              variant={textVariant}
              weight="semibold"
              style={{ color: textColor }}
            >
              {title}
            </Text>
          ) : (
            children
          )}
          {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
        </View>
      )}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
