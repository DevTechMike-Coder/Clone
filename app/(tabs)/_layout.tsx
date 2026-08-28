import { Redirect, Tabs } from "expo-router";
import { bottomTabs } from "@/constants/data";
import { View, Image } from "react-native";
import { clsx } from "clsx";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import AuthSplash from "@/components/AuthSplash";

const TabIcon = ({ focused, icon }: TabIconProps) => {
  return (
    <View>
      {/* Pill highlight only wraps the icon */}
      <View className={clsx("tab-pill", focused && "tabs-active")}>
        <Image
          source={icon}
          resizeMode="contain"
          className="w-8 h-8"
          style={{ tintColor: focused ? "#FFFFFF" : "#64748B" }}
        />
      </View>
    </View>
  );
};

export default function TabLayout() {
  const { session, loading } = useAuth();
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
          borderColor: "#E2E8F0",
          backgroundColor: "#FFFFFF",
          elevation: 6,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
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
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon={tab.icon} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
