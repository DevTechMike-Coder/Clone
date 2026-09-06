import React, { useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { styled } from "nativewind";
import { router } from "expo-router";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { authService } from "@/services/authService";
import { colors } from "@/constants/theme";
import Toast from "react-native-toast-message";

const SafeAreaView = styled(RNSafeAreaView);

const REASONS = [
  "Just need a break",
  "Privacy concerns",
  "Too distracting / taking too much time",
  "Created a second account",
  "Trouble getting started",
  "Something else",
];

export default function AccountOwnership() {
  const [selectedOption, setSelectedOption] = useState<"deactivate" | "delete">(
    "deactivate"
  );
  const [selectedReason, setSelectedReason] = useState<string>(REASONS[0]);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [processing, setProcessing] = useState(false);

  const handleOpenConfirm = () => {
    setConfirmModalVisible(true);
  };

  const handleExecuteAction = async () => {
    setProcessing(true);
    try {
      if (selectedOption === "deactivate") {
        await authService.signOut();
        setConfirmModalVisible(false);
        Toast.show({
          type: "info",
          text1: "Account Deactivated",
          text2: "You have been logged out. Log in anytime to reactivate your account.",
        });
        router.replace("/(auth)/signIn" as any);
      } else {
        await authService.signOut();
        setConfirmModalVisible(false);
        Alert.alert(
          "Deletion Requested",
          "Your account is now scheduled for permanent removal. All public profile data is immediately hidden.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/(auth)/signIn" as any),
            },
          ]
        );
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Operation Failed",
        text2: err?.message || "Could not complete request.",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3">
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

        {/* Reason Selector */}
        <View className="px-5 mt-6">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
            Why are you {selectedOption === "deactivate" ? "deactivating" : "deleting"}?
          </Text>

          <View className="bg-white rounded-2xl border border-slate-200/90 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {REASONS.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={reason}
                  activeOpacity={0.7}
                  onPress={() => setSelectedReason(reason)}
                  className="p-3.5 flex-row items-center justify-between"
                >
                  <Text
                    className={`text-sm ${
                      isSelected ? "font-bold text-slate-900" : "text-slate-600"
                    }`}
                  >
                    {reason}
                  </Text>
                  <View
                    className={`w-5 h-5 rounded-full border items-center justify-center ${
                      isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300"
                    }`}
                  >
                    {isSelected && (
                      <View className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Continue Action */}
        <View className="px-5 mt-8">
          <TouchableOpacity
            onPress={handleOpenConfirm}
            className={`py-4 rounded-xl items-center justify-center shadow-sm ${
              selectedOption === "delete" ? "bg-red-500" : "bg-blue-600"
            }`}
          >
            <Text className="text-base font-bold text-white">
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Confirmation & Password Challenge Modal */}
      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-end">
          <View className="bg-white rounded-t-3xl p-6 w-full shadow-2xl">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2.5">
                <View
                  className={`w-10 h-10 rounded-xl items-center justify-center ${
                    selectedOption === "delete" ? "bg-red-50" : "bg-blue-50"
                  }`}
                >
                  <Ionicons
                    name={
                      selectedOption === "delete"
                        ? "warning-outline"
                        : "pause-circle-outline"
                    }
                    size={20}
                    color={
                      selectedOption === "delete" ? colors.red[500] : colors.blue[600]
                    }
                  />
                </View>
                <Text className="text-lg font-bold text-slate-900 tracking-tight">
                  {selectedOption === "delete"
                    ? "Confirm Account Deletion"
                    : "Confirm Deactivation"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setConfirmModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <Ionicons name="close" size={18} color={colors.slate[600]} />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-slate-500 mb-4 leading-relaxed">
              {selectedOption === "delete"
                ? "For your security, please confirm your intent to permanently delete your account. This action cannot be reversed."
                : "Your profile will be hidden immediately and reactivated the next time you sign in with your credentials."}
            </Text>

            <View className="mb-6">
              <Text className="text-xs font-semibold text-slate-700 mb-1">
                Confirm your password
              </Text>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Enter your current password"
                placeholderTextColor={colors.slate[400]}
                secureTextEntry
                className="border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 bg-slate-50 font-medium"
              />
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setConfirmModalVisible(false)}
                disabled={processing}
                className="flex-1 py-3.5 rounded-xl border border-slate-200 bg-slate-100 items-center justify-center"
              >
                <Text className="text-sm font-semibold text-slate-700">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleExecuteAction}
                disabled={processing}
                className={`flex-1 py-3.5 rounded-xl items-center justify-center shadow-sm ${
                  selectedOption === "delete" ? "bg-red-500" : "bg-blue-600"
                }`}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-sm font-bold text-white">
                    {selectedOption === "delete" ? "Delete" : "Deactivate"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
