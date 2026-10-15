import React, { useEffect } from "react";
import { StyleSheet, View, ViewStyle, DimensionValue } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";
import { useTheme } from "@/context/ThemeContext";
import { radius } from "@/constants/theme";

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> & {
  PostCard: React.FC<{ style?: ViewStyle }>;
  Row: React.FC<{ style?: ViewStyle }>;
  GridTile: React.FC<{ size?: number; style?: ViewStyle }>;
  ProfileHeader: React.FC<{ style?: ViewStyle }>;
  Avatar: React.FC<{ size?: number; style?: ViewStyle }>;
} = ({
  width = "100%",
  height = 20,
  borderRadius = radius.sm,
  style,
}) => {
  const { palette, isDark } = useTheme();
  const opacity = useSharedValue(0.4);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!reducedMotion) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 800 }),
          withTiming(0.4, { duration: 800 })
        ),
        -1,
        true
      );
    }
  }, [reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) return { opacity: 0.5 };
    return { opacity: opacity.value };
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: palette.surfacePressed,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

// Preset: Circular Avatar
Skeleton.Avatar = ({ size = 40, style }) => (
  <Skeleton
    width={size}
    height={size}
    borderRadius={size / 2}
    style={style}
  />
);

// Preset: List Row (Avatar + 2 text lines)
Skeleton.Row = ({ style }) => (
  <View style={[styles.rowContainer, style]}>
    <Skeleton.Avatar size={40} style={{ marginRight: 12 }} />
    <View style={styles.flex1}>
      <Skeleton width="60%" height={16} borderRadius={radius.sm} style={{ marginBottom: 6 }} />
      <Skeleton width="40%" height={12} borderRadius={radius.sm} />
    </View>
  </View>
);

// Preset: Feed Post Card
Skeleton.PostCard = ({ style }) => (
  <View style={[styles.postCardContainer, style]}>
    <View style={styles.postCardHeader}>
      <Skeleton.Avatar size={36} style={{ marginRight: 10 }} />
      <View style={styles.flex1}>
        <Skeleton width="45%" height={14} borderRadius={radius.sm} style={{ marginBottom: 4 }} />
        <Skeleton width="25%" height={10} borderRadius={radius.sm} />
      </View>
    </View>
    <Skeleton width="100%" height={320} borderRadius={radius.md} style={{ marginVertical: 10 }} />
    <View style={styles.postCardFooter}>
      <Skeleton width="20%" height={16} borderRadius={radius.sm} />
      <Skeleton width="80%" height={12} borderRadius={radius.sm} style={{ marginTop: 8 }} />
    </View>
  </View>
);

// Preset: Media Grid Tile
Skeleton.GridTile = ({ size = 110, style }) => (
  <Skeleton width={size} height={size} borderRadius={0} style={style} />
);

// Preset: Profile Header
Skeleton.ProfileHeader = ({ style }) => (
  <View style={[styles.profileHeaderContainer, style]}>
    <View style={styles.profileTopRow}>
      <Skeleton.Avatar size={76} />
      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Skeleton width={32} height={16} borderRadius={radius.sm} />
          <Skeleton width={44} height={10} borderRadius={radius.sm} style={{ marginTop: 4 }} />
        </View>
        <View style={styles.statCol}>
          <Skeleton width={32} height={16} borderRadius={radius.sm} />
          <Skeleton width={44} height={10} borderRadius={radius.sm} style={{ marginTop: 4 }} />
        </View>
        <View style={styles.statCol}>
          <Skeleton width={32} height={16} borderRadius={radius.sm} />
          <Skeleton width={44} height={10} borderRadius={radius.sm} style={{ marginTop: 4 }} />
        </View>
      </View>
    </View>
    <Skeleton width="40%" height={16} borderRadius={radius.sm} style={{ marginTop: 14 }} />
    <Skeleton width="75%" height={12} borderRadius={radius.sm} style={{ marginTop: 6 }} />
    <Skeleton width="100%" height={38} borderRadius={radius.md} style={{ marginTop: 16 }} />
  </View>
);

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  postCardContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  postCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  postCardFooter: {
    paddingHorizontal: 4,
  },
  profileHeaderContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statsRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    marginLeft: 20,
  },
  statCol: {
    alignItems: "center",
  },
});
