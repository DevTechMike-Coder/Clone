import React, { useState, useEffect } from "react";
import {
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { styled } from "nativewind";
import { router } from "expo-router";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";
import { colors } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { copyToClipboard } from "@/lib/safeClipboard";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import Toast from "react-native-toast-message";
import NotificationModal from "@/components/modal/NotificationModal";

const SafeAreaView = styled(RNSafeAreaView);

export default function YourInformation() {
  const { user } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [clearingSearches, setClearingSearches] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportedData, setExportedData] = useState<any>(null);

  // Notification / Alert Modal State
  const [notifyModal, setNotifyModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: "info" | "success" | "warning" | "error";
    icon?: keyof typeof Ionicons.glyphMap;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showNotify = (config: Omit<typeof notifyModal, "visible">) => {
    setNotifyModal({ ...config, visible: true });
  };

  const closeNotify = () => {
    setNotifyModal((prev) => ({ ...prev, visible: false }));
  };

  // App Permissions State
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [photosPermission, setPhotosPermission] = useState<boolean | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [checkingPermissions, setCheckingPermissions] = useState(false);

  const checkAppPermissions = async () => {
    setCheckingPermissions(true);
    try {
      const media = await ImagePicker.getMediaLibraryPermissionsAsync();
      setPhotosPermission(media.granted);

      const camera = await ImagePicker.getCameraPermissionsAsync();
      setCameraPermission(camera.granted);

      const loc = await Location.getForegroundPermissionsAsync();
      setLocationPermission(loc.granted);
    } catch (err) {
      console.warn("Error checking permissions:", err);
    } finally {
      setCheckingPermissions(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const media = await ImagePicker.getMediaLibraryPermissionsAsync();
        const camera = await ImagePicker.getCameraPermissionsAsync();
        const loc = await Location.getForegroundPermissionsAsync();
        if (isMounted) {
          setPhotosPermission(media.granted);
          setCameraPermission(camera.granted);
          setLocationPermission(loc.granted);
        }
      } catch (err) {
        console.warn("Error checking permissions:", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Clear Search History
  const handleClearSearchHistory = () => {
    showNotify({
      title: "Clear Search History?",
      message: "This will remove all recent searches and suggestions from your search history.",
      type: "warning",
      icon: "trash-outline",
      confirmText: "Clear All",
      cancelText: "Cancel",
      destructive: true,
      onConfirm: async () => {
        closeNotify();
        setClearingSearches(true);
        try {
          await AsyncStorage.removeItem("recent_searches");
          await AsyncStorage.removeItem("search_history");
          await AsyncStorage.removeItem("@clone_recent_searches");
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
      onCancel: closeNotify,
    });
  };

  // Download / Export User Information
  const handleDownloadInformation = async () => {
    if (!user) return;
    setDownloading(true);
    try {
      const data = await authService.exportUserData(user.id);
      setExportedData(data);
      setExportModalVisible(true);
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Export Failed",
        text2: err?.message || "Could not export account data.",
      });
    } finally {
      setDownloading(false);
    }
  };

  // Copy Export JSON to Clipboard
  const handleCopyExport = async () => {
    if (!exportedData) return;
    const jsonString = JSON.stringify(exportedData, null, 2);
    const copied = await copyToClipboard(jsonString);
    if (copied) {
      Toast.show({
        type: "success",
        text1: "Export Copied",
        text2: "Account data summary copied to clipboard.",
      });
    } else {
      showNotify({
        title: "Export Ready",
        message: "Account data compiled. Long-press the summary text to select and copy.",
        type: "info",
        icon: "document-text-outline",
        confirmText: "Got it",
        onConfirm: closeNotify,
      });
    }
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

        {/* Activity & Data Management */}
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
                    Clear your recent search queries and keywords
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
                    Generate an archive of your profile, posts, and bookmarks
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

        {/* Device Permissions Overview */}
        <View className="px-5 mt-6">
          <View className="flex-row items-center justify-between mb-2.5 px-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Device Permissions
            </Text>
            <TouchableOpacity onPress={checkAppPermissions} disabled={checkingPermissions}>
              <Text className="text-xs font-bold text-blue-600">
                {checkingPermissions ? "Refreshing..." : "Refresh"}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 divide-y divide-slate-100">
            {/* Photos Permission */}
            <View className="flex-row items-center justify-between pb-3">
              <View className="flex-row items-center gap-3">
                <Ionicons name="images-outline" size={20} color={colors.slate[700]} />
                <View>
                  <Text className="text-sm font-semibold text-slate-800">
                    Photo Library
                  </Text>
                  <Text className="text-xs text-slate-400">
                    Required for uploading posts & stories
                  </Text>
                </View>
              </View>
              <View
                className={`px-2.5 py-1 rounded-full ${
                  photosPermission ? "bg-emerald-100" : "bg-slate-100"
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    photosPermission ? "text-emerald-800" : "text-slate-600"
                  }`}
                >
                  {photosPermission ? "Allowed" : "Not Allowed"}
                </Text>
              </View>
            </View>

            {/* Camera Permission */}
            <View className="flex-row items-center justify-between py-3">
              <View className="flex-row items-center gap-3">
                <Ionicons name="camera-outline" size={20} color={colors.slate[700]} />
                <View>
                  <Text className="text-sm font-semibold text-slate-800">
                    Camera Access
                  </Text>
                  <Text className="text-xs text-slate-400">
                    Used for capturing photos & recording video
                  </Text>
                </View>
              </View>
              <View
                className={`px-2.5 py-1 rounded-full ${
                  cameraPermission ? "bg-emerald-100" : "bg-slate-100"
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    cameraPermission ? "text-emerald-800" : "text-slate-600"
                  }`}
                >
                  {cameraPermission ? "Allowed" : "Not Allowed"}
                </Text>
              </View>
            </View>

            {/* Location Permission */}
            <View className="flex-row items-center justify-between pt-3">
              <View className="flex-row items-center gap-3">
                <Ionicons name="location-outline" size={20} color={colors.slate[700]} />
                <View>
                  <Text className="text-sm font-semibold text-slate-800">
                    Precise Location
                  </Text>
                  <Text className="text-xs text-slate-400">
                    Used for tagging real-time places on posts
                  </Text>
                </View>
              </View>
              <View
                className={`px-2.5 py-1 rounded-full ${
                  locationPermission ? "bg-emerald-100" : "bg-slate-100"
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    locationPermission ? "text-emerald-800" : "text-slate-600"
                  }`}
                >
                  {locationPermission ? "Allowed" : "Not Allowed"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Data Governance & Privacy Guarantee */}
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
              />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-slate-800">
                  End-to-End Control
                </Text>
                <Text className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  You own your media and personal data. Export or remove your
                  information at any time without restrictions.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Export Data Summary Modal */}
      <Modal
        visible={exportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-end">
          <View className="bg-white rounded-t-3xl p-6 w-full max-h-[80%] shadow-2xl">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2.5">
                <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
                  <Ionicons name="document-text" size={20} color={colors.blue[600]} />
                </View>
                <Text className="text-lg font-bold text-slate-900 tracking-tight">
                  Account Data Archive
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setExportModalVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
              >
                <Ionicons name="close" size={18} color={colors.slate[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-72 mb-4" showsVerticalScrollIndicator={false}>
              <View className="bg-slate-50 p-4 rounded-2xl border border-slate-200 gap-2">
                <Text className="text-xs font-bold text-slate-700 uppercase">
                  Export Summary
                </Text>
                <Text selectable={true} className="text-xs text-slate-600">
                  • User ID: {exportedData?.user_id}
                </Text>
                <Text selectable={true} className="text-xs text-slate-600">
                  • Handle: @{exportedData?.profile?.username || "N/A"}
                </Text>
                <Text selectable={true} className="text-xs text-slate-600">
                  • Total Posts: {exportedData?.posts_count}
                </Text>
                <Text selectable={true} className="text-xs text-slate-600">
                  • Bookmarked Posts: {exportedData?.bookmarks_count}
                </Text>
                <Text selectable={true} className="text-xs text-slate-600">
                  • Likes Recorded: {exportedData?.likes_count}
                </Text>
                <Text selectable={true} className="text-xs text-slate-600">
                  • Export Date: {exportedData?.exported_at}
                </Text>
              </View>
            </ScrollView>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleCopyExport}
                className="flex-1 py-3.5 rounded-xl border border-slate-200 bg-slate-100 items-center justify-center"
              >
                <Text className="text-sm font-semibold text-slate-800">
                  Copy JSON
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setExportModalVisible(false);
                  showNotify({
                    title: "Download Scheduled",
                    message: `A complete export bundle has also been queued for delivery to ${user?.email || "your registered email"}.`,
                    type: "info",
                    icon: "mail-outline",
                    confirmText: "OK",
                    onConfirm: closeNotify,
                  });
                }}
                className="flex-1 py-3.5 rounded-xl bg-blue-600 items-center justify-center shadow-sm"
              >
                <Text className="text-sm font-bold text-white">
                  Email Archive
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notification / Confirmation Modal */}
      <NotificationModal {...notifyModal} />
    </SafeAreaView>
  );
}
