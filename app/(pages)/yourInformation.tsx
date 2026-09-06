import React, { useState } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { styled } from "nativewind";
import { router } from "expo-router";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { colors } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

const SafeAreaView = styled(RNSafeAreaView);

export default function YourInformation() {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [clearingSearches, setClearingSearches] = useState(false);

  const handleClearSearchHistory = () => {
    Alert.alert(
      "Clear Search History?",
      "This will remove all recent searches and suggestions from your search history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            setClearingSearches(true);
            try {
              // Clear any cached search query keys
              await AsyncStorage.removeItem("recent_searches");
              await AsyncStorage.removeItem("search_history");
              Toast.show({
                type: "success",
                text1: "Search History Cleared",
                text2: "Your recent searches have been removed.",
              });
            } catch {
              Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to clear search history.",
              });
            } finally {
              setClearingSearches(false);
            }
          },
        },
      ]
    );
  };

  const handleDownloadInformation = () => {
    Alert.alert(
      "Request Information Download",
      `We will compile an archive of your profile, posts, stories, comments, and messages, and send a download link to ${user?.email || "your registered email"}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Download",
          onPress: () => {
            setDownloading(true);
            setTimeout(() => {
              setDownloading(false);
              Alert.alert(
                "Export Requested",
                `We've started creating a file of your information. We'll email a link to ${user?.email} when it's ready to download.`
              );
            }, 1200);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-3">
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="w-10 h-10 rounded-full items-center justify-center -ml-2 active:bg-slate-100"
        >
          <Ionicons name="arrow-back" size={24} color={colors.slate[800]} />
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-base font-bold text-slate-900 tracking-tight">
            Your Information & Permissions
          </Text>
        </View>

        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro */}
        <View className="px-5 pt-6 pb-4">
          <Text className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Your Information and Permissions
          </Text>
          <Text className="text-sm text-slate-500 mt-1.5 leading-relaxed">
            Manage, review, and download the data associated with your Clone
            account.
          </Text>
        </View>

        {/* Your Activity */}
        <View className="px-5 mt-2">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
            Activity & Data
          </Text>

          <View className="bg-white rounded-2xl border border-slate-200/90 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {/* Search History */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleClearSearchHistory}
              disabled={clearingSearches}
              className="p-4 flex-row items-center justify-between active:bg-slate-50"
            >
              <View className="flex-row items-center gap-3.5 flex-1 pr-3">
                <View className="w-10 h-10 rounded-xl bg-violet-50 items-center justify-center">
                  <Ionicons name="search-outline" size={20} color={colors.violet[600]} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-900 tracking-tight">
                    Search history
                  </Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    Clear your search history and recent queries
                  </Text>
                </View>
              </View>

              {clearingSearches ? (
                <ActivityIndicator size="small" color={colors.violet[600]} />
              ) : (
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={colors.slate[400]}
                />
              )}
            </TouchableOpacity>

            {/* Download Data */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDownloadInformation}
              disabled={downloading}
              className="p-4 flex-row items-center justify-between active:bg-slate-50"
            >
              <View className="flex-row items-center gap-3.5 flex-1 pr-3">
                <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
                  <Ionicons
                    name="cloud-download-outline"
                    size={20}
                    color={colors.blue[600]}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-900 tracking-tight">
                    Download your information
                  </Text>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    Request a copy of your photos, posts, and profile data
                  </Text>
                </View>
              </View>

              {downloading ? (
                <ActivityIndicator size="small" color={colors.blue[600]} />
              ) : (
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.slate[300]}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Security & Access Info */}
        <View className="px-5 mt-6">
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
            Data Governance & Privacy
          </Text>

          <View className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 gap-3">
            <View className="flex-row items-start gap-3">
              <Ionicons
                name="shield-outline"
                size={18}
                color={colors.slate[600]}
                className="mt-0.5"
              />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-800">
                  End-to-End Control
                </Text>
                <Text className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  You own your media and data. Export or remove your information at
                  any time without restrictions.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
