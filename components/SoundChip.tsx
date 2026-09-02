import { useEffect } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTrackSound } from "@/lib/useTrackSound";
import { colors } from "@/constants/theme";

type SoundChipProps = {
  trackKey?: string | null;
  title?: string | null;
  artist?: string | null;
  audioUrl?: string | null;
  /** Licence credit that has to stay visible to the end user (CC-BY etc). */
  attribution?: string | null;
  usageCount?: number | null;
  /** False → the sound stops. Driven by feed viewability / screen focus. */
  active?: boolean;
  variant?: "overlay" | "card";
  className?: string;
};

const formatPlays = (count?: number | null) => {
  if (!count || count <= 0) return null;
  // Reads correctly after the " • " separator, which is all this sits in.
  if (count < 1000) return `${count} ${count === 1 ? "use" : "uses"}`;
  return `${(count / 1000).toFixed(count < 10000 ? 1 : 0)}k uses`;
};

/**
 * The sound pill on a post.
 *
 * Previously this was a static label: `postDetails.tsx` wrote the track onto the
 * row, and the feed and post screen printed "🎵 title - artist" and stopped
 * there. It is now the control that actually plays the track (and stops it),
 * while degrading to the old static label for a post whose audio cannot be
 * resolved -- an unplayable *button* is worse than no button.
 */
export default function SoundChip({
  trackKey,
  title,
  artist,
  audioUrl,
  attribution,
  usageCount,
  active = true,
  variant = "card",
  className = "",
}: SoundChipProps) {
  const overlay = variant === "overlay";
  const { canPlay, isPlaying, isBuffering, toggle, stop } = useTrackSound({
    trackKey,
    audioUrl,
  });

  // Scrolled out of view, or the screen blurred → silence. The bus already
  // guarantees only one track plays, but nobody claims the next post while a
  // half-visible row is still making noise.
  useEffect(() => {
    if (!active && isPlaying) stop();
  }, [active, isPlaying, stop]);

  const label = title || "Original Sound";
  const subLabel = [artist, formatPlays(usageCount)].filter(Boolean).join(" • ");

  if (!canPlay) {
    return (
      <View
        pointerEvents="none"
        className={`${
          overlay
            ? "flex-row items-center gap-1.5 bg-black/55 px-3 py-1.5 rounded-full border border-white/15"
            : "flex-row items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 self-start"
        } ${className}`}
      >
        <Ionicons
          name="musical-notes"
          size={overlay ? 13 : 14}
          color={overlay ? colors.sky[400] : colors.blue[600]}
        />
        <Text
          className={`${overlay ? "text-white text-[11px] font-bold" : "text-xs font-bold text-slate-700 dark:text-slate-200"}`}
          numberOfLines={1}
        >
          {label}
          {subLabel ? ` • ${subLabel}` : ""}
        </Text>
      </View>
    );
  }

  return (
    <View className={className}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? `Pause ${label}` : `Play ${label}`}
        className={
          overlay
            ? "flex-row items-center gap-1.5 bg-black/55 px-3 py-1.5 rounded-full border border-white/15 self-start max-w-[85%]"
            : "flex-row items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-full px-3 py-1.5 self-start max-w-full"
        }
      >
        {isBuffering ? (
          <ActivityIndicator size="small" color={overlay ? colors.sky[400] : colors.blue[600]} />
        ) : (
          <Ionicons
            name={isPlaying ? "pause" : "musical-notes"}
            size={overlay ? 13 : 14}
            color={overlay ? colors.sky[400] : colors.blue[600]}
          />
        )}
        <Text
          className={overlay ? "text-white text-[11px] font-bold" : "text-xs font-bold text-slate-700 dark:text-slate-200"}
          numberOfLines={1}
        >
          {label}
          {subLabel ? ` • ${subLabel}` : ""}
        </Text>
        {!overlay && (
          <Text className="text-[10px] font-bold uppercase tracking-wide text-blue-600">
            {isPlaying ? "Playing" : "Play"}
          </Text>
        )}
      </TouchableOpacity>

      {!!attribution && (
        <Text
          className={`text-[10px] mt-1 ${overlay ? "text-white/70" : "text-slate-400"} ${
            variant === "card" ? "px-0.5" : ""
          }`}
          numberOfLines={2}
        >
          {attribution}
        </Text>
      )}
    </View>
  );
}
