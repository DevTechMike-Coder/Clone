import React, { useEffect } from "react";
import {
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";
import { useTheme } from "@/context/ThemeContext";
import { radius, motion } from "@/constants/theme";
import { Text } from "./Text";
import { Button } from "./Button";

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  icon?: React.ReactNode;
  confirmText?: string;
  onConfirm?: () => void;
  cancelText?: string;
  onCancel?: () => void;
  destructive?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export const Dialog: React.FC<DialogProps> = ({
  visible,
  onClose,
  title,
  message,
  icon,
  confirmText = "OK",
  onConfirm,
  cancelText,
  onCancel,
  destructive = false,
  loading = false,
  children,
  style,
}) => {
  const { palette } = useTheme();
  const scale = useSharedValue(0.92);
  const opacity = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (visible) {
      if (reducedMotion) {
        scale.value = 1;
        opacity.value = 1;
      } else {
        opacity.value = withTiming(1, { duration: 180 });
        scale.value = withSpring(1, motion.pop);
      }
    } else {
      scale.value = 0.92;
      opacity.value = 0;
    }
  }, [visible, reducedMotion, scale, opacity]);

  const dialogAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              styles.backdrop,
              { backgroundColor: palette.overlay },
              backdropAnimatedStyle,
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.dialogCard,
            {
              backgroundColor: palette.surfaceElevated,
              borderColor: palette.border,
            },
            dialogAnimatedStyle,
            style,
          ]}
        >
          {icon && <View style={styles.iconContainer}>{icon}</View>}

          <Text
            variant="title"
            weight="semibold"
            align="center"
            style={styles.title}
          >
            {title}
          </Text>

          {message && (
            <Text
              variant="body"
              color="muted"
              align="center"
              style={styles.message}
            >
              {message}
            </Text>
          )}

          {children}

          <View style={styles.actions}>
            {cancelText && (
              <Button
                title={cancelText}
                variant="outline"
                size="md"
                onPress={onCancel || onClose}
                style={styles.actionButton}
                disabled={loading}
              />
            )}
            <Button
              title={confirmText}
              variant={destructive ? "danger" : "primary"}
              size="md"
              loading={loading}
              onPress={onConfirm || onClose}
              style={styles.actionButton}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  dialogCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: radius.xl,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  message: {
    marginBottom: 20,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
