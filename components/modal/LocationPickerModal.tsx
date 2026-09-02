import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { colors } from "@/constants/theme";

const POPULAR_LOCATIONS = [
  { id: "1", name: "Lagos, Nigeria", country: "Nigeria", type: "City" },
  { id: "2", name: "London, United Kingdom", country: "United Kingdom", type: "City" },
  { id: "3", name: "New York, NY", country: "United States", type: "City" },
  { id: "4", name: "Paris, France", country: "France", type: "City" },
  { id: "5", name: "Tokyo, Japan", country: "Japan", type: "City" },
  { id: "6", name: "Dubai, United Arab Emirates", country: "UAE", type: "City" },
  { id: "7", name: "Los Angeles, CA", country: "United States", type: "City" },
  { id: "8", name: "Toronto, ON", country: "Canada", type: "City" },
  { id: "9", name: "Bali, Indonesia", country: "Indonesia", type: "Island" },
  { id: "10", name: "Sydney, NSW", country: "Australia", type: "City" },
  { id: "11", name: "Berlin, Germany", country: "Germany", type: "City" },
  { id: "12", name: "Johannesburg, South Africa", country: "South Africa", type: "City" },
  { id: "13", name: "Nairobi, Kenya", country: "Kenya", type: "City" },
  { id: "14", name: "Miami Beach, FL", country: "United States", type: "Beach" },
  { id: "15", name: "Santorini, Greece", country: "Greece", type: "Island" },
];

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

  useEffect(() => {
    if (visible) {
      setSearch("");
    }
  }, [visible]);

  const filteredLocations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return POPULAR_LOCATIONS;

    return POPULAR_LOCATIONS.filter(
      (loc) =>
        loc.name.toLowerCase().includes(q) ||
        loc.country.toLowerCase().includes(q)
    );
  }, [search]);

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
        <View className="bg-white dark:bg-slate-900 rounded-t-[32px] max-h-[85%] flex-1 pt-4 pb-8 px-5 border-t border-slate-100 dark:border-slate-800 shadow-2xl">
          {/* Sheet Handle */}
          <View className="items-center mb-3">
            <View className="w-12 h-1.5 rounded-full bg-slate-300" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="p-1"
            >
              <Ionicons name="close" size={24} color={colors.slate[500]} />
            </TouchableOpacity>

            <Text className="text-lg font-bold text-slate-900 dark:text-slate-50">Add Location</Text>

            {selectedLocation ? (
              <TouchableOpacity onPress={handleClearLocation}>
                <Text className="text-red-500 font-bold text-sm">Remove</Text>
              </TouchableOpacity>
            ) : (
              <View className="w-8" />
            )}
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-3.5 py-2.5 my-3.5">
            <Ionicons name="location-outline" size={18} color={colors.slate[400]} />
            <TextInput
              placeholder="Search city, place or landmark..."
              placeholderTextColor={colors.slate[400]}
              value={search}
              onChangeText={setSearch}
              className="flex-1 ml-2.5 text-sm text-slate-900 dark:text-slate-50"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch("")}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={18} color={colors.slate[400]} />
              </TouchableOpacity>
            )}
          </View>

          {/* Custom Typed Location Option */}
          {search.trim().length > 0 && (
            <TouchableOpacity
              onPress={() => handlePickLocation(search.trim())}
              className="flex-row items-center gap-3 p-3.5 bg-blue-50 dark:bg-blue-950 border border-blue-200 rounded-2xl mb-3"
            >
              <View className="w-8 h-8 rounded-full bg-blue-600 items-center justify-center">
                <Ionicons name="add" size={18} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-blue-900">
                  Use "{search.trim()}"
                </Text>
                <Text className="text-xs text-blue-600">
                  Add as custom location tag
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Popular Locations List */}
          <FlatList
            data={filteredLocations}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = selectedLocation === item.name;
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handlePickLocation(item.name)}
                  className="flex-row items-center justify-between py-3.5 border-b border-slate-50"
                >
                  <View className="flex-row items-center gap-3 flex-1 mr-3">
                    <View className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700">
                      <Ionicons
                        name={item.type === "Beach" || item.type === "Island" ? "sunny-outline" : "business-outline"}
                        size={20}
                        color={colors.slate[600]}
                      />
                    </View>

                    <View className="flex-1">
                      <Text
                        className="text-sm font-bold text-slate-900 dark:text-slate-50"
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text className="text-xs text-slate-500 dark:text-slate-400">
                        {item.type} • {item.country}
                      </Text>
                    </View>
                  </View>

                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.blue[600]} />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
