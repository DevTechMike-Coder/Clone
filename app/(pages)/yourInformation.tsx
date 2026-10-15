import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { copyToClipboard } from "@/lib/safeClipboard";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import Toast from "react-native-toast-message";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { authService } from "@/services/authService";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import NotificationModal from "@/components/modal/NotificationModal";

export default function YourInformation() {
  const { user } = useAuth();
  const { palette } = useTheme();

  const [downloading, setDownloading] = useState(false);
  const [clearingSearches, setClearingSearches] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportedData, setExportedData] = useState<any>(null);

  // Notification Modal State
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
    <Screen
      scrollable
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <ScreenHeader
        title="Your Information & Permissions"
        showBack
        onBackPress={() => router.back()}
        borderBottom
      />

      <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
        <Text variant="title">Your Information & Permissions</Text>
        <Text
          variant="body"
          color="muted"
          style={{ marginTop: 6, lineHeight: 22 }}
        >
          Manage, review, and download the data associated with your Clone
          account.
        </Text>
      </View>

      {/* Activity & Data Section */}
      <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
        <Text
          variant="caption"
          weight="bold"
          color="muted"
          style={{
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 10,
            paddingHorizontal: 4,
          }}
        >
          Activity & Data
        </Text>

        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.border,
            overflow: "hidden",
          }}
        >
          {/* Search History */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleClearSearchHistory}
            disabled={clearingSearches}
            style={{
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderBottomWidth: 1,
              borderBottomColor: palette.borderSubtle,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
                paddingRight: 12,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: palette.accent + "1A",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="search-outline" size={20} color={palette.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text variant="body" weight="semibold">
                  Search history
                </Text>
                <Text variant="micro" color="muted" style={{ marginTop: 2 }}>
                  Clear your recent search queries and keywords
                </Text>
              </View>
            </View>

            {clearingSearches ? (
              <ActivityIndicator size="small" color={palette.accent} />
            ) : (
              <Ionicons
                name="trash-outline"
                size={18}
                color={palette.muted}
              />
            )}
          </TouchableOpacity>

          {/* Download Data */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleDownloadInformation}
            disabled={downloading}
            style={{
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
                paddingRight: 12,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: palette.accent + "1A",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="cloud-download-outline"
                  size={20}
                  color={palette.accent}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text variant="body" weight="semibold">
                  Download your information
                </Text>
                <Text variant="micro" color="muted" style={{ marginTop: 2 }}>
                  Generate an archive of your profile, posts, and bookmarks
                </Text>
              </View>
            </View>

            {downloading ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : (
              <Ionicons
                name="chevron-forward"
                size={18}
                color={palette.muted}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Device Permissions Overview */}
      <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
            paddingHorizontal: 4,
          }}
        >
          <Text
            variant="caption"
            weight="bold"
            color="muted"
            style={{
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Device Permissions
          </Text>
          <TouchableOpacity onPress={checkAppPermissions} disabled={checkingPermissions}>
            <Text variant="caption" weight="bold" color="accent">
              {checkingPermissions ? "Refreshing..." : "Refresh"}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            backgroundColor: palette.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: palette.border,
            padding: 16,
          }}
        >
          {/* Photos */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: palette.borderSubtle,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Ionicons name="images-outline" size={20} color={palette.text} />
              <View>
                <Text variant="body" weight="semibold">
                  Photo Library
                </Text>
                <Text variant="micro" color="muted">
                  Required for uploading posts & stories
                </Text>
              </View>
            </View>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 12,
                backgroundColor: photosPermission
                  ? palette.success + "20"
                  : palette.surfaceMuted,
              }}
            >
              <Text
                variant="micro"
                weight="bold"
                color={photosPermission ? "success" : "muted"}
              >
                {photosPermission ? "Allowed" : "Not Allowed"}
              </Text>
            </View>
          </View>

          {/* Camera */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: palette.borderSubtle,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Ionicons name="camera-outline" size={20} color={palette.text} />
              <View>
                <Text variant="body" weight="semibold">
                  Camera Access
                </Text>
                <Text variant="micro" color="muted">
                  Used for capturing photos & recording video
                </Text>
              </View>
            </View>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 12,
                backgroundColor: cameraPermission
                  ? palette.success + "20"
                  : palette.surfaceMuted,
              }}
            >
              <Text
                variant="micro"
                weight="bold"
                color={cameraPermission ? "success" : "muted"}
              >
                {cameraPermission ? "Allowed" : "Not Allowed"}
              </Text>
            </View>
          </View>

          {/* Location */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Ionicons name="location-outline" size={20} color={palette.text} />
              <View>
                <Text variant="body" weight="semibold">
                  Precise Location
                </Text>
                <Text variant="micro" color="muted">
                  Used for tagging real-time places on posts
                </Text>
              </View>
            </View>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 12,
                backgroundColor: locationPermission
                  ? palette.success + "20"
                  : palette.surfaceMuted,
              }}
            >
              <Text
                variant="micro"
                weight="bold"
                color={locationPermission ? "success" : "muted"}
              >
                {locationPermission ? "Allowed" : "Not Allowed"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Export Data Summary Modal */}
      <Modal
        visible={exportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setExportModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: palette.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              width: "100%",
              maxHeight: "80%",
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text variant="headline">Account Data Archive</Text>
              <TouchableOpacity onPress={() => setExportModalVisible(false)}>
                <Ionicons name="close" size={20} color={palette.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 260, marginBottom: 16 }} showsVerticalScrollIndicator={false}>
              <View
                style={{
                  backgroundColor: palette.surfaceMuted,
                  padding: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: palette.border,
                  gap: 8,
                }}
              >
                <Text variant="caption" weight="bold">
                  Export Summary
                </Text>
                <Text selectable variant="caption" color="muted">
                  • User ID: {exportedData?.user_id}
                </Text>
                <Text selectable variant="caption" color="muted">
                  • Handle: @{exportedData?.profile?.username || "N/A"}
                </Text>
                <Text selectable variant="caption" color="muted">
                  • Total Posts: {exportedData?.posts_count}
                </Text>
                <Text selectable variant="caption" color="muted">
                  • Bookmarked Posts: {exportedData?.bookmarks_count}
                </Text>
                <Text selectable variant="caption" color="muted">
                  • Likes Recorded: {exportedData?.likes_count}
                </Text>
                <Text selectable variant="caption" color="muted">
                  • Export Date: {exportedData?.exported_at}
                </Text>
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Copy JSON"
                  variant="outline"
                  onPress={handleCopyExport}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Email Archive"
                  variant="primary"
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
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <NotificationModal {...notifyModal} />
    </Screen>
  );
}
