import React from "react";
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { radius } from "@/constants/theme";
import { Text } from "./Text";

export interface TabItem<T = string> {
  key: T;
  label: string;
  badge?: number | string;
  icon?: (active: boolean) => React.ReactNode;
}

export interface SegmentedTabsProps<T = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabChange: (key: T) => void;
  variant?: "pill" | "underline";
  style?: ViewStyle;
}

export function SegmentedTabs<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  variant = "pill",
  style,
}: SegmentedTabsProps<T>) {
  const { palette } = useTheme();

  if (variant === "underline") {
    return (
      <View
        accessibilityRole="tablist"
        style={[
          styles.underlineContainer,
          { borderBottomColor: palette.borderSubtle },
          style,
        ]}
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => onTabChange(tab.key)}
              style={[
                styles.underlineTab,
                isActive && {
                  borderBottomColor: palette.accent,
                  borderBottomWidth: 2,
                },
              ]}
            >
              <View style={styles.tabContent}>
                {tab.icon && tab.icon(isActive)}
                <Text
                  variant="bodyMedium"
                  weight={isActive ? "semibold" : "medium"}
                  color={isActive ? "accent" : "muted"}
                  style={tab.icon ? { marginLeft: 6 } : undefined}
                >
                  {tab.label}
                </Text>
                {tab.badge !== undefined && (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: isActive
                          ? palette.accent
                          : palette.surfaceMuted,
                      },
                    ]}
                  >
                    <Text
                      variant="micro"
                      weight="bold"
                      style={{ color: isActive ? palette.onAccent : palette.muted }}
                    >
                      {tab.badge}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // Pill variant
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.pillContainer,
        {
          backgroundColor: palette.surfaceMuted,
        },
        style,
      ]}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onTabChange(tab.key)}
            style={[
              styles.pillTab,
              isActive && [
                styles.pillTabActive,
                {
                  backgroundColor: palette.surface,
                  shadowColor: palette.shadowColor,
                },
              ],
            ]}
          >
            <View style={styles.tabContent}>
              {tab.icon && tab.icon(isActive)}
              <Text
                variant="bodyMedium"
                weight={isActive ? "semibold" : "medium"}
                color={isActive ? "default" : "muted"}
                style={tab.icon ? { marginLeft: 6 } : undefined}
              >
                {tab.label}
              </Text>
              {tab.badge !== undefined && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: isActive
                        ? palette.accent
                        : palette.borderSubtle,
                    },
                  ]}
                >
                  <Text
                    variant="micro"
                    weight="bold"
                    style={{ color: isActive ? palette.onAccent : palette.muted }}
                  >
                    {tab.badge}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pillContainer: {
    flexDirection: "row",
    borderRadius: radius.md,
    padding: 3,
    alignItems: "center",
  },
  pillTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  pillTabActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  underlineContainer: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  underlineTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginLeft: 6,
  },
});
