import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ToastConfig, ToastConfigParams } from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { colors } from "@/constants/theme";

const SuccessToast = ({ text1, text2, onPress }: ToastConfigParams<any>) => {
  const { isDark, palette } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className={`w-[92%] rounded-2xl p-3.5 px-4 shadow-lg border flex-row items-center gap-3.5 ${
        isDark
          ? "bg-slate-900 border-emerald-900/60"
          : "bg-white border-emerald-100"
      }`}
      style={{
        shadowColor: "#059669",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.25 : 0.12,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <View
        className={`w-10 h-10 rounded-xl items-center justify-center border ${
          isDark
            ? "bg-emerald-950/70 border-emerald-800"
            : "bg-emerald-50 border-emerald-100"
        }`}
      >
        <Ionicons
          name="checkmark-circle"
          size={22}
          color={isDark ? colors.emerald[500] : colors.emerald[600]}
        />
      </View>
      <View className="flex-1 pr-1">
        {text1 ? (
          <Text
            className={`text-sm font-bold tracking-tight ${
              isDark ? "text-slate-100" : "text-slate-900"
            }`}
          >
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text
            className={`text-xs mt-0.5 leading-4 ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {text2}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const ErrorToast = ({ text1, text2, onPress }: ToastConfigParams<any>) => {
  const { isDark, palette } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className={`w-[92%] rounded-2xl p-3.5 px-4 shadow-lg border flex-row items-center gap-3.5 ${
        isDark
          ? "bg-slate-900 border-red-900/60"
          : "bg-white border-red-100"
      }`}
      style={{
        shadowColor: "#DC2626",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.25 : 0.12,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <View
        className={`w-10 h-10 rounded-xl items-center justify-center border ${
          isDark
            ? "bg-red-950/70 border-red-800"
            : "bg-red-50 border-red-100"
        }`}
      >
        <Ionicons name="alert-circle" size={22} color={colors.red[500]} />
      </View>
      <View className="flex-1 pr-1">
        {text1 ? (
          <Text
            className={`text-sm font-bold tracking-tight ${
              isDark ? "text-slate-100" : "text-slate-900"
            }`}
          >
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text
            className={`text-xs mt-0.5 leading-4 ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {text2}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const InfoToast = ({ text1, text2, onPress }: ToastConfigParams<any>) => {
  const { isDark, palette } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className={`w-[92%] rounded-2xl p-3.5 px-4 shadow-lg border flex-row items-center gap-3.5 ${
        isDark
          ? "bg-slate-900 border-blue-900/60"
          : "bg-white border-blue-100"
      }`}
      style={{
        shadowColor: "#2563EB",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.25 : 0.12,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <View
        className={`w-10 h-10 rounded-xl items-center justify-center border ${
          isDark
            ? "bg-blue-950/70 border-blue-800"
            : "bg-blue-50 border-blue-100"
        }`}
      >
        <Ionicons
          name="information-circle"
          size={22}
          color={isDark ? colors.blue[400] : colors.blue[600]}
        />
      </View>
      <View className="flex-1 pr-1">
        {text1 ? (
          <Text
            className={`text-sm font-bold tracking-tight ${
              isDark ? "text-slate-100" : "text-slate-900"
            }`}
          >
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text
            className={`text-xs mt-0.5 leading-4 ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            {text2}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

export const toastConfig: ToastConfig = {
  success: (props) => <SuccessToast {...props} />,
  error: (props) => <ErrorToast {...props} />,
  info: (props) => <InfoToast {...props} />,
};
