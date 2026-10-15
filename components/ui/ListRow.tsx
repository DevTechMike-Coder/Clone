import React from "react";
import {
  StyleSheet,
  Switch,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { radius } from "@/constants/theme";
import { Text } from "./Text";
import { PressableScale } from "./PressableScale";

export interface ListRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: React.ReactNode;
  iconTileColor?: string;
  showChevron?: boolean;
  isSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (val: boolean) => void;
  destructive?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  rightElement?: React.ReactNode;
  disabled?: boolean;
}

export const ListRow: React.FC<ListRowProps> = ({
  title,
  subtitle,
  value,
  icon,
  iconTileColor,
  showChevron = true,
  isSwitch = false,
  switchValue = false,
  onSwitchChange,
  destructive = false,
  onPress,
  style,
  rightElement,
  disabled = false,
}) => {
  const { palette } = useTheme();

  const isInteractive = Boolean(onPress) && !isSwitch && !disabled;

  const content = (
    <View
      style={[
        styles.row,
        {
          opacity: disabled ? 0.45 : 1,
        },
        style,
      ]}
    >
      {icon && (
        <View
          style={[
            styles.iconTile,
            {
              backgroundColor: iconTileColor || palette.surfaceMuted,
            },
          ]}
        >
          {icon}
        </View>
      )}

      <View style={styles.textContainer}>
        <Text
          variant="body"
          weight="medium"
          color={destructive ? "danger" : "default"}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" color="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.rightContainer}>
        {value && (
          <Text variant="body" color="muted" style={styles.valueText}>
            {value}
          </Text>
        )}

        {isSwitch ? (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: palette.border, true: palette.accent }}
            thumbColor={palette.onAccent}
            disabled={disabled}
          />
        ) : rightElement ? (
          rightElement
        ) : showChevron && isInteractive ? (
          <Ionicons name="chevron-forward" size={18} color={palette.muted} />
        ) : null}
      </View>
    </View>
  );

  if (isInteractive) {
    return (
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={styles.pressable}
      >
        {content}
      </PressableScale>
    );
  }

  return content;
};

export interface ListSectionProps {
  title?: string;
  footer?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const ListSection: React.FC<ListSectionProps> = ({
  title,
  footer,
  children,
  style,
}) => {
  const { palette } = useTheme();
  const childArray = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={[styles.sectionContainer, style]}>
      {title && (
        <Text
          variant="caption"
          weight="semibold"
          color="muted"
          style={styles.sectionTitle}
        >
          {title.toUpperCase()}
        </Text>
      )}

      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
          },
        ]}
      >
        {childArray.map((child, idx) => (
          <React.Fragment key={idx}>
            {child}
            {idx < childArray.length - 1 && (
              <View
                style={[
                  styles.separator,
                  { backgroundColor: palette.borderSubtle },
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      {footer && (
        <Text variant="caption" color="muted" style={styles.sectionFooter}>
          {footer}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 20,
    width: "100%",
  },
  sectionTitle: {
    marginBottom: 8,
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  sectionFooter: {
    marginTop: 6,
    marginLeft: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 52,
  },
  pressable: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  valueText: {
    marginRight: 6,
  },
});
