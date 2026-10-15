import React, { useState } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

import { authService } from "@/services/authService";
import { useTheme } from "@/context/ThemeContext";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Text } from "@/components/ui/Text";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { PressableScale } from "@/components/ui/PressableScale";

const SignIn = () => {
  const { palette } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const validate = () => {
    let isValid = true;
    setEmailError("");
    setPasswordError("");

    if (!email.trim()) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setEmailError("Please enter a valid email address");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    }

    return isValid;
  };

  const handleGoogleSignIn = async () => {
    try {
      setOauthLoading("google");
      const data = await authService.signInWithGoogle();
      if (data) {
        router.replace("/home");
      }
    } catch (error: any) {
      if (error?.message && !error.message.includes("cancelled")) {
        Toast.show({
          type: "error",
          text1: "Google Sign In Failed",
          text2: error.message || "Failed to authenticate with Google",
        });
      }
    } finally {
      setOauthLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setOauthLoading("apple");
      await authService.signInWithApple();
      router.replace("/home");
    } catch (error: any) {
      if (error?.message && !error.message.includes("cancelled")) {
        Toast.show({
          type: "error",
          text1: "Apple Sign In Failed",
          text2: error.message || "Failed to authenticate with Apple",
        });
      }
    } finally {
      setOauthLoading(null);
    }
  };

  const handleSignIn = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      await authService.signIn(email.trim(), password);
      router.replace("/home");
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Sign In Error",
        text2: error.message || "An unexpected error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={{ backgroundColor: palette.background }}>
      <ScreenHeader
        title=""
        showBack
        borderBottom={false}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            {/* Header Titles */}
            <View style={styles.headerBlock}>
              <Text variant="title" weight="bold" style={{ color: palette.text }}>
                Welcome back
              </Text>
              <Text
                variant="body"
                style={{ color: palette.muted, marginTop: 6, textAlign: "center" }}
              >
                Sign in to continue exploring your feed
              </Text>
            </View>

            {/* Inputs */}
            <View style={styles.inputsBlock}>
              <TextField
                label="Email"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (emailError) setEmailError("");
                }}
                errorText={emailError}
                leftIcon={
                  <Ionicons name="mail-outline" size={18} color={palette.muted} />
                }
              />

              <TextField
                label="Password"
                placeholder="Enter your password"
                secureTextEntry
                showPasswordToggle
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (passwordError) setPasswordError("");
                }}
                errorText={passwordError}
                leftIcon={
                  <Ionicons name="lock-closed-outline" size={18} color={palette.muted} />
                }
              />
            </View>

            {/* Primary Submit Button */}
            <Button
              title="Sign In"
              size="lg"
              fullWidth
              loading={loading}
              onPress={handleSignIn}
              style={{ marginTop: 8 }}
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: palette.borderSubtle }]} />
              <Text variant="caption" weight="semibold" style={{ color: palette.muted, marginHorizontal: 12 }}>
                OR
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: palette.borderSubtle }]} />
            </View>

            {/* Social Auth */}
            <View style={styles.socialRow}>
              <Button
                variant="outline"
                size="md"
                fullWidth
                loading={oauthLoading === "google"}
                disabled={Boolean(oauthLoading)}
                onPress={handleGoogleSignIn}
                leftIcon={
                  <Image
                    source={require("@/assets/brandIcon/google.png")}
                    style={{ width: 18, height: 18 }}
                    resizeMode="contain"
                  />
                }
                title="Google"
                style={{ flex: 1 }}
              />

              <Button
                variant="outline"
                size="md"
                fullWidth
                loading={oauthLoading === "apple"}
                disabled={Boolean(oauthLoading)}
                onPress={handleAppleSignIn}
                leftIcon={
                  <Image
                    source={require("@/assets/brandIcon/apple.png")}
                    style={{ width: 18, height: 18 }}
                    resizeMode="contain"
                  />
                }
                title="Apple"
                style={{ flex: 1 }}
              />
            </View>

            {/* Bottom Redirect Link */}
            <View style={styles.footerRow}>
              <Text variant="bodyMedium" style={{ color: palette.muted }}>
                Don&apos;t have an account?{" "}
              </Text>
              <PressableScale onPress={() => router.push("/signUp")}>
                <Text variant="bodyMedium" weight="semibold" style={{ color: palette.accent }}>
                  Sign Up
                </Text>
              </PressableScale>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  formContainer: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  headerBlock: {
    alignItems: "center",
    marginBottom: 32,
  },
  inputsBlock: {
    gap: 4,
    marginBottom: 16,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
  },
});

export default SignIn;
