import React, { useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { styled } from "nativewind";
import { router } from "expo-router";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { authService } from "@/services/authService";
import { colors } from "@/constants/theme";
import Toast from "react-native-toast-message";

const SafeAreaView = styled(RNSafeAreaView);

export default function AccountOwnership() {
  const [selectedOption, setSelectedOption] = useState<"deactivate" | "delete">(
    "deactivate"
  );
  const [processing, setProcessing] = useState(false);

  const handleContinue = () => {
    if (selectedOption === "deactivate") {
      Alert.alert(
        "Deactivate Account?",
        "Deactivating your account is temporary. Your profile, posts, comments, and likes will be hidden until you reactivate it by signing in again.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Deactivate",
            style: "destructive",
            onPress: async () => {
              setProcessing(true);
              try {
                await authService.signOut();
                Toast.show({
                  type: "info",
                  text1: "Account Deactivated",
                  text2: "You have been logged out. Log back in anytime to reactivate.",
                });
                router.replace("/(auth)/signIn" as any);
              } catch (err: any) {
                Toast.show({
                  type: "error",
                  text1: "Error",
                  text2: err?.message || "Failed to deactivate account.",
                });
              } finally {
                setProcessing(false);
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        "Delete Account Permanently?",
        "This action is permanent and cannot be undone. All your posts, stories, messages, and profile data will be permanently removed.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Permanently Delete",
            style: "destructive",
            onPress: async () => {
              setProcessing(true);
              try {
                await authService.signOut();
                Toast.show({
                  type: "success",
                  text1: "Account Deletion Requested",
                  text2: "Your account and data have been scheduled for deletion.",
                });
                router.replace("/(auth)/signIn" as any);
              } catch (err: any) {
                Toast.show({
                  type: "error",
                  text1: "Error",
                  text2: err?.message || "Failed to delete account.",
                });
              } finally {
                setProcessing(false);
              }
            },
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3 border-b border-slate-200 bg-white">
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="w-10 h-10 rounded-full items-center justify-center -ml-2 active:bg-slate-100"
        >
          <Ionicons name="arrow-back" size={24} color={colors.slate[800]} />
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-base font-bold text-slate-900 tracking-tight">
            Account Ownership
          </Text>
        </View>

        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Description */}
        <View className="px-5 pt-6 pb-4">
          <Text className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Deactivating or deleting your Clone account
          </Text>
          <Text className="text-sm text-slate-500 mt-2 leading-relaxed">
            If you want to take a break from Clone, you can temporarily deactivate
            your account. If you want to permanently delete your account, let us
            know.
          </Text>
        </View>

        {/* Options */}
        <View className="px-5 mt-2 gap-4">
          {/* Deactivate Option */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setSelectedOption("deactivate")}
            className={`p-5 rounded-2xl border bg-white ${
              selectedOption === "deactivate"
                ? "border-blue-600 ring-2 ring-blue-100"
                : "border-slate-200"
            }`}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-base font-bold text-slate-900">
                  Deactivate account
                </Text>
                <Text className="text-xs font-semibold text-blue-600 uppercase tracking-wider mt-0.5">
                  Temporary
                </Text>
                <Text className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Deactivating your account means your profile, photos, comments,
                  and likes will be hidden until you reactivate it by logging back
                  in.
                </Text>
              </View>

              <View
                className={`w-6 h-6 rounded-full border items-center justify-center mt-1 ${
                  selectedOption === "deactivate"
                    ? "border-blue-600 bg-blue-600"
                    : "border-slate-300 bg-white"
                }`}
              >
                {selectedOption === "deactivate" && (
                  <View className="w-2.5 h-2.5 rounded-full bg-white" />
                )}
              </View>
            </View>
          </TouchableOpacity>

          {/* Delete Option */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setSelectedOption("delete")}
            className={`p-5 rounded-2xl border bg-white ${
              selectedOption === "delete"
                ? "border-red-500 ring-2 ring-red-100"
                : "border-slate-200"
            }`}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-base font-bold text-slate-900">
                  Delete account
                </Text>
                <Text className="text-xs font-semibold text-red-500 uppercase tracking-wider mt-0.5">
                  Permanent
                </Text>
                <Text className="text-xs text-slate-500 mt-2 leading-relaxed">
                  When you delete your Clone account, your profile, photos,
                  videos, comments, likes, and followers will be permanently
                  removed.
                </Text>
              </View>

              <View
                className={`w-6 h-6 rounded-full border items-center justify-center mt-1 ${
                  selectedOption === "delete"
                    ? "border-red-500 bg-red-500"
                    : "border-slate-300 bg-white"
                }`}
              >
                {selectedOption === "delete" && (
                  <View className="w-2.5 h-2.5 rounded-full bg-white" />
                )}
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Action Button */}
        <View className="px-5 mt-8">
          <TouchableOpacity
            onPress={handleContinue}
            disabled={processing}
            className={`py-4 rounded-xl items-center justify-center shadow-sm ${
              selectedOption === "delete" ? "bg-red-500" : "bg-blue-600"
            }`}
          >
            {processing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-base font-bold text-white">
                Continue
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
