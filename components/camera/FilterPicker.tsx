import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export type FilterOption = {
  id: string;
  name: string;
  overlayColor?: string;
  blendMode?: string;
};

export const CAMERA_FILTERS: FilterOption[] = [
  { id: "none", name: "Normal" },
  { id: "golden", name: "Golden", overlayColor: "rgba(245, 158, 11, 0.24)" },
  { id: "vintage", name: "Vintage", overlayColor: "rgba(180, 83, 9, 0.22)" },
  { id: "mono", name: "Mono", overlayColor: "rgba(0, 0, 0, 0.38)" },
  { id: "cyberpunk", name: "Cyber", overlayColor: "rgba(236, 72, 153, 0.22)" },
  { id: "sunset", name: "Sunset", overlayColor: "rgba(244, 63, 94, 0.24)" },
  { id: "emerald", name: "Emerald", overlayColor: "rgba(16, 185, 129, 0.20)" },
  { id: "cool", name: "Cool", overlayColor: "rgba(59, 130, 246, 0.22)" },
];

type FilterPickerProps = {
  selectedFilter: string;
  onSelectFilter: (filterId: string) => void;
};

export default function FilterPicker({
  selectedFilter,
  onSelectFilter,
}: FilterPickerProps) {
  return (
    <View className="py-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
      >
        {CAMERA_FILTERS.map((filter) => {
          const active = selectedFilter === filter.id;
          return (
            <TouchableOpacity
              key={filter.id}
              activeOpacity={0.8}
              onPress={() => onSelectFilter(filter.id)}
              className="items-center gap-1.5"
            >
              <View
                className={`w-14 h-14 rounded-2xl overflow-hidden items-center justify-center border-2 ${
                  active ? "border-white bg-white/20" : "border-white/20 bg-black/40"
                }`}
              >
                {filter.overlayColor && (
                  <View
                    className="absolute inset-0"
                    style={{ backgroundColor: filter.overlayColor }}
                  />
                )}
                <Text className="text-white text-[11px] font-bold">
                  {filter.name.slice(0, 3).toUpperCase()}
                </Text>
              </View>
              <Text
                className={`text-[11px] font-medium ${
                  active ? "text-white font-bold" : "text-white/60"
                }`}
              >
                {filter.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
