import { Tabs } from "expo-router";
import { bottomTabs } from "@/constants/data";
import { View, Image } from "react-native";
import { clsx } from "clsx";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TabIcon = ({ focused, icon }: TabIconProps) => {
  return (
    <View>
      {/* Pill highlight only wraps the icon */}
      <View className={clsx("tab-pill", focused && "tabs-active")}>
        <Image source={icon} resizeMode="contain" className="w-8 h-8" />
      </View>
    </View>
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position : "absolute",
          bottom: Math.max(insets.bottom, 16),
          height: 70,
          marginHorizontal: 20,
          borderRadius: 20,
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 15
        },
        tabBarIconStyle: {
          width: 30,
          height: 30,
          alignItems: "center",
          justifyContent: "center"
        }
      }}
    >
      {bottomTabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused }) => (
              <TabIcon focused={focused} icon={tab.icon}/>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}