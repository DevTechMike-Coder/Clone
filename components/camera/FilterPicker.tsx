import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { colors } from "@/constants/theme";
import { PressableScale, Text } from "@/components/ui";

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
  const handleSelect = (id: string) => {
    Haptics.selectionAsync();
    onSelectFilter(id);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CAMERA_FILTERS.map((filter) => {
          const active = selectedFilter === filter.id;
          return (
            <PressableScale
              key={filter.id}
              onPress={() => handleSelect(filter.id)}
              style={styles.filterItem}
              accessibilityRole="button"
              accessibilityLabel={`${filter.name} filter`}
            >
              <View
                style={[
                  styles.previewBox,
                  active ? styles.previewActive : styles.previewInactive,
                ]}
              >
                {filter.overlayColor && (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      { backgroundColor: filter.overlayColor },
                    ]}
                  />
                )}
                <Text
                  variant="micro"
                  weight="bold"
                  style={styles.labelPreview}
                >
                  {filter.name.slice(0, 3).toUpperCase()}
                </Text>
              </View>
              <Text
                variant="micro"
                weight={active ? "bold" : "medium"}
                style={active ? styles.textActive : styles.textInactive}
              >
                {filter.name}
              </Text>
            </PressableScale>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filterItem: {
    alignItems: "center",
    gap: 6,
  },
  previewBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  previewActive: {
    borderColor: colors.white,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  previewInactive: {
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  labelPreview: {
    color: colors.white,
    letterSpacing: 0.5,
  },
  textActive: {
    color: colors.white,
  },
  textInactive: {
    color: "rgba(255, 255, 255, 0.65)",
  },
});
