import React, { useState } from "react";
import { Redirect, Tabs, useRouter } from "expo-router";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import AuthSplash from "@/components/AuthSplash";
import { BottomSheet, Text, ListRow, ListSection } from "@/components/ui";

export default function TabLayout() {
  const { session, loading } = useAuth();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [createSheetVisible, setCreateSheetVisible] = useState(false);

  if (loading) {
    return <AuthSplash />;
  }

  if (!session) {
    return <Redirect href="/" />;
  }

  const handleOpenCreate = (mode: "Photo" | "Story" | "Video") => {
    setCreateSheetVisible(false);
    setTimeout(() => {
      router.push({
        pathname: "/(pages)/createNew",
        params: { mode },
      });
    }, 150);
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarActiveTintColor: palette.accent,
          tabBarInactiveTintColor: palette.muted,
          tabBarStyle: {
            backgroundColor: palette.surface,
            borderTopColor: palette.borderSubtle,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: 52 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 4,
            paddingTop: 6,
          },
          tabBarItemStyle: {
            justifyContent: "center",
            alignItems: "center",
          },
        }}
      >
        {/* 1. Home */}
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarAccessibilityLabel: "Home Feed",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={25}
                color={color}
              />
            ),
          }}
        />

        {/* 2. Search */}
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
            tabBarAccessibilityLabel: "Explore and Search",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "search" : "search-outline"}
                size={25}
                color={color}
              />
            ),
          }}
        />

        {/* 3. Center Create Action */}
        <Tabs.Screen
          name="create"
          options={{
            title: "Create",
            tabBarAccessibilityLabel: "Create New Post or Story",
            tabBarIcon: () => (
              <View
                style={[
                  styles.createButton,
                  { backgroundColor: palette.accent },
                ]}
              >
                <Ionicons name="add" size={22} color={palette.onAccent} />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setCreateSheetVisible(true);
            },
          }}
        />

        {/* 4. Chat */}
        <Tabs.Screen
          name="chat"
          options={{
            title: "Chat",
            tabBarAccessibilityLabel: "Direct Messages",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={
                  focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"
                }
                size={24}
                color={color}
              />
            ),
          }}
        />

        {/* 5. Profile */}
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarAccessibilityLabel: "My Profile",
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? "person" : "person-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
      </Tabs>

      {/* Center Create Action Bottom Sheet */}
      <BottomSheet
        visible={createSheetVisible}
        onClose={() => setCreateSheetVisible(false)}
        title="Create"
      >
        <View style={styles.sheetContent}>
          <ListSection>
            <ListRow
              icon={
                <Ionicons
                  name="camera-outline"
                  size={20}
                  color={palette.accent}
                />
              }
              title="New Post"
              subtitle="Capture or choose photos for your feed"
              onPress={() => handleOpenCreate("Photo")}
            />
            <ListRow
              icon={
                <Ionicons
                  name="radio-outline"
                  size={20}
                  color={palette.warning}
                />
              }
              title="Add Story"
              subtitle="Share a 24-hour visual moment"
              onPress={() => handleOpenCreate("Story")}
            />
            <ListRow
              icon={
                <Ionicons
                  name="videocam-outline"
                  size={20}
                  color={palette.danger}
                />
              }
              title="Record Video"
              subtitle="Capture and post short video clips"
              onPress={() => handleOpenCreate("Video")}
            />
          </ListSection>
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  createButton: {
    width: 38,
    height: 30,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
});
