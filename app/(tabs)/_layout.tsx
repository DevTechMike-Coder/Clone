import { Redirect, Tabs } from "expo-router";
import { bottomTabs } from "@/constants/data";
import { View, Image } from "react-native";
import { clsx } from "clsx";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import AuthSplash from "@/components/AuthSplash";
import { colors } from "@/constants/theme";

interface TabIconProps {
  focused: boolean;
  icon: any;
  isDark: boolean;
}

const TabIcon = ({ focused, icon, isDark }: TabIconProps) => {
  return (
    <View>
      {/* Pill highlight only wraps the icon */}
      <View
        className={clsx(
          "tab-pill",
          focused && "tabs-active",
          !focused && isDark && "bg-slate-800/40"
        )}
      >
        <Image
          source={icon}
          resizeMode="contain"
          className="w-8 h-8"
          style={{
            tintColor: focused
              ? colors.white
              : isDark
              ? colors.slate[400]
              : colors.slate[500],
          }}
        />
      </View>
    </View>
  );
};

export default function TabLayout() {
  const { session, loading } = useAuth();
  const { isDark, palette } = useTheme();
  const insets = useSafeAreaInsets();

  if (loading) {
    return <AuthSplash />;
  }

  if (!session) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: "absolute",
          bottom: Math.max(insets.bottom, 16),
          height: 70,
          marginHorizontal: 20,
          borderRadius: 20,
          borderTopWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.surface,
          elevation: 6,
          shadowColor: isDark ? "#000000" : colors.slate[900],
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.35 : 0.08,
          shadowRadius: 18,
        },
        tabBarItemStyle: {
          paddingVertical: 15,
        },
        tabBarIconStyle: {
          width: 30,
          height: 30,
          alignItems: "center",
          justifyContent: "center",
        },
      }}
    >
      {bottomTabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.title,
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon={tab.icon} isDark={isDark} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
