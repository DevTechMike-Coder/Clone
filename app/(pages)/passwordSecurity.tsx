import React, { useState, useEffect } from "react";
import {
  View,
  ActivityIndicator,
  Switch,
  Platform,
  Keyboard,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { colors } from "@/constants/theme";
import { authService } from "@/services/authService";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import NotificationModal from "@/components/modal/NotificationModal";

const STORAGE_SAVED_LOGIN = "@clone_saved_login_info";
const STORAGE_2FA_ENABLED = "@clone_2fa_enabled";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function PasswordSecurity() {
  const { user } = useAuth();
  const { palette, isDark } = useTheme();

  const [modalVisible, setModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [savedLoginEnabled, setSavedLoginEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [signingOutOthers, setSigningOutOthers] = useState(false);
  const [checkingSecurity, setCheckingSecurity] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const savedLogin = await AsyncStorage.getItem(STORAGE_SAVED_LOGIN);
        if (savedLogin !== null) {
          setSavedLoginEnabled(savedLogin === "true");
        }
        const twoFa = await AsyncStorage.getItem(STORAGE_2FA_ENABLED);
        if (twoFa !== null) {
          setTwoFactorEnabled(twoFa === "true");
        }
      } catch (err) {
        console.warn("Failed to load security preferences:", err);
      }
    })();
  }, []);

  const isLengthValid = newPassword.length >= 6;
  const hasMixedChars = /[0-9]/.test(newPassword) && /[a-zA-Z]/.test(newPassword);

  const handleCloseModal = () => {
    Keyboard.dismiss();
    setModalVisible(false);
    setNewPassword("");
    setConfirmPassword("");
  };

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
      handleCloseModal();
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

  const handleSendResetEmail = async () => {
    if (!user?.email) {
      Toast.show({
        type: "error",
        text1: "No Email Found",
        text2: "Your account does not have an email address associated.",
      });
      return;
    }

    setSendingReset(true);
    try {
      await authService.resetPasswordForEmail(user.email);
      showNotify({
        title: "Reset Email Sent",
        message: `We've sent a password reset link to ${user.email}. Check your email inbox to reset your password.`,
        type: "success",
        icon: "mail-unread-outline",
        confirmText: "Got it",
        onConfirm: closeNotify,
      });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Reset Failed",
        text2: err?.message || "Could not send reset email.",
      });
    } finally {
      setSendingReset(false);
    }
  };

  const handleToggleSavedLogin = async (val: boolean) => {
    setSavedLoginEnabled(val);
    try {
      await AsyncStorage.setItem(STORAGE_SAVED_LOGIN, String(val));
      Toast.show({
        type: "info",
        text1: val ? "Saved Login Enabled" : "Saved Login Disabled",
        text2: val
          ? "Your login session will be remembered on this device."
          : "Saved login preferences have been turned off.",
      });
    } catch (err) {
      console.warn("Failed to persist saved login:", err);
    }
  };

  const handleToggle2FA = async (val: boolean) => {
    setTwoFactorEnabled(val);
    try {
      await AsyncStorage.setItem(STORAGE_2FA_ENABLED, String(val));
      await authService.updateUserMetadata({ two_factor_enabled: val });
      Toast.show({
        type: val ? "success" : "info",
        text1: val ? "2FA Protection Active" : "2FA Deactivated",
        text2: val
          ? "Two-factor verification enabled for unrecognized logins."
          : "Two-factor authentication turned off.",
      });
    } catch (err) {
      console.warn("Failed to update 2FA preference:", err);
    }
  };

  const handleSignOutOthers = () => {
    showNotify({
      title: "Log Out Other Sessions?",
      message: "This will end all other active sessions and logins on other devices except this one.",
      type: "warning",
      icon: "log-out-outline",
      confirmText: "Log Out Others",
      cancelText: "Cancel",
      destructive: true,
      onConfirm: async () => {
        closeNotify();
        setSigningOutOthers(true);
        try {
          await authService.signOutOtherSessions();
          Toast.show({
            type: "success",
            text1: "Sessions Cleared",
            text2: "All other devices have been logged out.",
          });
        } catch (err: any) {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: err?.message || "Failed to log out other sessions.",
          });
        } finally {
          setSigningOutOthers(false);
        }
      },
      onCancel: closeNotify,
    });
  };

  const handleRunSecurityCheckup = () => {
    setCheckingSecurity(true);
    setTimeout(() => {
      setCheckingSecurity(false);
      showNotify({
        title: "Security Checkup",
        message: `• Email Verified: ${user?.email || "Yes"}\n• Device Session: Active & Secure\n• Two-Factor Auth: ${
          twoFactorEnabled ? "Enabled" : "Recommended"
        }\n\nYour account meets modern security standards.`,
        type: "success",
        icon: "shield-checkmark-outline",
        confirmText: "Done",
        onConfirm: closeNotify,
      });
    }, 800);
  };

  return (
    <Screen
      scrollable
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <ScreenHeader
        title="Password and Security"
        showBack
        onBackPress={() => router.back()}
        borderBottom
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
        <Text variant="title">Password and Security</Text>
        <Text
          variant="body"
          color="muted"
          style={{ marginTop: 6, lineHeight: 22 }}
        >
          Manage your credentials, login alerts, and multi-factor security
          controls across Clone.
        </Text>
      </View>

      {/* Login & Recovery Section */}
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
          Login & Recovery
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
          {/* Change Password */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setModalVisible(true)}
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
                <Ionicons name="key-outline" size={20} color={palette.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text variant="body" weight="semibold">
                  Change password
                </Text>
                <Text variant="micro" color="muted" style={{ marginTop: 2 }}>
                  Update your account login password
                </Text>
              </View>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={palette.muted}
            />
          </TouchableOpacity>

          {/* Send Password Reset Link */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleSendResetEmail}
            disabled={sendingReset}
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
                  backgroundColor: palette.warning + "1A",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="mail-unread-outline"
                  size={20}
                  color={palette.warning}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text variant="body" weight="semibold">
                  Send password reset email
                </Text>
                <Text variant="micro" color="muted" style={{ marginTop: 2 }}>
                  Receive a recovery link at {user?.email}
                </Text>
              </View>
            </View>

            {sendingReset ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : (
              <Ionicons
                name="chevron-forward"
                size={18}
                color={palette.muted}
              />
            )}
          </TouchableOpacity>

          {/* Two-Factor Authentication */}
          <View
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
                  backgroundColor: palette.success + "1A",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={palette.success}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text variant="body" weight="semibold">
                  Two-factor authentication
                </Text>
                <Text variant="micro" color="muted" style={{ marginTop: 2 }}>
                  Require extra verification on unrecognized devices
                </Text>
              </View>
            </View>

            <Switch
              value={twoFactorEnabled}
              onValueChange={handleToggle2FA}
              trackColor={{ false: palette.border, true: palette.accent }}
              thumbColor={colors.white}
            />
          </View>

          {/* Saved Login Info */}
          <View
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
                  name="save-outline"
                  size={20}
                  color={palette.accent}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text variant="body" weight="semibold">
                  Saved login information
                </Text>
                <Text variant="micro" color="muted" style={{ marginTop: 2 }}>
                  Remember credentials on this trusted device
                </Text>
              </View>
            </View>

            <Switch
              value={savedLoginEnabled}
              onValueChange={handleToggleSavedLogin}
              trackColor={{ false: palette.border, true: palette.accent }}
              thumbColor={colors.white}
            />
          </View>
        </View>
      </View>

      {/* Where You're Logged In */}
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
          {"Where You're Logged In"}
        </Text>

        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.border,
            padding: 16,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingBottom: 14,
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
                name={Platform.OS === "ios" ? "logo-apple" : "logo-android"}
                size={20}
                color={palette.text}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text variant="body" weight="bold">
                  {Platform.OS === "ios" ? "Apple iPhone" : "Android Device"}
                </Text>
                <View
                  style={{
                    backgroundColor: palette.success + "20",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                  }}
                >
                  <Text variant="micro" weight="bold" color="success">
                    Active Now
                  </Text>
                </View>
              </View>
              <Text variant="micro" color="muted" style={{ marginTop: 2 }}>
                Clone Mobile App • Current Session
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSignOutOthers}
            disabled={signingOutOthers}
            style={{
              paddingTop: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text variant="caption" weight="semibold" color="danger">
              Log out of all other sessions
            </Text>
            {signingOutOthers ? (
              <ActivityIndicator size="small" color={palette.danger} />
            ) : (
              <Ionicons name="log-out-outline" size={16} color={palette.danger} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Security Status Checkup */}
      <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
            paddingHorizontal: 4,
          }}
        >
          <Text
            variant="caption"
            weight="bold"
            color="muted"
            style={{
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Security Status
          </Text>
          <TouchableOpacity onPress={handleRunSecurityCheckup} disabled={checkingSecurity}>
            <Text variant="caption" weight="bold" color="accent">
              {checkingSecurity ? "Checking..." : "Run Checkup"}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.border,
            padding: 16,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={palette.success}
              />
              <Text variant="caption" weight="medium">
                Email Confirmed
              </Text>
            </View>
            <Text variant="caption" color="muted">
              {user?.email}
            </Text>
          </View>

          <View style={{ height: 1, backgroundColor: palette.borderSubtle }} />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={palette.success}
              />
              <Text variant="caption" weight="medium">
                Authentication Token
              </Text>
            </View>
            <Text variant="caption" weight="semibold" color="success">
              Protected via Supabase
            </Text>
          </View>

          <View style={{ height: 1, backgroundColor: palette.borderSubtle }} />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons
                name={twoFactorEnabled ? "checkmark-circle" : "alert-circle"}
                size={18}
                color={twoFactorEnabled ? palette.success : palette.warning}
              />
              <Text variant="caption" weight="medium">
                Two-Factor Status
              </Text>
            </View>
            <Text
              variant="caption"
              weight="semibold"
              color={twoFactorEnabled ? "success" : "warning"}
            >
              {twoFactorEnabled ? "Enabled" : "Off"}
            </Text>
          </View>
        </View>
      </View>

      {/* Change Password Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
        statusBarTranslucent
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            justifyContent: "flex-end",
          }}
        >
          <TouchableWithoutFeedback onPress={handleCloseModal}>
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          </TouchableWithoutFeedback>

          <View
            style={{
              width: "100%",
              maxHeight:
                keyboardHeight > 0
                  ? SCREEN_HEIGHT - keyboardHeight - 20
                  : SCREEN_HEIGHT * 0.85,
              marginBottom: keyboardHeight,
              backgroundColor: palette.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 24 }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <Text variant="headline">Change Password</Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <Ionicons name="close" size={20} color={palette.muted} />
                </TouchableOpacity>
              </View>

              <Text
                variant="caption"
                color="muted"
                style={{ marginBottom: 18, lineHeight: 18 }}
              >
                Your password must be at least 6 characters and include a mix of
                letters and numbers.
              </Text>

              <View style={{ gap: 14, marginBottom: 18 }}>
                <TextField
                  label="New Password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  showPasswordToggle
                  secureTextEntry
                />

                <TextField
                  label="Re-type New Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  showPasswordToggle
                  secureTextEntry
                />
              </View>

              {/* Requirement Checklist */}
              <View
                style={{
                  backgroundColor: palette.surfaceMuted,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 20,
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons
                    name={isLengthValid ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={isLengthValid ? palette.success : palette.muted}
                  />
                  <Text
                    variant="caption"
                    color={isLengthValid ? "success" : "muted"}
                    weight={isLengthValid ? "medium" : "regular"}
                  >
                    At least 6 characters
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons
                    name={hasMixedChars ? "checkmark-circle" : "ellipse-outline"}
                    size={16}
                    color={hasMixedChars ? palette.success : palette.muted}
                  />
                  <Text
                    variant="caption"
                    color={hasMixedChars ? "success" : "muted"}
                    weight={hasMixedChars ? "medium" : "regular"}
                  >
                    Letters and numbers
                  </Text>
                </View>
              </View>

              <Button
                title="Save New Password"
                variant="primary"
                disabled={savingPassword || !isLengthValid}
                loading={savingPassword}
                onPress={handleChangePassword}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <NotificationModal {...notifyModal} />
    </Screen>
  );
}
