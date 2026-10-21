import { useEffect } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTrackSound } from "@/lib/useTrackSound";
import { colors } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";

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
  if (count < 1000) return `${count} ${count === 1 ? "use" : "uses"}`;
  return `${(count / 1000).toFixed(count < 10000 ? 1 : 0)}k uses`;
};

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
  const { palette } = useTheme();
  const overlay = variant === "overlay";
  const { canPlay, isPlaying, isBuffering, toggle, stop } = useTrackSound({
    trackKey,
    audioUrl,
  });

  useEffect(() => {
    if (!active && isPlaying) stop();
  }, [active, isPlaying, stop]);

  const label = title || "Original Sound";
  const subLabel = [artist, formatPlays(usageCount)].filter(Boolean).join(" • ");

  if (!canPlay) {
    return (
      <View
        pointerEvents="none"
        style={
          overlay
            ? {
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(0,0,0,0.55)",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.15)",
              }
            : {
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: palette.surfaceMuted,
                borderWidth: 1,
                borderColor: palette.border,
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 6,
                alignSelf: "flex-start",
              }
        }
      >
        <Ionicons
          name="musical-notes"
          size={overlay ? 13 : 14}
          color={overlay ? colors.sky[400] : palette.accent}
        />
        <Text
          style={
            overlay
              ? { color: colors.white, fontSize: 11, fontWeight: "700" }
              : { fontSize: 12, fontWeight: "700", color: palette.text }
          }
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
        style={
          overlay
            ? {
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(0,0,0,0.55)",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.15)",
                alignSelf: "flex-start",
                maxWidth: "85%",
              }
            : {
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: palette.surfaceMuted,
                borderWidth: 1,
                borderColor: palette.border,
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 6,
                alignSelf: "flex-start",
                maxWidth: "100%",
              }
        }
      >
        {isBuffering ? (
          <ActivityIndicator size="small" color={overlay ? colors.sky[400] : palette.accent} />
        ) : (
          <Ionicons
            name={isPlaying ? "pause" : "musical-notes"}
            size={overlay ? 13 : 14}
            color={overlay ? colors.sky[400] : palette.accent}
          />
        )}
        <Text
          style={
            overlay
              ? { color: colors.white, fontSize: 11, fontWeight: "700" }
              : { fontSize: 12, fontWeight: "700", color: palette.text }
          }
          numberOfLines={1}
        >
          {label}
          {subLabel ? ` • ${subLabel}` : ""}
        </Text>
        {!overlay && (
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              color: palette.accent,
            }}
          >
            {isPlaying ? "Playing" : "Play"}
          </Text>
        )}
      </TouchableOpacity>

      {!!attribution && (
        <View
          style={
            overlay
              ? {
                  marginTop: 4,
                  backgroundColor: "rgba(0,0,0,0.55)",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 10,
                  alignSelf: "flex-start",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.15)",
                }
              : { marginTop: 4, paddingHorizontal: 2 }
          }
        >
          <Text
            style={{
              fontSize: 10,
              color: overlay ? "rgba(255,255,255,0.85)" : palette.muted,
              fontWeight: overlay ? "600" : "400",
            }}
            numberOfLines={1}
          >
            {attribution}
          </Text>
        </View>
      )}
    </View>
  );
}
