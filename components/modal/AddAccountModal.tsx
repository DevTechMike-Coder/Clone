import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { authService } from "@/services/authService";
import { colors } from "@/constants/theme";

type AddAccountModalProps = {
  visible: boolean;
  onClose: () => void;
};

/**
 * "Log into another account" without leaving the app.
 *
 * Deliberately NOT the (auth)/signIn route: that group's layout redirects
 * any authenticated session to /home, which is the wrong behavior when
 * you're already signed in and adding a second account. Signing in here
 * replaces the live session; the previous account stays in the switcher
 * (its token snapshot was taken by AuthContext), and the new one is
 * remembered on its SIGNED_IN event.
 */
const AddAccountModal = ({ visible, onClose }: AddAccountModalProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setEmail("");
    setPassword("");
    setLoading(false);
  };

  const handleSignIn = async () => {
    if (loading) return;
    const trimmed = email.trim();
    if (!trimmed || !password) {
      Toast.show({
        type: "error",
        text1: "Missing credentials",
        text2: "Enter the email and password for the account.",
      });
      return;
    }
    setLoading(true);
    try {
      await authService.signIn(trimmed, password);
      reset();
      onClose();
      Toast.show({ type: "success", text1: "Signed in" });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Sign in failed",
        text2: error?.message || "Check the credentials and try again.",
      });
      setLoading(false);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-black/60 justify-end"
      >
        <View className="bg-white dark:bg-slate-900 rounded-t-3xl border border-slate-100 dark:border-slate-800 p-6 pb-10">
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-lg font-bold text-slate-900 dark:text-slate-50">
              Add account
            </Text>
            <TouchableOpacity
              onPress={() => {
                reset();
                onClose();
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.slate[500]} />
            </TouchableOpacity>
          </View>

          <TextInput
            placeholder="Email"
            placeholderTextColor={colors.slate[400]}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!loading}
            className="h-12 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 text-base text-slate-900 dark:text-slate-50 mb-3"
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor={colors.slate[400]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!loading}
            onSubmitEditing={handleSignIn}
            className="h-12 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 text-base text-slate-900 dark:text-slate-50 mb-5"
          />

          <TouchableOpacity
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Sign in to another account"
            className={`h-12 rounded-full items-center justify-center ${
              loading ? "bg-blue-300" : "bg-blue-600"
            }`}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text className="text-white font-bold text-sm">
                Log in & switch
              </Text>
            )}
          </TouchableOpacity>

          <Text className="text-xs text-slate-400 text-center mt-4">
            Your current account stays in the switcher — tap it to swap back.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddAccountModal;
