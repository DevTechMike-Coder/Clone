import React from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { radius } from "@/constants/theme";
import { Text } from "./Text";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  snapHeight?: number; // Height in px or defaults to max content / 65% screen
  children: React.ReactNode;
  showHandle?: boolean;
  showClose?: boolean;
  style?: ViewStyle;
}

/**
 * Lightweight, crash-proof native slide-up sheet.
 * Built with native platform modal animations so it requires zero gesture-handler
 * dependencies, eliminating GestureDetector errors on Android and iOS.
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  snapHeight = SCREEN_HEIGHT * 0.65,
  children,
  showHandle = true,
  showClose = true,
  style,
}) => {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop: tap outside to dismiss */}
        <Pressable
          style={[styles.backdrop, { backgroundColor: palette.overlay }]}
          onPress={onClose}
          accessibilityLabel="Dismiss sheet"
          accessibilityRole="button"
        />

        {/* Sheet Card */}
        <View
          style={[
            styles.sheetContainer,
            {
              maxHeight: snapHeight,
              backgroundColor: palette.surface,
              paddingBottom: Math.max(insets.bottom, 16),
            },
            style,
          ]}
        >
          {/* Drag Handle & Header */}
          <View style={styles.dragArea}>
            {showHandle && (
              <View
                style={[
                  styles.handle,
                  { backgroundColor: palette.border },
                ]}
              />
            )}

            {(title || showClose) && (
              <View style={styles.header}>
                <View style={styles.headerSpacer} />
                {title ? (
                  <Text
                    variant="headline"
                    weight="semibold"
                    align="center"
                    style={styles.headerTitle}
                  >
                    {title}
                  </Text>
                ) : null}
                {showClose ? (
                  <TouchableOpacity
                    onPress={onClose}
                    accessibilityLabel="Close sheet"
                    accessibilityRole="button"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.closeBtn}
                  >
                    <Ionicons
                      name="close"
                      size={22}
                      color={palette.muted}
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.headerSpacer} />
                )}
              </View>
            )}
          </View>

          {/* Sheet Body Content */}
          <View style={styles.content}>{children}</View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    width: "100%",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: "hidden",
  },
  dragArea: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    marginBottom: 8,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  headerTitle: {
    flex: 1,
  },
  headerSpacer: {
    width: 32,
  },
  closeBtn: {
    width: 32,
    alignItems: "flex-end",
  },
  content: {
    flexShrink: 1,
  },
});
