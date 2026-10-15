import React, { useState } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { authService } from "@/services/authService";
import { useTheme } from "@/context/ThemeContext";
import { colors } from "@/constants/theme";
import Toast from "react-native-toast-message";

import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import NotificationModal from "@/components/modal/NotificationModal";

const REASONS = [
  "Just need a break",
  "Privacy concerns",
  "Too distracting / taking too much time",
  "Created a second account",
  "Trouble getting started",
  "Something else",
];

export default function AccountOwnership() {
  const { palette } = useTheme();
  const [selectedOption, setSelectedOption] = useState<"deactivate" | "delete">(
    "deactivate"
  );
  const [selectedReason, setSelectedReason] = useState<string>(REASONS[0]);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [processing, setProcessing] = useState(false);

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
        showNotify({
          title: "Deletion Requested",
          message:
            "Your account is now scheduled for permanent removal. All public profile data is immediately hidden.",
          type: "warning",
          icon: "trash-bin-outline",
          confirmText: "OK",
          destructive: true,
          onConfirm: () => {
            closeNotify();
            router.replace("/(auth)/signIn" as any);
          },
        });
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
    <Screen
      scrollable
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <ScreenHeader
        title="Account Ownership"
        showBack
        onBackPress={() => router.back()}
        borderBottom
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
        <Text variant="title">
          Deactivating or deleting your Clone account
        </Text>
        <Text
          variant="body"
          color="muted"
          style={{ marginTop: 6, lineHeight: 22 }}
        >
          If you want to take a break from Clone, you can temporarily deactivate
          your account. If you want to permanently delete your account, let us
          know.
        </Text>
      </View>

      {/* Options Cards */}
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        {/* Deactivate Option */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSelectedOption("deactivate")}
          style={{
            padding: 18,
            borderRadius: 16,
            borderWidth: 2,
            backgroundColor: palette.surface,
            borderColor:
              selectedOption === "deactivate"
                ? palette.accent
                : palette.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text variant="headline">Deactivate account</Text>
              <Text
                variant="micro"
                weight="bold"
                color="accent"
                style={{ textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}
              >
                Temporary
              </Text>
              <Text
                variant="caption"
                color="muted"
                style={{ marginTop: 8, lineHeight: 18 }}
              >
                Deactivating your account means your profile, photos, comments,
                and likes will be hidden until you reactivate it by logging back
                in.
              </Text>
            </View>

            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor:
                  selectedOption === "deactivate"
                    ? palette.accent
                    : palette.border,
                backgroundColor:
                  selectedOption === "deactivate"
                    ? palette.accent
                    : "transparent",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              {selectedOption === "deactivate" && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.white,
                  }}
                />
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Delete Option */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSelectedOption("delete")}
          style={{
            padding: 18,
            borderRadius: 16,
            borderWidth: 2,
            backgroundColor: palette.surface,
            borderColor:
              selectedOption === "delete"
                ? palette.danger
                : palette.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text variant="headline">Delete account</Text>
              <Text
                variant="micro"
                weight="bold"
                color="danger"
                style={{ textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}
              >
                Permanent
              </Text>
              <Text
                variant="caption"
                color="muted"
                style={{ marginTop: 8, lineHeight: 18 }}
              >
                When you delete your Clone account, your profile, photos,
                videos, comments, likes, and followers will be permanently
                removed.
              </Text>
            </View>

            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                borderWidth: 2,
                borderColor:
                  selectedOption === "delete"
                    ? palette.danger
                    : palette.border,
                backgroundColor:
                  selectedOption === "delete"
                    ? palette.danger
                    : "transparent",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 2,
              }}
            >
              {selectedOption === "delete" && (
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: colors.white,
                  }}
                />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Reason Selector */}
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
          Why are you {selectedOption === "deactivate" ? "deactivating" : "deleting"}?
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
          {REASONS.map((reason, index) => {
            const isSelected = selectedReason === reason;
            const isLast = index === REASONS.length - 1;
            return (
              <TouchableOpacity
                key={reason}
                activeOpacity={0.7}
                onPress={() => setSelectedReason(reason)}
                style={{
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: palette.borderSubtle,
                }}
              >
                <Text
                  variant="body"
                  weight={isSelected ? "bold" : "regular"}
                  color={isSelected ? "default" : "muted"}
                >
                  {reason}
                </Text>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: isSelected
                      ? palette.accent
                      : palette.border,
                    backgroundColor: isSelected
                      ? palette.accent
                      : "transparent",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isSelected && (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: colors.white,
                      }}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Continue Action */}
      <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
        <Button
          title="Continue"
          variant={selectedOption === "delete" ? "danger" : "primary"}
          size="lg"
          onPress={handleOpenConfirm}
        />
      </View>

      {/* Confirmation & Password Challenge Modal */}
      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: palette.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              width: "100%",
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <Text variant="headline">
                {selectedOption === "delete"
                  ? "Confirm Account Deletion"
                  : "Confirm Deactivation"}
              </Text>
              <TouchableOpacity onPress={() => setConfirmModalVisible(false)}>
                <Ionicons name="close" size={20} color={palette.muted} />
              </TouchableOpacity>
            </View>

            <Text
              variant="caption"
              color="muted"
              style={{ marginBottom: 16, lineHeight: 18 }}
            >
              {selectedOption === "delete"
                ? "For your security, please confirm your intent to permanently delete your account. This action cannot be reversed."
                : "Your profile will be hidden immediately and reactivated the next time you sign in with your credentials."}
            </Text>

            <TextField
              label="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Enter your current password"
              secureTextEntry
              showPasswordToggle
              containerStyle={{ marginBottom: 20 }}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Cancel"
                  variant="outline"
                  disabled={processing}
                  onPress={() => setConfirmModalVisible(false)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title={selectedOption === "delete" ? "Delete" : "Deactivate"}
                  variant={selectedOption === "delete" ? "danger" : "primary"}
                  loading={processing}
                  onPress={handleExecuteAction}
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
