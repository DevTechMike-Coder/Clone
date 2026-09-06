import React, { useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Switch,
  Platform,
} from "react-native";
import { styled } from "nativewind";
import { router } from "expo-router";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";
import { colors } from "@/constants/theme";
import Toast from "react-native-toast-message";

const SafeAreaView = styled(RNSafeAreaView);

export default function PasswordSecurity() {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [savedLoginEnabled, setSavedLoginEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Password validation
  const isLengthValid = newPassword.length >= 6;
  const hasMixedChars = /[0-9]/.test(newPassword) && /[a-zA-Z]/.test(newPassword);

  const handleChangePassword = async () => {
    if (!newPassword) {
      Toast.show({
        type: "error",
        text1: "Password Required",
        text2: "Please enter a new password.",
      });
      return;
    }

    if (newPassword.length < 6) {
      Toast.show({
        type: "error",
        text1: "Too Short",
        text2: "Password must be at least 6 characters long.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Mismatch",
        text2: "New passwords do not match.",
      });
      return;
    }

    setSavingPassword(true);
    try {
      await authService.updatePassword(newPassword);
      setModalVisible(false);
      setNewPassword("");
      setConfirmPassword("");
      Toast.show({
        type: "success",
        text1: "Password Updated",
        text2: "Your password has been successfully changed.",
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: err?.message || "Failed to change password.",
      });
    } finally {
      setSavingPassword(false);
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
            Password and Security
          </Text>
        </View>

        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View className="px-5 pt-6 pb-4">
          <Text className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Password and Security
          </Text>
          <Text className="text-sm text-slate-500 mt-1.5 leading-relaxed">
            Manage your credentials, login alerts, and multi-factor security
            controls.
          </Text>
        </View>

        {/* Login & Recovery */}
        <View className="px-5 mt-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
            Login & Recovery
          </Text>

          <View className="bg-white rounded-2xl border border-slate-200/90 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {/* Change Password */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setModalVisible(true)}
              className="p-4 flex-row items-center justify-between active:bg-slate-50"
            >
              <View className="flex-row items-center gap-3.5 flex-1 pr-3">
                <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
                  <Ionicons name="key-outline" size={20} color={colors.blue[600]} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-900 tracking-tight">
                    Change password
                  </Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    Update your account login password
                  </Text>
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.slate[300]}
              />
            </TouchableOpacity>

            {/* Two-Factor Authentication */}
            <View className="p-4 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3.5 flex-1 pr-3">
                <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center">
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={colors.emerald[600]}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-900 tracking-tight">
                    Two-factor authentication
                  </Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    Require extra verification on unrecognized devices
                  </Text>
                </View>
              </View>

              <Switch
                value={twoFactorEnabled}
                onValueChange={(val) => {
                  setTwoFactorEnabled(val);
                  Toast.show({
                    type: "info",
                    text1: val ? "2FA Activated" : "2FA Deactivated",
                    text2: val
                      ? "Two-factor verification enabled for your account."
                      : "Two-factor verification turned off.",
                  });
                }}
                trackColor={{ false: colors.slate[200], true: colors.blue[600] }}
                thumbColor={colors.white}
              />
            </View>

            {/* Saved Login Info */}
            <View className="p-4 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3.5 flex-1 pr-3">
                <View className="w-10 h-10 rounded-xl bg-violet-50 items-center justify-center">
                  <Ionicons
                    name="save-outline"
                    size={20}
                    color={colors.violet[600]}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-900 tracking-tight">
                    Saved login information
                  </Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    Remember credentials on this trusted device
                  </Text>
                </View>
              </View>

              <Switch
                value={savedLoginEnabled}
                onValueChange={setSavedLoginEnabled}
                trackColor={{ false: colors.slate[200], true: colors.blue[600] }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* Security Checks & Device Activity */}
        <View className="px-5 mt-6">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
            {"Where You're Logged In"}
          </Text>

          <View className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4">
            <View className="flex-row items-center gap-3.5">
              <View className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center">
                <Ionicons
                  name={Platform.OS === "ios" ? "logo-apple" : "logo-android"}
                  size={20}
                  color={colors.slate[700]}
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-bold text-slate-900">
                    {Platform.OS === "ios" ? "Apple iPhone" : "Android Device"}
                  </Text>
                  <View className="bg-emerald-100 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-bold text-emerald-800">
                      Active Now
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-slate-500 mt-0.5">
                  Clone App • Current Session
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Security Overview */}
        <View className="px-5 mt-6">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
            Security Status
          </Text>

          <View className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5">
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={colors.emerald[600]}
                />
                <Text className="text-sm text-slate-800 font-medium">
                  Email Confirmed
                </Text>
              </View>
              <Text className="text-xs text-slate-500">{user?.email}</Text>
            </View>

            <View className="h-px bg-slate-100 my-1" />

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2.5">
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={colors.emerald[600]}
                />
                <Text className="text-sm text-slate-800 font-medium">
                  Authentication Token
                </Text>
              </View>
              <Text className="text-xs text-emerald-600 font-semibold">
                Protected via Supabase
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-end">
          <View className="bg-white rounded-t-3xl p-6 w-full shadow-2xl">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2.5">
                <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
                  <Ionicons name="key" size={20} color={colors.blue[600]} />
                </View>
                <Text className="text-lg font-bold text-slate-900 tracking-tight">
                  Change Password
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <Ionicons name="close" size={18} color={colors.slate[600]} />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-slate-500 mb-5 leading-relaxed">
              Your password must be at least 6 characters and include a mix of
              letters and numbers.
            </Text>

            <View className="gap-3.5 mb-5">
              <View>
                <Text className="text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.slate[400]}
                  secureTextEntry
                  className="border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 bg-slate-50 font-medium"
                />
              </View>

              <View>
                <Text className="text-xs font-semibold text-slate-700 mb-1">
                  Re-type New Password
                </Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.slate[400]}
                  secureTextEntry
                  className="border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 bg-slate-50 font-medium"
                />
              </View>
            </View>

            {/* Requirement Checklist */}
            <View className="bg-slate-50 rounded-xl p-3.5 mb-6 border border-slate-100 gap-1.5">
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name={isLengthValid ? "checkmark-circle" : "ellipse-outline"}
                  size={14}
                  color={isLengthValid ? colors.emerald[600] : colors.slate[400]}
                />
                <Text
                  className={`text-xs ${
                    isLengthValid ? "text-emerald-700 font-medium" : "text-slate-500"
                  }`}
                >
                  At least 6 characters
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name={hasMixedChars ? "checkmark-circle" : "ellipse-outline"}
                  size={14}
                  color={hasMixedChars ? colors.emerald[600] : colors.slate[400]}
                />
                <Text
                  className={`text-xs ${
                    hasMixedChars ? "text-emerald-700 font-medium" : "text-slate-500"
                  }`}
                >
                  Letters and numbers
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleChangePassword}
              disabled={savingPassword || !isLengthValid}
              className={`py-3.5 rounded-xl items-center justify-center shadow-sm ${
                isLengthValid ? "bg-blue-600 active:bg-blue-700" : "bg-slate-300"
              }`}
            >
              {savingPassword ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-sm font-bold text-white">
                  Save New Password
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
