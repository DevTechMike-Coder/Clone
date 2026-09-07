import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ToastConfig, ToastConfigParams } from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/constants/theme";

export const toastConfig: ToastConfig = {
  success: ({ text1, text2, onPress }: ToastConfigParams<any>) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className="w-[92%] bg-white rounded-2xl p-3.5 px-4 shadow-lg border border-emerald-100 flex-row items-center gap-3.5"
      style={{
        shadowColor: "#059669",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <View className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 items-center justify-center">
        <Ionicons name="checkmark-circle" size={22} color={colors.emerald[600]} />
      </View>
      <View className="flex-1 pr-1">
        {text1 ? (
          <Text className="text-sm font-bold text-slate-900 tracking-tight">
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text className="text-xs text-slate-500 mt-0.5 leading-4">
            {text2}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  ),

  error: ({ text1, text2, onPress }: ToastConfigParams<any>) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className="w-[92%] bg-white rounded-2xl p-3.5 px-4 shadow-lg border border-red-100 flex-row items-center gap-3.5"
      style={{
        shadowColor: "#DC2626",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <View className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 items-center justify-center">
        <Ionicons name="alert-circle" size={22} color={colors.red[500]} />
      </View>
      <View className="flex-1 pr-1">
        {text1 ? (
          <Text className="text-sm font-bold text-slate-900 tracking-tight">
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text className="text-xs text-slate-500 mt-0.5 leading-4">
            {text2}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  ),

  info: ({ text1, text2, onPress }: ToastConfigParams<any>) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      className="w-[92%] bg-white rounded-2xl p-3.5 px-4 shadow-lg border border-blue-100 flex-row items-center gap-3.5"
      style={{
        shadowColor: "#2563EB",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <View className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 items-center justify-center">
        <Ionicons name="information-circle" size={22} color={colors.blue[600]} />
      </View>
      <View className="flex-1 pr-1">
        {text1 ? (
          <Text className="text-sm font-bold text-slate-900 tracking-tight">
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text className="text-xs text-slate-500 mt-0.5 leading-4">
            {text2}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  ),
};
