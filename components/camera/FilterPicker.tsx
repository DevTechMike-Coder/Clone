import React from "react";
import { ScrollView, Text, TouchableOpacity, View, StyleProp, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Camera filter model.
 *
 * Each filter is a color tint (rgb + baseOpacity at full intensity) and an
 * optional vignette strength (0..1, edge darkening). The intensity slider in
 * the composer scales both. Nothing is baked into pixels — the overlay is
 * rendered over previews/stories/posts at view time, and `filter_id` +
 * `filter_intensity` persist with the post/story so it looks the same for
 * every viewer.
 */
export type FilterOption = {
  id: string;
  name: string;
  /** Tint channel values (when present the filter recolors the scene). */
  rgb?: [number, number, number];
  /** Tint alpha when intensity = 1. */
  baseOpacity?: number;
  /** Edge darkening when intensity = 1 (0 = none). */
  vignette?: number;
};

export const FILTER_MIN_INTENSITY = 0.2;

export const CAMERA_FILTERS: FilterOption[] = [
  { id: "none", name: "Normal" },
  { id: "golden", name: "Golden", rgb: [245, 158, 11], baseOpacity: 0.24 },
  { id: "vintage", name: "Vintage", rgb: [180, 83, 9], baseOpacity: 0.22, vignette: 0.25 },
  { id: "mono", name: "Mono", rgb: [0, 0, 0], baseOpacity: 0.38 },
  { id: "noir", name: "Noir", rgb: [0, 0, 0], baseOpacity: 0.55, vignette: 0.35 },
  { id: "cyberpunk", name: "Cyber", rgb: [236, 72, 153], baseOpacity: 0.22 },
  { id: "sunset", name: "Sunset", rgb: [244, 63, 94], baseOpacity: 0.24, vignette: 0.15 },
  { id: "emerald", name: "Emerald", rgb: [16, 185, 129], baseOpacity: 0.2 },
  { id: "cool", name: "Cool", rgb: [59, 130, 246], baseOpacity: 0.22 },
  { id: "fade", name: "Fade", rgb: [255, 255, 255], baseOpacity: 0.18 },
];

export const getFilterById = (id?: string | null): FilterOption | undefined =>
  CAMERA_FILTERS.find((f) => f.id === id && f.rgb != null);

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

/** Tint color string for a filter at the given intensity (0.2–1). */
export function resolveTintColor(
  filter: FilterOption | undefined,
  intensity = 1
): string | null {
  if (!filter?.rgb || !filter.baseOpacity) return null;
  const k = clamp(intensity, FILTER_MIN_INTENSITY, 1);
  const [r, g, b] = filter.rgb;
  return `rgba(${r}, ${g}, ${b}, ${(filter.baseOpacity * k).toFixed(3)})`;
}

/**
 * Renders a filter (tint + vignette) over any media. Vignette is the classic
 * 4-edge linear-gradient approximation (RN has no radial gradients).
 */
export function FilterOverlay({
  filterId,
  intensity = 1,
  style,
}: {
  filterId?: string | null;
  intensity?: number | null;
  style?: StyleProp<ViewStyle>;
}) {
  const filter = getFilterById(filterId);
  const tint = resolveTintColor(filter, intensity ?? undefined);
  if (!filter || !tint) return null;

  const k = clamp(intensity ?? 1, FILTER_MIN_INTENSITY, 1);
  const vignette = (filter.vignette ?? 0) * k;
  const edgeDark = `rgba(0, 0, 0, ${(vignette * 0.85).toFixed(3)})`;
  const transparent = "rgba(0, 0, 0, 0)";
  const EDGE = "28%";

  return (
    <View pointerEvents="none" style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, style]}>
      <View style={{ flex: 1, backgroundColor: tint }} />
      {vignette > 0 && (
        <>
          <LinearGradient
            colors={[edgeDark, transparent]}
            style={{ position: "absolute", top: 0, left: 0, right: 0, height: EDGE }}
          />
          <LinearGradient
            colors={[transparent, edgeDark]}
            style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: EDGE }}
          />
          <LinearGradient
            colors={[edgeDark, transparent]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: EDGE }}
          />
          <LinearGradient
            colors={[transparent, edgeDark]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: EDGE }}
          />
        </>
      )}
    </View>
  );
}

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
          const thumbTint = resolveTintColor(filter);
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
                {thumbTint && (
                  <View
                    className="absolute inset-0"
                    style={{ backgroundColor: thumbTint }}
                  />
                )}
                {active && <View className="absolute inset-0 bg-white/20" />}
                <Text className="text-white text-[11px] font-bold">
                  {filter.name.slice(0, 3).toUpperCase()}
                </Text>
              </View>
              <Text
                className={`text-[10px] ${
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
