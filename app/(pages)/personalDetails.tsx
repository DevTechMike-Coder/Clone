import React, { useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { styled } from "nativewind";
import { router } from "expo-router";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { copyToClipboard } from "@/lib/safeClipboard";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";
import { colors } from "@/constants/theme";
import Toast from "react-native-toast-message";
import NotificationModal from "@/components/modal/NotificationModal";

const SafeAreaView = styled(RNSafeAreaView);

export default function PersonalDetails() {
  const { user } = useAuth();
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [updatingEmail, setUpdatingEmail] = useState(false);

  // Phone state
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(
    user?.phone || user?.user_metadata?.phone_number || ""
  );
  const [savingPhone, setSavingPhone] = useState(false);

  // Birthday state
  const [birthdayModalVisible, setBirthdayModalVisible] = useState(false);
  const [birthday, setBirthday] = useState(user?.user_metadata?.birthday || "");

  // Notification Modal State
  const [notifyModal, setNotifyModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: "info" | "success" | "warning" | "error";
    icon?: keyof typeof Ionicons.glyphMap;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showNotify = (config: Omit<typeof notifyModal, "visible">) => {
    setNotifyModal({ ...config, visible: true });
  };

  const closeNotify = () => {
    setNotifyModal((prev) => ({ ...prev, visible: false }));
  };
  const [savingBirthday, setSavingBirthday] = useState(false);

  const createdAtFormatted = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Recent";

  // Handle Email Update
  const handleUpdateEmail = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      Toast.show({
        type: "error",
        text1: "Invalid Email",
        text2: "Please enter a valid email address.",
      });
      return;
    }

    setUpdatingEmail(true);
    try {
      await authService.updateEmail(trimmed);
      setEmailModalVisible(false);
      setNewEmail("");
      showNotify({
        title: "Verification Email Sent",
        message: `We've sent a confirmation link to ${trimmed}. Please check your inbox to complete the update.`,
        type: "success",
        icon: "mail-unread-outline",
        confirmText: "Got it",
        onConfirm: closeNotify,
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: err?.message || "Could not update email.",
      });
    } finally {
      setUpdatingEmail(false);
    }
  };

  // Handle Phone Update
  const handleSavePhone = async () => {
    const trimmed = phoneNumber.trim();
    if (!trimmed) {
      Toast.show({
        type: "error",
        text1: "Phone Number Required",
        text2: "Please enter a valid phone number.",
      });
      return;
    }

    setSavingPhone(true);
    try {
      await authService.updateUserMetadata({ phone_number: trimmed });
      setPhoneModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: "success",
        text1: "Phone Number Saved",
        text2: "Your contact phone number has been updated.",
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: err?.message || "Could not update phone number.",
      });
    } finally {
      setSavingPhone(false);
    }
  };

  // Handle Birthday Update
  const handleSaveBirthday = async () => {
    const trimmed = birthday.trim();
    if (!trimmed) {
      Toast.show({
        type: "error",
        text1: "Date of Birth Required",
        text2: "Please provide your birth date.",
      });
      return;
    }

    setSavingBirthday(true);
    try {
      await authService.updateUserMetadata({ birthday: trimmed });
      setBirthdayModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({
        type: "success",
        text1: "Birthday Saved",
        text2: "Your date of birth has been updated.",
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: err?.message || "Could not save birthday.",
      });
    } finally {
      setSavingBirthday(false);
    }
  };

  // Copy Account ID
  const handleCopyAccountId = async () => {
    if (!user?.id) return;
    const copied = await copyToClipboard(user.id);
    Haptics.selectionAsync();
    if (copied) {
      Toast.show({
        type: "info",
        text1: "Copied",
        text2: "Account ID copied to clipboard.",
      });
    } else {
      showNotify({
        title: "Your Account ID",
        message: user.id,
        type: "info",
        icon: "finger-print-outline",
        confirmText: "Close",
        onConfirm: closeNotify,
      });
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
            Personal Details
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
            Personal Details
          </Text>
          <Text className="text-sm text-slate-500 mt-1.5 leading-relaxed">
            Clone uses this information to verify your identity and keep our
            community safe. You decide which personal info is visible to others.
          </Text>
        </View>

        {/* Contact Info Card */}
        <View className="px-5 mt-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
            Contact Information
          </Text>

          <View className="bg-white rounded-2xl border border-slate-200/90 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {/* Email Address */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setEmailModalVisible(true)}
              className="p-4 flex-row items-center justify-between active:bg-slate-50"
            >
              <View className="flex-row items-center gap-3.5 flex-1 pr-3">
                <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
                  <Ionicons name="mail-outline" size={20} color={colors.blue[600]} />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-slate-400 font-medium">
                    Email address
                  </Text>
                  <Text
                    className="text-base font-semibold text-slate-900 mt-0.5"
                    numberOfLines={1}
                  >
                    {user?.email || "No email on file"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-1.5">
                <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Text className="text-[10px] font-bold text-emerald-700 uppercase">
                    Verified
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.slate[300]}
                />
              </View>
            </TouchableOpacity>

            {/* Phone Number */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setPhoneModalVisible(true)}
              className="p-4 flex-row items-center justify-between active:bg-slate-50"
            >
              <View className="flex-row items-center gap-3.5 flex-1 pr-3">
                <View className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center">
                  <Ionicons name="call-outline" size={20} color={colors.slate[600]} />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-slate-400 font-medium">
                    Phone number
                  </Text>
                  <Text className="text-base font-semibold text-slate-900 mt-0.5">
                    {phoneNumber || "Add phone number"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-1.5">
                <Text className="text-xs font-semibold text-blue-600">
                  {phoneNumber ? "Edit" : "Add"}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.slate[300]}
                />
              </View>
            </TouchableOpacity>

            {/* Date of Birth */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setBirthdayModalVisible(true)}
              className="p-4 flex-row items-center justify-between active:bg-slate-50"
            >
              <View className="flex-row items-center gap-3.5 flex-1 pr-3">
                <View className="w-10 h-10 rounded-xl bg-pink-50 items-center justify-center">
                  <Ionicons name="gift-outline" size={20} color={colors.pink[500]} />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-slate-400 font-medium">
                    Birthday
                  </Text>
                  <Text className="text-base font-semibold text-slate-900 mt-0.5">
                    {birthday || "Add your birthday"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center gap-1.5">
                <Text className="text-xs font-semibold text-blue-600">
                  {birthday ? "Edit" : "Add"}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.slate[300]}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Identity & Account Info */}
        <View className="px-5 mt-6">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
            Account Information
          </Text>

          <View className="bg-white rounded-2xl border border-slate-200/90 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {/* Member Since */}
            <View className="p-4 flex-row items-center gap-3.5">
              <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center">
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.amber[500]}
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-slate-400 font-medium">
                  Member since
                </Text>
                <Text className="text-base font-semibold text-slate-900 mt-0.5">
                  {createdAtFormatted}
                </Text>
              </View>
            </View>

            {/* User ID with Copy action */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleCopyAccountId}
              className="p-4 flex-row items-center justify-between active:bg-slate-50"
            >
              <View className="flex-row items-center gap-3.5 flex-1 pr-3">
                <View className="w-10 h-10 rounded-xl bg-violet-50 items-center justify-center">
                  <Ionicons
                    name="finger-print-outline"
                    size={20}
                    color={colors.violet[600]}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-slate-400 font-medium">
                    Account ID (tap to copy)
                  </Text>
                  <Text
                    selectable={true}
                    className="text-xs font-mono text-slate-500 mt-0.5"
                    numberOfLines={1}
                  >
                    {user?.id || "N/A"}
                  </Text>
                </View>
              </View>

              <Ionicons
                name="copy-outline"
                size={18}
                color={colors.slate[400]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Ownership and Control Link */}
        <View className="px-5 mt-6">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
            Account Ownership and Control
          </Text>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(pages)/accountOwnership")}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 flex-row items-center justify-between active:bg-slate-50"
          >
            <View className="flex-row items-center gap-3.5 flex-1 pr-3">
              <View className="w-10 h-10 rounded-xl bg-red-50 items-center justify-center">
                <Ionicons
                  name="person-remove-outline"
                  size={20}
                  color={colors.red[500]}
                />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-900 tracking-tight">
                  Account ownership & control
                </Text>
                <Text className="text-xs text-slate-500 mt-0.5">
                  Manage your data, modify legacy contact, or deactivate/delete account.
                </Text>
              </View>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.slate[300]}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Email Modal */}
      <Modal
        visible={emailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-5">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <View className="w-12 h-12 rounded-2xl bg-blue-50 items-center justify-center mb-4">
              <Ionicons name="mail" size={24} color={colors.blue[600]} />
            </View>

            <Text className="text-lg font-bold text-slate-900 tracking-tight">
              Update Email Address
            </Text>
            <Text className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
              We will send a confirmation link to your new address to verify
              ownership before updating your account.
            </Text>

            <TextInput
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="Enter new email address"
              placeholderTextColor={colors.slate[400]}
              keyboardType="email-address"
              autoCapitalize="none"
              className="border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 bg-slate-50 mb-5 font-medium"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setEmailModalVisible(false)}
                disabled={updatingEmail}
                className="flex-1 py-3 rounded-xl border border-slate-200 items-center justify-center bg-slate-100"
              >
                <Text className="text-sm font-semibold text-slate-700">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleUpdateEmail}
                disabled={updatingEmail}
                className="flex-1 py-3 rounded-xl bg-blue-600 items-center justify-center shadow-sm"
              >
                {updatingEmail ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-sm font-semibold text-white">
                    Send Link
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Phone Modal */}
      <Modal
        visible={phoneModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhoneModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-5">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <View className="w-12 h-12 rounded-2xl bg-slate-100 items-center justify-center mb-4">
              <Ionicons name="call" size={24} color={colors.slate[700]} />
            </View>

            <Text className="text-lg font-bold text-slate-900 tracking-tight">
              Phone Number
            </Text>
            <Text className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
              Add or update your phone number for two-factor authentication and
              account recovery.
            </Text>

            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+1 (555) 000-0000"
              placeholderTextColor={colors.slate[400]}
              keyboardType="phone-pad"
              className="border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 bg-slate-50 mb-5 font-medium"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setPhoneModalVisible(false)}
                disabled={savingPhone}
                className="flex-1 py-3 rounded-xl border border-slate-200 items-center justify-center bg-slate-100"
              >
                <Text className="text-sm font-semibold text-slate-700">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSavePhone}
                disabled={savingPhone}
                className="flex-1 py-3 rounded-xl bg-blue-600 items-center justify-center shadow-sm"
              >
                {savingPhone ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-sm font-semibold text-white">
                    Save Phone
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Birthday Modal */}
      <Modal
        visible={birthdayModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBirthdayModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-5">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <View className="w-12 h-12 rounded-2xl bg-pink-50 items-center justify-center mb-4">
              <Ionicons name="gift" size={24} color={colors.pink[500]} />
            </View>

            <Text className="text-lg font-bold text-slate-900 tracking-tight">
              Date of Birth
            </Text>
            <Text className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
              Providing your birthday helps make sure you get the right age-appropriate
              {" experience. This won't be made public without your permission."}
            </Text>

            <TextInput
              value={birthday}
              onChangeText={setBirthday}
              placeholder="e.g. October 15, 1998"
              placeholderTextColor={colors.slate[400]}
              className="border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 bg-slate-50 mb-5 font-medium"
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setBirthdayModalVisible(false)}
                disabled={savingBirthday}
                className="flex-1 py-3 rounded-xl border border-slate-200 items-center justify-center bg-slate-100"
              >
                <Text className="text-sm font-semibold text-slate-700">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveBirthday}
                disabled={savingBirthday}
                className="flex-1 py-3 rounded-xl bg-blue-600 items-center justify-center shadow-sm"
              >
                {savingBirthday ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-sm font-semibold text-white">
                    Save Birthday
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Custom Notification Modal */}
      <NotificationModal {...notifyModal} />
    </SafeAreaView>
  );
}
