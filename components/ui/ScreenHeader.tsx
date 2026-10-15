import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { Text } from "./Text";
import { IconButton } from "./IconButton";

export interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  borderBottom?: boolean;
  style?: ViewStyle;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  showBack = true,
  onBackPress,
  leftAction,
  rightAction,
  borderBottom = true,
  style,
}) => {
  const router = useRouter();
  const { palette } = useTheme();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.background,
          borderBottomColor: borderBottom ? palette.borderSubtle : "transparent",
          borderBottomWidth: borderBottom ? StyleSheet.hairlineWidth : 0,
        },
        style,
      ]}
    >
      <View style={styles.left}>
        {leftAction ? (
          leftAction
        ) : showBack ? (
          <IconButton
            icon={<Ionicons name="chevron-back" size={24} color={palette.text} />}
            accessibilityLabel="Go back"
            onPress={handleBack}
          />
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <View style={styles.center}>
        {title && (
          <Text
            variant="headline"
            weight="semibold"
            numberOfLines={1}
            align="center"
          >
            {title}
          </Text>
        )}
        {subtitle && (
          <Text
            variant="micro"
            color="muted"
            numberOfLines={1}
            align="center"
          >
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.right}>
        {rightAction ? rightAction : <View style={styles.placeholder} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  left: {
    width: 48,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  right: {
    width: 48,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  placeholder: {
    width: 44,
    height: 44,
  },
});
