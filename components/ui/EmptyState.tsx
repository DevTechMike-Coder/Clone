import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { radius } from "@/constants/theme";
import { Text } from "./Text";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionTitle?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionTitle,
  onActionPress,
  style,
}) => {
  const { palette } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {icon && (
        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: palette.surfaceMuted },
          ]}
        >
          {icon}
        </View>
      )}

      <Text
        variant="headline"
        weight="semibold"
        align="center"
        style={styles.title}
      >
        {title}
      </Text>

      {description && (
        <Text
          variant="body"
          color="muted"
          align="center"
          style={styles.description}
        >
          {description}
        </Text>
      )}

      {actionTitle && onActionPress && (
        <Button
          title={actionTitle}
          variant="primary"
          size="md"
          onPress={onActionPress}
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 20,
    maxWidth: 280,
  },
  button: {
    marginTop: 4,
  },
});
