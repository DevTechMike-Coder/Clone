import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { Redirect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import AuthSplash from "@/components/AuthSplash";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";

const Index = () => {
  const { session, loading } = useAuth();
  const { palette } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (loading || session) {
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(slideUpAnim, {
        toValue: 0,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideUpAnim, loading, session]);

  if (loading) {
    return <AuthSplash />;
  }

  if (session) {
    return <Redirect href="/home" />;
  }

  return (
    <Screen style={{ backgroundColor: palette.background }}>
      <View style={styles.container}>
        {/* Brand visual header */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
            },
          ]}
        >
          {/* Brand Icon Mark */}
          <View
            style={[
              styles.logoBadge,
              {
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.borderSubtle,
              },
            ]}
          >
            <Ionicons name="sparkles" size={36} color={palette.accent} />
          </View>

          <View style={styles.textContainer}>
            <Text variant="display" weight="bold" style={{ color: palette.text, letterSpacing: -1 }}>
              Welcome to{"\n"}
              <Text variant="display" weight="bold" style={{ color: palette.accent }}>
                Clone
              </Text>
            </Text>
            <Text
              variant="body"
              style={{
                color: palette.muted,
                marginTop: 12,
                lineHeight: 24,
                maxWidth: 320,
              }}
            >
              Connect, share moments, and explore short-form stories with a vibrant community.
            </Text>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          style={[
            styles.actionsSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideUpAnim }],
            },
          ]}
        >
          <Button
            title="Create account"
            size="lg"
            fullWidth
            onPress={() => router.push("/signUp")}
          />
          <Button
            title="Sign in"
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => router.push("/signIn")}
            style={{ marginTop: 12 }}
          />

          <Text
            variant="micro"
            align="center"
            style={{
              color: palette.placeholder,
              marginTop: 24,
              lineHeight: 16,
            }}
          >
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </Animated.View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  heroSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  textContainer: {
    alignItems: "flex-start",
  },
  actionsSection: {
    width: "100%",
    paddingBottom: 12,
  },
});

export default Index;

