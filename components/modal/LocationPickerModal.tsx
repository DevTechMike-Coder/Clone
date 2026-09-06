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
        try {
          const loc = await locationService.getCurrentLocation();
          if (isMounted) {
            if (loc) {
              setCurrentLocation(loc);
              setPermissionDenied(false);
            } else {
              setPermissionDenied(true);
            }
          }
        } catch {
          if (isMounted) {
            setPermissionDenied(true);
          }
        }
      })();
    }
    return () => {
      isMounted = false;
    };
  }, [visible]);

  // Handle live search
  const handleSearchChange = (text: string) => {
    setSearch(text);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const trimmed = text.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceTimer.current = setTimeout(async () => {
      const coords = currentLocation
        ? { latitude: currentLocation.latitude!, longitude: currentLocation.longitude! }
        : null;

      const results = await locationService.searchLocations(trimmed, coords);
      setSearchResults(results);
      setSearching(false);
    }, 350);
  };

  const handlePickLocation = (locName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        className="flex-1 bg-black/60 justify-end"
      >
        <View className="bg-white rounded-t-[32px] max-h-[85%] flex-1 pt-4 pb-8 px-5 border-t border-slate-100 shadow-2xl">
          {/* Sheet Handle */}
          <View className="items-center mb-3">
            <View className="w-12 h-1.5 rounded-full bg-slate-300" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="p-1"
            >
              <Ionicons name="close" size={24} color={colors.slate[500]} />
            </TouchableOpacity>

            <Text className="text-lg font-bold text-slate-900">Add Location</Text>

            {selectedLocation ? (
              <TouchableOpacity onPress={handleClearLocation}>
                <Text className="text-red-500 font-bold text-sm">Remove</Text>
              </TouchableOpacity>
            ) : (
              <View className="w-8" />
            )}
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center bg-slate-100 rounded-2xl px-3.5 py-2.5 my-3.5">
            <Ionicons name="search-outline" size={18} color={colors.slate[400]} />
            <TextInput
              placeholder="Search city, neighborhood, or place..."
              placeholderTextColor={colors.slate[400]}
              value={search}
              onChangeText={handleSearchChange}
              className="flex-1 ml-2.5 text-sm text-slate-900"
              autoCorrect={false}
            />
            {searching ? (
              <ActivityIndicator size="small" color={colors.blue[600]} />
            ) : search.length > 0 ? (
              <TouchableOpacity
                onPress={() => handleSearchChange("")}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={18} color={colors.slate[400]} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Current Real-Time GPS Location Row */}
          {!search && (
            <View className="mb-3">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                Real-Time Location
              </Text>

              {loadingCurrent ? (
                <View className="flex-row items-center gap-3 p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100">
                  <ActivityIndicator size="small" color={colors.blue[600]} />
                  <Text className="text-sm font-medium text-blue-900">
                    Detecting current GPS location...
                  </Text>
                </View>
              ) : currentLocation ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handlePickLocation(currentLocation.name)}
                  className="flex-row items-center justify-between p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl"
                >
                  <View className="flex-row items-center gap-3 flex-1 mr-2">
                    <View className="w-9 h-9 rounded-xl bg-emerald-600 items-center justify-center shadow-sm">
                      <Ionicons name="navigate" size={18} color="white" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text
                          className="text-sm font-bold text-emerald-950"
                          numberOfLines={1}
                        >
                          {currentLocation.name}
                        </Text>
                      </View>
                      <Text
                        className="text-xs text-emerald-700 mt-0.5"
                        numberOfLines={1}
                      >
                        {currentLocation.subtitle} • Current Device Location
                      </Text>
                    </View>
                  </View>

                  <View className="bg-emerald-600/10 px-2 py-1 rounded-full">
                    <Text className="text-[10px] font-bold text-emerald-800">
                      LIVE
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : permissionDenied ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleFetchCurrentLocation}
                  className="flex-row items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl"
                >
                  <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                    <Ionicons name="location-outline" size={20} color={colors.slate[500]} />
                    <View className="flex-1">
                      <Text className="text-xs font-semibold text-slate-700">
                        Enable location permission
                      </Text>
                      <Text className="text-[10px] text-slate-400">
                        Tap to allow access to local real-time places
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs font-bold text-blue-600">Allow</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {/* Custom Typed Location Option */}
          {search.trim().length > 0 && (
            <TouchableOpacity
              onPress={() => handlePickLocation(search.trim())}
              className="flex-row items-center gap-3 p-3.5 bg-blue-50 border border-blue-200 rounded-2xl mb-3"
            >
              <View className="w-8 h-8 rounded-full bg-blue-600 items-center justify-center">
                <Ionicons name="add" size={18} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-blue-900">
                  {`Use "${search.trim()}"`}
                </Text>
                <Text className="text-xs text-blue-600">
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
                color={colors.slate[300]}
              />
              <Text className="text-sm font-semibold text-slate-600 mt-2">
                {`No places found for "${search.trim()}"`}
              </Text>
              <Text className="text-xs text-slate-400 mt-0.5">
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
                    className="flex-row items-center justify-between py-3.5 border-b border-slate-100"
                  >
                    <View className="flex-row items-center gap-3 flex-1 mr-3">
                      <View className="w-10 h-10 rounded-2xl bg-slate-100 items-center justify-center border border-slate-200">
                        <Ionicons
                          name="location-sharp"
                          size={18}
                          color={colors.slate[700]}
                        />
                      </View>

                      <View className="flex-1">
                        <Text
                          className="text-sm font-bold text-slate-900"
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text
                          className="text-xs text-slate-500 mt-0.5"
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
                        color={colors.blue[600]}
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
