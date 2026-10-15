import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import {
  SafeAreaView,
  SafeAreaViewProps,
  Edge,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/context/ThemeContext";

export interface ScreenProps extends Omit<SafeAreaViewProps, "style"> {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  scrollViewProps?: Omit<ScrollViewProps, "contentContainerStyle" | "refreshControl">;
  refreshing?: boolean;
  onRefresh?: () => void;
  keyboardAvoiding?: boolean;
  keyboardOffset?: number;
  edges?: readonly Edge[];
  statusBarStyle?: "auto" | "light" | "dark";
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  style,
  contentContainerStyle,
  scrollable = false,
  scrollViewProps,
  refreshing,
  onRefresh,
  keyboardAvoiding = false,
  keyboardOffset = Platform.OS === "ios" ? 0 : 0,
  edges = ["top", "left", "right"],
  statusBarStyle,
  ...props
}) => {
  const { palette, isDark } = useTheme();

  const resolvedStatusBarStyle =
    statusBarStyle || (isDark ? "light" : "dark");

  const refreshControl =
    onRefresh !== undefined ? (
      <RefreshControl
        refreshing={refreshing ?? false}
        onRefresh={onRefresh}
        tintColor={palette.accent}
        colors={[palette.accent]}
        progressBackgroundColor={palette.surfaceElevated}
      />
    ) : undefined;

  let content = children;

  if (scrollable) {
    content = (
      <ScrollView
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        {...scrollViewProps}
      >
        {children}
      </ScrollView>
    );
  }

  if (keyboardAvoiding) {
    content = (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={keyboardOffset}
        style={styles.keyboardView}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return (
    <SafeAreaView
      edges={edges}
      style={[
        styles.screen,
        { backgroundColor: palette.background },
        style,
      ]}
      {...props}
    >
      <StatusBar style={resolvedStatusBarStyle} />
      {content}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
