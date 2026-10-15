import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ToastConfig, ToastConfigParams } from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";

const SuccessToast = ({ text1, text2, onPress }: ToastConfigParams<any>) => {
  const { isDark, palette } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={{
        width: "92%",
        borderRadius: 16,
        padding: 14,
        paddingHorizontal: 16,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.success + "40",
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        shadowColor: palette.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.25 : 0.12,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          backgroundColor: palette.success + "1A",
          borderColor: palette.success + "40",
        }}
      >
        <Ionicons
          name="checkmark-circle"
          size={22}
          color={palette.success}
        />
      </View>
      <View style={{ flex: 1, paddingRight: 4 }}>
        {text1 ? (
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: palette.text,
              letterSpacing: -0.2,
            }}
          >
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text
            style={{
              fontSize: 12,
              marginTop: 2,
              lineHeight: 16,
              color: palette.muted,
            }}
          >
            {text2}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const ErrorToast = ({ text1, text2, onPress }: ToastConfigParams<any>) => {
  const { isDark, palette } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={{
        width: "92%",
        borderRadius: 16,
        padding: 14,
        paddingHorizontal: 16,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.danger + "40",
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        shadowColor: palette.danger,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.25 : 0.12,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          backgroundColor: palette.danger + "1A",
          borderColor: palette.danger + "40",
        }}
      >
        <Ionicons name="alert-circle" size={22} color={palette.danger} />
      </View>
      <View style={{ flex: 1, paddingRight: 4 }}>
        {text1 ? (
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: palette.text,
              letterSpacing: -0.2,
            }}
          >
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text
            style={{
              fontSize: 12,
              marginTop: 2,
              lineHeight: 16,
              color: palette.muted,
            }}
          >
            {text2}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const InfoToast = ({ text1, text2, onPress }: ToastConfigParams<any>) => {
  const { isDark, palette } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={{
        width: "92%",
        borderRadius: 16,
        padding: 14,
        paddingHorizontal: 16,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.accent + "40",
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        shadowColor: palette.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.25 : 0.12,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          backgroundColor: palette.accent + "1A",
          borderColor: palette.accent + "40",
        }}
      >
        <Ionicons
          name="information-circle"
          size={22}
          color={palette.accent}
        />
      </View>
      <View style={{ flex: 1, paddingRight: 4 }}>
        {text1 ? (
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: palette.text,
              letterSpacing: -0.2,
            }}
          >
            {text1}
          </Text>
        ) : null}
        {text2 ? (
          <Text
            style={{
              fontSize: 12,
              marginTop: 2,
              lineHeight: 16,
              color: palette.muted,
            }}
          >
            {text2}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

export const toastConfig: ToastConfig = {
  success: (props) => <SuccessToast {...props} />,
  error: (props) => <ErrorToast {...props} />,
  info: (props) => <InfoToast {...props} />,
};
