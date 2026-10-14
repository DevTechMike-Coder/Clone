import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";

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
  const { isDark, palette } = useTheme();

  // Determine badge styling based on type
  const getBadgeConfig = () => {
    switch (type) {
      case "success":
        return {
          bg: isDark ? "bg-emerald-950/70 border-emerald-800" : "bg-emerald-50 border-emerald-100",
          icon: icon || ("checkmark-circle" as const),
          iconColor: isDark ? colors.emerald[400] : colors.emerald[600],
        };
      case "warning":
        return {
          bg: isDark ? "bg-amber-950/70 border-amber-800" : "bg-amber-50 border-amber-100",
          icon: icon || ("alert-circle" as const),
          iconColor: colors.amber[500],
        };
      case "error":
        return {
          bg: isDark ? "bg-red-950/70 border-red-800" : "bg-red-50 border-red-100",
          icon: icon || ("warning" as const),
          iconColor: colors.red[500],
        };
      case "info":
      default:
        return {
          bg: isDark ? "bg-blue-950/70 border-blue-800" : "bg-blue-50 border-blue-100",
          icon: icon || ("information-circle" as const),
          iconColor: isDark ? colors.blue[400] : colors.blue[600],
        };
    }
  };

  const badge = getBadgeConfig();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel || onConfirm}
      statusBarTranslucent
    >
      <View
        className="flex-1 items-center justify-center p-6"
        style={{ backgroundColor: palette.overlay }}
      >
        {/* Backdrop Tap */}
        <TouchableWithoutFeedback onPress={onCancel || onConfirm}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        {/* Modal Card */}
        <View
          className="rounded-3xl p-6 w-full max-w-sm shadow-2xl items-center border"
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.border,
          }}
        >
          {/* Top Icon Badge */}
          <View
            className={`w-14 h-14 rounded-2xl items-center justify-center mb-4 border ${badge.bg}`}
          >
            <Ionicons name={badge.icon} size={28} color={badge.iconColor} />
          </View>

          {/* Title */}
          <Text
            className="text-lg font-bold tracking-tight text-center"
            style={{ color: palette.text }}
          >
            {title}
          </Text>

          {/* Message */}
          <Text
            className="text-sm mt-2 text-center leading-relaxed mb-6"
            style={{ color: palette.muted }}
          >
            {message}
          </Text>

          {/* Actions */}
          <View className="flex-row gap-3 w-full">
            {cancelText ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onCancel}
                className="flex-1 py-3.5 rounded-xl border items-center justify-center"
                style={{
                  backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
                  borderColor: palette.border,
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{ color: palette.text }}
                >
                  {cancelText}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onConfirm}
              className="flex-1 py-3.5 rounded-xl items-center justify-center shadow-sm"
              style={{
                backgroundColor: destructive ? colors.red[500] : palette.primary,
              }}
            >
              <Text className="text-sm font-bold text-white">
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
