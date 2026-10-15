import React, { useEffect, useCallback } from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from "react-native";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  useReducedMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { radius, motion } from "@/constants/theme";
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
  const { palette, isDark } = useTheme();
  const translateY = useSharedValue(snapHeight);
  const backdropOpacity = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const closeSheet = useCallback(() => {
    if (reducedMotion) {
      translateY.value = snapHeight;
      backdropOpacity.value = 0;
      handleClose();
      return;
    }
    backdropOpacity.value = withTiming(0, { duration: 180 });
    translateY.value = withTiming(snapHeight, { duration: 220 }, (finished) => {
      if (finished) {
        runOnJS(handleClose)();
      }
    });
  }, [snapHeight, handleClose, reducedMotion, translateY, backdropOpacity]);

  useEffect(() => {
    if (visible) {
      if (reducedMotion) {
        translateY.value = 0;
        backdropOpacity.value = 1;
      } else {
        backdropOpacity.value = withTiming(1, { duration: 200 });
        translateY.value = withSpring(0, motion.sheet);
      }
    } else {
      translateY.value = snapHeight;
      backdropOpacity.value = 0;
    }
  }, [visible, snapHeight, reducedMotion, translateY, backdropOpacity]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 120 || event.velocityY > 600) {
        runOnJS(closeSheet)();
      } else {
        translateY.value = withSpring(0, motion.sheet);
      }
    });

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={closeSheet}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={closeSheet}>
          <Animated.View
            style={[
              styles.backdrop,
              { backgroundColor: palette.overlay },
              backdropAnimatedStyle,
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Sheet Content */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              maxHeight: snapHeight,
              backgroundColor: palette.surface,
              paddingBottom: Math.max(insets.bottom, 16),
            },
            sheetAnimatedStyle,
            style,
          ]}
        >
          <GestureDetector gesture={panGesture}>
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
                      onPress={closeSheet}
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
          </GestureDetector>

          <View style={styles.content}>{children}</View>
        </Animated.View>
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
    flex: 1,
  },
});
