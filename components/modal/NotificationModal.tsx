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
  // Determine badge styling based on type
  const getBadgeConfig = () => {
    switch (type) {
      case "success":
        return {
          bg: "bg-emerald-50 border border-emerald-100",
          icon: icon || ("checkmark-circle" as const),
          iconColor: colors.emerald[600],
        };
      case "warning":
        return {
          bg: "bg-amber-50 border border-amber-100",
          icon: icon || ("alert-circle" as const),
          iconColor: colors.amber[500],
        };
      case "error":
        return {
          bg: "bg-red-50 border border-red-100",
          icon: icon || ("warning" as const),
          iconColor: colors.red[500],
        };
      case "info":
      default:
        return {
          bg: "bg-blue-50 border border-blue-100",
          icon: icon || ("information-circle" as const),
          iconColor: colors.blue[600],
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
      <View className="flex-1 bg-black/60 items-center justify-center p-6">
        {/* Backdrop Tap */}
        <TouchableWithoutFeedback onPress={onCancel || onConfirm}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        {/* Modal Card */}
        <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl items-center border border-slate-100">
          {/* Top Icon Badge */}
          <View
            className={`w-14 h-14 rounded-2xl items-center justify-center mb-4 ${badge.bg}`}
          >
            <Ionicons name={badge.icon} size={28} color={badge.iconColor} />
          </View>

          {/* Title */}
          <Text className="text-lg font-bold text-slate-900 tracking-tight text-center">
            {title}
          </Text>

          {/* Message */}
          <Text className="text-sm text-slate-500 mt-2 text-center leading-relaxed mb-6">
            {message}
          </Text>

          {/* Actions */}
          <View className="flex-row gap-3 w-full">
            {cancelText ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onCancel}
                className="flex-1 py-3.5 rounded-xl border border-slate-200 bg-slate-100 items-center justify-center"
              >
                <Text className="text-sm font-semibold text-slate-700">
                  {cancelText}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onConfirm}
              className={`flex-1 py-3.5 rounded-xl items-center justify-center shadow-sm ${
                destructive ? "bg-red-500" : "bg-blue-600"
              }`}
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
