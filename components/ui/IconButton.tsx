import React from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { radius } from "@/constants/theme";
import { PressableScale, PressableScaleProps } from "./PressableScale";

export type IconButtonVariant = "ghost" | "filled" | "tinted" | "primary";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends Omit<PressableScaleProps, "children"> {
  icon: React.ReactNode;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  disabled?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  accessibilityLabel,
  variant = "ghost",
  size = "md",
  disabled = false,
  style,
  ...props
}) => {
  const { palette } = useTheme();

  // All sizes maintain at least 44x44 minimum touch target
  let dimension = 44;
  if (size === "lg") dimension = 48;

  let backgroundColor = "transparent";
  let borderColor = "transparent";
  let borderWidth = 0;

  switch (variant) {
    case "filled":
      backgroundColor = palette.surfaceMuted;
      break;
    case "tinted":
      backgroundColor = palette.surfaceElevated;
      borderColor = palette.borderSubtle;
      borderWidth = 1;
      break;
    case "primary":
      backgroundColor = palette.accent;
      break;
    case "ghost":
    default:
      backgroundColor = "transparent";
      break;
  }

  return (
    <PressableScale
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.base,
        {
          width: dimension,
          height: dimension,
          backgroundColor,
          borderColor,
          borderWidth,
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
      {...props}
    >
      {icon}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
});
