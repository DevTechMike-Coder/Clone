import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { Dialog } from "@/components/ui/Dialog";

export type NotificationModalProps = {
  visible: boolean;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  icon?: keyof typeof Ionicons.glyphMap;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  destructive?: boolean;
};

export default function NotificationModal({
  visible,
  title,
  message,
  type = "info",
  icon,
  confirmText = "OK",
  cancelText,
  onConfirm,
  onCancel,
  destructive = false,
}: NotificationModalProps) {
  const { isDark } = useTheme();

  const getBadgeConfig = () => {
    switch (type) {
      case "success":
        return {
          bgColor: isDark ? colors.emerald[950] : colors.emerald[50],
          borderColor: isDark ? colors.emerald[800] : colors.emerald[100],
          iconName: icon || ("checkmark-circle" as const),
          iconColor: isDark ? colors.emerald[400] : colors.emerald[600],
        };
      case "warning":
        return {
          bgColor: isDark ? colors.amber[950] : colors.amber[50],
          borderColor: isDark ? colors.amber[800] : colors.amber[100],
          iconName: icon || ("alert-circle" as const),
          iconColor: colors.amber[500],
        };
      case "error":
        return {
          bgColor: isDark ? colors.red[950] : colors.red[50],
          borderColor: isDark ? colors.red[800] : colors.red[100],
          iconName: icon || ("warning" as const),
          iconColor: colors.red[500],
        };
      case "info":
      default:
        return {
          bgColor: isDark ? colors.blue[950] : colors.blue[50],
          borderColor: isDark ? colors.blue[800] : colors.blue[100],
          iconName: icon || ("information-circle" as const),
          iconColor: isDark ? colors.blue[400] : colors.blue[600],
        };
    }
  };

  const badge = getBadgeConfig();

  const iconElement = (
    <View
      style={[
        styles.iconBadge,
        {
          backgroundColor: badge.bgColor,
          borderColor: badge.borderColor,
        },
      ]}
    >
      <Ionicons name={badge.iconName} size={28} color={badge.iconColor} />
    </View>
  );

  return (
    <Dialog
      visible={visible}
      onClose={onCancel || onConfirm}
      title={title}
      message={message}
      icon={iconElement}
      confirmText={confirmText}
      onConfirm={onConfirm}
      cancelText={cancelText}
      onCancel={onCancel}
      destructive={destructive}
    />
  );
}

const styles = StyleSheet.create({
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
