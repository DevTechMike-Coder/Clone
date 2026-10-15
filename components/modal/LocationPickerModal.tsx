import React, { useEffect, useState, useRef } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";
import { locationService, RealLocationItem } from "@/services/locationService";

type LocationPickerModalProps = {
  visible: boolean;
  selectedLocation: string | null;
  onClose: () => void;
  onSelectLocation: (location: string | null) => void;
};

export default function LocationPickerModal({
  visible,
  selectedLocation,
  onClose,
  onSelectLocation,
}: LocationPickerModalProps) {
  const { isDark, palette } = useTheme();
  const [search, setSearch] = useState("");
  const [currentLocation, setCurrentLocation] = useState<RealLocationItem | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [searchResults, setSearchResults] = useState<RealLocationItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const debounceTimer = useRef<any>(null);

  const handleFetchCurrentLocation = async () => {
    setLoadingCurrent(true);
    setPermissionDenied(false);
    try {
      const loc = await locationService.getCurrentLocation();
      if (loc) {
        setCurrentLocation(loc);
      } else {
        setPermissionDenied(true);
      }
    } catch {
      setPermissionDenied(true);
    } finally {
      setLoadingCurrent(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (visible) {
      (async () => {
        setSearch("");
        setSearchResults([]);
        handleFetchCurrentLocation();

        // Load nearby / popular places initially
        const nearby = await locationService.getPopularLocations();
        if (isMounted) {
          setSearchResults(nearby);
        }
      })();
    }

    return () => {
      isMounted = false;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [visible]);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!text.trim()) {
      locationService.getPopularLocations().then((res) => setSearchResults(res));
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await locationService.searchLocations(text);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handlePickLocation = (locName: string) => {
    Haptics.selectionAsync();
    onSelectLocation(locName);
    onClose();
  };

  const handleClearLocation = () => {
    Haptics.selectionAsync();
    onSelectLocation(null);
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-end"
        style={{ backgroundColor: palette.overlay }}
      >
        <View
          className="rounded-t-[32px] max-h-[85%] flex-1 pt-4 pb-8 px-5 border-t shadow-2xl"
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.border,
          }}
        >
          {/* Sheet Handle */}
          <View className="items-center mb-3">
            <View
              className="w-12 h-1.5 rounded-full"
              style={{
                backgroundColor: isDark
                  ? colors.slate[700]
                  : colors.slate[300],
              }}
            />
          </View>

          {/* Header */}
          <View
            className="flex-row items-center justify-between pb-3 border-b"
            style={{ borderColor: palette.borderSubtle }}
          >
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="p-1"
            >
              <Ionicons name="close" size={24} color={palette.muted} />
            </TouchableOpacity>

            <Text
              className="text-lg font-bold"
              style={{ color: palette.text }}
            >
              Add Location
            </Text>

            {selectedLocation ? (
              <TouchableOpacity onPress={handleClearLocation}>
                <Text className="text-red-500 font-bold text-sm">Remove</Text>
              </TouchableOpacity>
            ) : (
              <View className="w-8" />
            )}
          </View>

          {/* Search Bar */}
          <View
            className="flex-row items-center rounded-2xl px-3.5 py-2.5 my-3.5 border"
            style={{
              backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
              borderColor: palette.border,
            }}
          >
            <Ionicons name="search-outline" size={18} color={palette.muted} />
            <TextInput
              placeholder="Search city, neighborhood, or place..."
              placeholderTextColor={palette.placeholder}
              value={search}
              onChangeText={handleSearchChange}
              className="flex-1 ml-2.5 text-sm"
              style={{ color: palette.text }}
              autoCorrect={false}
            />
            {searching ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : search.length > 0 ? (
              <TouchableOpacity
                onPress={() => handleSearchChange("")}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={18} color={palette.muted} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Current Real-Time GPS Location Row */}
          {!search && (
            <View className="mb-3">
              <Text
                className="text-xs font-bold uppercase tracking-wider mb-2 px-1"
                style={{ color: palette.muted }}
              >
                Real-Time Location
              </Text>

              {loadingCurrent ? (
                <View
                  className="flex-row items-center gap-3 p-3.5 rounded-2xl border"
                  style={{
                    backgroundColor: isDark
                      ? colors.blue[950] + "40"
                      : colors.blue[50] + "80",
                    borderColor: isDark
                      ? colors.blue[900] + "60"
                      : colors.blue[100],
                  }}
                >
                  <ActivityIndicator size="small" color={palette.primary} />
                  <Text
                    className="text-sm font-medium"
                    style={{
                      color: isDark ? colors.blue[300] : colors.blue[900],
                    }}
                  >
                    Detecting current GPS location...
                  </Text>
                </View>
              ) : currentLocation ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handlePickLocation(currentLocation.name)}
                  className="flex-row items-center justify-between p-3.5 rounded-2xl border"
                  style={{
                    backgroundColor: isDark
                      ? colors.emerald[950] + "50"
                      : colors.emerald[50],
                    borderColor: isDark
                      ? colors.emerald[900] + "70"
                      : colors.emerald[200],
                  }}
                >
                  <View className="flex-row items-center gap-3 flex-1 mr-2">
                    <View className="w-9 h-9 rounded-xl bg-emerald-600 items-center justify-center shadow-sm">
                      <Ionicons name="navigate" size={18} color="white" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text
                          className="text-sm font-bold"
                          style={{
                            color: isDark ? colors.emerald[200] : colors.emerald[900],
                          }}
                          numberOfLines={1}
                        >
                          {currentLocation.name}
                        </Text>
                      </View>
                      <Text
                        className="text-xs mt-0.5"
                        style={{
                          color: isDark ? colors.emerald[400] : colors.emerald[700],
                        }}
                        numberOfLines={1}
                      >
                        {currentLocation.subtitle} • Current Device Location
                      </Text>
                    </View>
                  </View>

                  <View
                    className="px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: isDark
                        ? colors.emerald[900] + "60"
                        : colors.emerald[600] + "20",
                    }}
                  >
                    <Text
                      className="text-[10px] font-bold"
                      style={{
                        color: isDark ? colors.emerald[300] : colors.emerald[800],
                      }}
                    >
                      LIVE
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : permissionDenied ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleFetchCurrentLocation}
                  className="flex-row items-center justify-between p-3.5 rounded-2xl border"
                  style={{
                    backgroundColor: isDark ? colors.slate[800] : colors.slate[50],
                    borderColor: palette.border,
                  }}
                >
                  <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                    <Ionicons name="location-outline" size={20} color={palette.muted} />
                    <View className="flex-1">
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: palette.text }}
                      >
                        Enable location permission
                      </Text>
                      <Text className="text-[10px]" style={{ color: palette.muted }}>
                        Tap to allow access to local real-time places
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs font-bold" style={{ color: palette.primary }}>
                    Allow
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {/* Custom Typed Location Option */}
          {search.trim().length > 0 && (
            <TouchableOpacity
              onPress={() => handlePickLocation(search.trim())}
              className="flex-row items-center gap-3 p-3.5 rounded-2xl mb-3 border"
              style={{
                backgroundColor: isDark
                  ? colors.blue[950] + "50"
                  : colors.blue[50],
                borderColor: isDark
                  ? colors.blue[900] + "70"
                  : colors.blue[200],
              }}
            >
              <View
                className="w-8 h-8 rounded-full items-center justify-center"
                style={{ backgroundColor: palette.primary }}
              >
                <Ionicons name="add" size={18} color="white" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-sm font-bold"
                  style={{
                    color: isDark ? colors.blue[200] : colors.blue[900],
                  }}
                >
                  {`Use "${search.trim()}"`}
                </Text>
                <Text
                  className="text-xs"
                  style={{
                    color: isDark ? colors.blue[400] : colors.blue[600],
                  }}
                >
                  Tag custom location
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Search Results / Live Places List */}
          {search.trim().length > 0 && searchResults.length === 0 && !searching ? (
            <View className="py-8 items-center justify-center">
              <Ionicons
                name="location-outline"
                size={36}
                color={colors.slate[400]}
              />
              <Text
                className="text-sm font-semibold mt-2"
                style={{ color: palette.text }}
              >
                {`No places found for "${search.trim()}"`}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: palette.muted }}>
                {'You can still tap "Use" above to tag this custom name.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selectedLocation === item.name;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handlePickLocation(item.name)}
                    className="flex-row items-center justify-between py-3.5 border-b"
                    style={{ borderColor: palette.borderSubtle }}
                  >
                    <View className="flex-row items-center gap-3 flex-1 mr-3">
                      <View
                        className="w-10 h-10 rounded-2xl items-center justify-center border"
                        style={{
                          backgroundColor: isDark
                            ? colors.slate[800]
                            : colors.slate[100],
                          borderColor: palette.border,
                        }}
                      >
                        <Ionicons
                          name="location-sharp"
                          size={18}
                          color={palette.muted}
                        />
                      </View>

                      <View className="flex-1">
                        <Text
                          className="text-sm font-bold"
                          style={{ color: palette.text }}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text
                          className="text-xs mt-0.5"
                          style={{ color: palette.muted }}
                          numberOfLines={1}
                        >
                          {item.subtitle}
                        </Text>
                      </View>
                    </View>

                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={palette.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
