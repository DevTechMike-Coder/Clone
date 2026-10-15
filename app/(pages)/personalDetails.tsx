import React, { useState } from "react";
import {
  View,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { copyToClipboard } from "@/lib/safeClipboard";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { authService } from "@/services/authService";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import NotificationModal from "@/components/modal/NotificationModal";

export default function PersonalDetails() {
  const { user } = useAuth();
  const { palette } = useTheme();

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
  const [savingBirthday, setSavingBirthday] = useState(false);

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
    <Screen
      scrollable
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header */}
      <ScreenHeader
        title="Personal Details"
        showBack
        onBackPress={() => router.back()}
        borderBottom
      />

      {/* Intro */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
        <Text variant="title">Personal Details</Text>
        <Text
          variant="body"
          color="muted"
          style={{ marginTop: 6, lineHeight: 22 }}
        >
          Clone uses this information to verify your identity and keep our
          community safe. You decide which personal info is visible to others.
        </Text>
      </View>

      {/* Contact Info Card */}
      <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
        <Text
          variant="caption"
          weight="bold"
          color="muted"
          style={{
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 10,
            paddingHorizontal: 4,
          }}
        >
          Contact Information
        </Text>

        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.border,
            overflow: "hidden",
          }}
        >
          {/* Email Address */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setEmailModalVisible(true)}
            style={{
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottomWidth: 1,
              borderBottomColor: palette.borderSubtle,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
                paddingRight: 12,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: palette.accent + "1A",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="mail-outline" size={20} color={palette.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text variant="micro" color="muted" weight="medium">
                  Email address
                </Text>
                <Text
                  variant="body"
                  weight="semibold"
                  style={{ marginTop: 2 }}
                  numberOfLines={1}
                >
                  {user?.email || "No email on file"}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View
                style={{
                  backgroundColor: palette.success + "20",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: palette.success + "40",
                }}
              >
                <Text
                  variant="micro"
                  weight="bold"
                  color="success"
                  style={{ textTransform: "uppercase" }}
                >
                  Verified
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={palette.muted}
              />
            </View>
          </TouchableOpacity>

          {/* Phone Number */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setPhoneModalVisible(true)}
            style={{
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottomWidth: 1,
              borderBottomColor: palette.borderSubtle,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
                paddingRight: 12,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: palette.surfaceMuted,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="call-outline" size={20} color={palette.muted} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text variant="micro" color="muted" weight="medium">
                  Phone number
                </Text>
                <Text variant="body" weight="semibold" style={{ marginTop: 2 }}>
                  {phoneNumber || "Add phone number"}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text variant="caption" weight="semibold" color="accent">
                {phoneNumber ? "Edit" : "Add"}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={palette.muted}
              />
            </View>
          </TouchableOpacity>

          {/* Date of Birth */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setBirthdayModalVisible(true)}
            style={{
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
                paddingRight: 12,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: palette.accent + "1A",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="gift-outline" size={20} color={palette.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text variant="micro" color="muted" weight="medium">
                  Birthday
                </Text>
                <Text variant="body" weight="semibold" style={{ marginTop: 2 }}>
                  {birthday || "Add your birthday"}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text variant="caption" weight="semibold" color="accent">
                {birthday ? "Edit" : "Add"}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={palette.muted}
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Identity & Account Info */}
      <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <Text
          variant="caption"
          weight="bold"
          color="muted"
          style={{
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 10,
            paddingHorizontal: 4,
          }}
        >
          Account Information
        </Text>

        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.border,
            overflow: "hidden",
          }}
        >
          {/* Member Since */}
          <View
            style={{
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              borderBottomWidth: 1,
              borderBottomColor: palette.borderSubtle,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: palette.surfaceMuted,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={palette.muted}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text variant="micro" color="muted" weight="medium">
                Member since
              </Text>
              <Text variant="body" weight="semibold" style={{ marginTop: 2 }}>
                {createdAtFormatted}
              </Text>
            </View>
          </View>

          {/* User ID */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleCopyAccountId}
            style={{
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
                paddingRight: 12,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: palette.surfaceMuted,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="finger-print-outline"
                  size={20}
                  color={palette.accent}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text variant="micro" color="muted" weight="medium">
                  Account ID (tap to copy)
                </Text>
                <Text
                  variant="caption"
                  color="muted"
                  style={{ marginTop: 2, fontFamily: "monospace" }}
                  numberOfLines={1}
                >
                  {user?.id || "N/A"}
                </Text>
              </View>
            </View>

            <Ionicons
              name="copy-outline"
              size={18}
              color={palette.muted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Ownership Link */}
      <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <Text
          variant="caption"
          weight="bold"
          color="muted"
          style={{
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 10,
            paddingHorizontal: 4,
          }}
        >
          Account Ownership and Control
        </Text>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/(pages)/accountOwnership")}
          style={{
            backgroundColor: palette.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.border,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              paddingRight: 12,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: palette.danger + "1A",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="person-remove-outline"
                size={20}
                color={palette.danger}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text variant="body" weight="semibold">
                Account ownership & control
              </Text>
              <Text variant="micro" color="muted" style={{ marginTop: 2 }}>
                Manage your data, modify legacy contact, or deactivate/delete account.
              </Text>
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={palette.muted}
          />
        </TouchableOpacity>
      </View>

      {/* Edit Email Modal */}
      <Modal
        visible={emailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: palette.surface,
              borderRadius: 24,
              padding: 24,
              width: "100%",
              maxWidth: 380,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <Text variant="headline">Update Email Address</Text>
            <Text
              variant="caption"
              color="muted"
              style={{ marginTop: 6, marginBottom: 18, lineHeight: 18 }}
            >
              We will send a confirmation link to your new address to verify
              ownership before updating your account.
            </Text>

            <TextField
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="Enter new email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              containerStyle={{ marginBottom: 20 }}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Cancel"
                  variant="outline"
                  disabled={updatingEmail}
                  onPress={() => setEmailModalVisible(false)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Send Link"
                  variant="primary"
                  loading={updatingEmail}
                  onPress={handleUpdateEmail}
                />
              </View>
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
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: palette.surface,
              borderRadius: 24,
              padding: 24,
              width: "100%",
              maxWidth: 380,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <Text variant="headline">Phone Number</Text>
            <Text
              variant="caption"
              color="muted"
              style={{ marginTop: 6, marginBottom: 18, lineHeight: 18 }}
            >
              Add or update your phone number for two-factor authentication and
              account recovery.
            </Text>

            <TextField
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+1 (555) 000-0000"
              keyboardType="phone-pad"
              containerStyle={{ marginBottom: 20 }}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Cancel"
                  variant="outline"
                  disabled={savingPhone}
                  onPress={() => setPhoneModalVisible(false)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Save Phone"
                  variant="primary"
                  loading={savingPhone}
                  onPress={handleSavePhone}
                />
              </View>
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
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              backgroundColor: palette.surface,
              borderRadius: 24,
              padding: 24,
              width: "100%",
              maxWidth: 380,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <Text variant="headline">Date of Birth</Text>
            <Text
              variant="caption"
              color="muted"
              style={{ marginTop: 6, marginBottom: 18, lineHeight: 18 }}
            >
              Providing your birthday helps make sure you get the right age-appropriate
              {" experience. This won't be made public without your permission."}
            </Text>

            <TextField
              value={birthday}
              onChangeText={setBirthday}
              placeholder="e.g. October 15, 1998"
              containerStyle={{ marginBottom: 20 }}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Cancel"
                  variant="outline"
                  disabled={savingBirthday}
                  onPress={() => setBirthdayModalVisible(false)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Save Birthday"
                  variant="primary"
                  loading={savingBirthday}
                  onPress={handleSaveBirthday}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <NotificationModal {...notifyModal} />
    </Screen>
  );
}
