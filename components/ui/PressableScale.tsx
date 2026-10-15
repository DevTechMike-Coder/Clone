import React from "react";
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: boolean | Haptics.ImpactFeedbackStyle;
  children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
}

export const PressableScale = React.forwardRef<any, PressableScaleProps>(
  (
    {
      children,
      style,
      scaleTo = 0.97,
      haptic = false,
      disabled,
      onPressIn,
      onPressOut,
      onPress,
      ...rest
    },
    ref
  ) => {
    const scale = useSharedValue(1);
    const reducedMotion = useReducedMotion();

    const animatedStyle = useAnimatedStyle(() => {
      if (reducedMotion) {
        return {};
      }
      return {
        transform: [{ scale: scale.value }],
      };
    });

    const handlePressIn = (e: GestureResponderEvent) => {
      if (!disabled) {
        if (!reducedMotion) {
          scale.value = withTiming(scaleTo, { duration: 90 });
        }
        if (haptic) {
          if (typeof haptic === "string") {
            Haptics.impactAsync(haptic);
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      }
      onPressIn?.(e);
    };

    const handlePressOut = (e: GestureResponderEvent) => {
      if (!disabled && !reducedMotion) {
        scale.value = withSpring(1, { damping: 15, stiffness: 250 });
      }
      onPressOut?.(e);
    };

    return (
      <AnimatedPressable
        ref={ref}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={[animatedStyle, style]}
        {...rest}
      >
        {children as any}
      </AnimatedPressable>
    );
  }
);

PressableScale.displayName = "PressableScale";
