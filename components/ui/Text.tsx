import React from "react";
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { typography, lightPalette, darkPalette } from "@/constants/theme";

export type TextVariant =
  | "display"
  | "title"
  | "headline"
  | "body"
  | "bodyMedium"
  | "caption"
  | "micro";

export type TextColor =
  | "default"
  | "muted"
  | "placeholder"
  | "accent"
  | "danger"
  | "warning"
  | "success"
  | "inverse"
  | "white";

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  weight?: "regular" | "medium" | "semibold" | "bold";
  align?: "auto" | "left" | "right" | "center" | "justify";
  children?: React.ReactNode;
}

export const Text: React.FC<TextProps> = ({
  variant = "body",
  color = "default",
  weight,
  align,
  style,
  children,
  maxFontSizeMultiplier = 1.3,
  ...props
}) => {
  const { palette, isDark } = useTheme();

  const variantStyle = typography[variant] || typography.body;

  // Resolve custom weight font family override if explicitly passed
  let resolvedFontFamily = variantStyle.fontFamily;
  if (weight === "regular") resolvedFontFamily = "PlusJakartaSans_400Regular";
  if (weight === "medium") resolvedFontFamily = "PlusJakartaSans_500Medium";
  if (weight === "semibold") resolvedFontFamily = "PlusJakartaSans_600SemiBold";
  if (weight === "bold") resolvedFontFamily = "PlusJakartaSans_700Bold";

  // Resolve semantic color
  let textColor = palette.text;
  switch (color) {
    case "muted":
      textColor = palette.muted;
      break;
    case "placeholder":
      textColor = palette.placeholder;
      break;
    case "accent":
      textColor = palette.accent;
      break;
    case "danger":
      textColor = palette.danger;
      break;
    case "warning":
      textColor = palette.warning;
      break;
    case "success":
      textColor = palette.success;
      break;
    case "inverse":
      textColor = isDark ? lightPalette.text : darkPalette.text;
      break;
    case "white":
      textColor = palette.onAccent;
      break;
    case "default":
    default:
      textColor = palette.text;
      break;
  }

  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        {
          fontSize: variantStyle.fontSize,
          lineHeight: variantStyle.lineHeight,
          fontFamily: resolvedFontFamily,
          color: textColor,
          textAlign: align,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
};
