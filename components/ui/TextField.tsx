import React, { useState, forwardRef } from "react";
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { radius } from "@/constants/theme";
import { Text } from "./Text";

export interface TextFieldProps extends Omit<TextInputProps, "style"> {
  label?: string;
  helperText?: string;
  errorText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  (
    {
      label,
      helperText,
      errorText,
      leftIcon,
      rightIcon,
      showPasswordToggle = false,
      secureTextEntry,
      containerStyle,
      inputStyle,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const { palette, isDark } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const hasError = Boolean(errorText);
    const isSecure = secureTextEntry && !isPasswordVisible;

    const borderColor = hasError
      ? palette.danger
      : isFocused
      ? palette.accent
      : palette.border;

    const handleFocus = (e: any) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text variant="caption" weight="medium" style={styles.label}>
            {label}
          </Text>
        )}

        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: palette.inputBg,
              borderColor,
              borderWidth: isFocused || hasError ? 1.5 : 1,
            },
          ]}
        >
          {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}

          <TextInput
            ref={ref}
            secureTextEntry={isSecure}
            placeholderTextColor={palette.placeholder}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={[
              styles.input,
              {
                color: palette.text,
                fontFamily: "PlusJakartaSans_400Regular",
              },
              inputStyle,
            ]}
            {...props}
          />

          {showPasswordToggle ? (
            <TouchableOpacity
              onPress={() => setIsPasswordVisible((v) => !v)}
              accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"}
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.rightIconContainer}
            >
              <Ionicons
                name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={palette.muted}
              />
            </TouchableOpacity>
          ) : rightIcon ? (
            <View style={styles.rightIconContainer}>{rightIcon}</View>
          ) : null}
        </View>

        {hasError ? (
          <Text variant="caption" color="danger" style={styles.helperText}>
            {errorText}
          </Text>
        ) : helperText ? (
          <Text variant="caption" color="muted" style={styles.helperText}>
            {helperText}
          </Text>
        ) : null}
      </View>
    );
  }
);

TextField.displayName = "TextField";

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 12,
  },
  label: {
    marginBottom: 6,
  },
  inputWrapper: {
    height: 48,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  leftIconContainer: {
    marginRight: 8,
  },
  rightIconContainer: {
    marginLeft: 8,
    padding: 4,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    padding: 0,
  },
  helperText: {
    marginTop: 4,
    marginLeft: 2,
  },
});
