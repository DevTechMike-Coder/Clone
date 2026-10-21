import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as Haptics from "expo-haptics";
import { MusicTrackItem } from "@/store/pendingPost";
import { musicService } from "@/services/musicService";
import { stopAllSounds } from "@/lib/useTrackSound";
import { useTheme } from "@/context/ThemeContext";
import { colors } from "@/constants/theme";

const GENRES = [
  { id: "all", label: "All" },
  { id: "trending", label: "🔥 Trending" },
  { id: "electronic", label: "Electronic" },
  { id: "synthwave", label: "Synthwave" },
  { id: "tropical", label: "Tropical" },
  { id: "funk", label: "Funk" },
  { id: "acoustic", label: "Acoustic" },
  { id: "lofi", label: "Lo-Fi" },
  { id: "afro", label: "Afrobeat" },
  { id: "hiphop", label: "Hip-Hop" },
];

type MusicPickerModalProps = {
  visible: boolean;
  selectedTrack?: MusicTrackItem | null;
  onClose: () => void;
  onSelectTrack: (track: MusicTrackItem | null) => void;
};

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MusicPickerModal({
  visible,
  selectedTrack,
  onClose,
  onSelectTrack,
}: MusicPickerModalProps) {
  const { palette } = useTheme();
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [tracks, setTracks] = useState<MusicTrackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
    }).catch((error) => console.warn("Set audio mode failed:", error));
  }, []);

  useEffect(() => {
    if (!visible) {
      player.pause();
      player.seekTo(0);
      return;
    }

    let cancelled = false;
    musicService
      .getMusicTracks()
      .then((data) => {
        if (!cancelled) setTracks(data);
      })
      .catch((error) => console.error("Failed to load music catalog:", error))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const filteredTracks = useMemo(() => {
    let result = tracks;

    if (selectedGenre === "trending") {
      result = result.filter((t) => t.isTrending || (t.usageCount ?? 0) > 0);
    } else if (selectedGenre !== "all") {
      result = result.filter(
        (t) => t.genre?.toLowerCase() === selectedGenre.toLowerCase()
      );
    }

    const q = search.trim().toLowerCase();
    if (!q) return result;

    return result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        t.genre?.toLowerCase().includes(q)
    );
  }, [tracks, selectedGenre, search]);

  const togglePreview = (track: MusicTrackItem) => {
    stopAllSounds();

    if (!track.audioUrl) {
      setPlayingId(null);
      return;
    }

    if (playingId === track.id) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      player.pause();
      player.seekTo(0);
      setPlayingId(null);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    player.replace(track.audioUrl);
    // eslint-disable-next-line react-hooks/immutability -- false positive for native player mutations
    player.loop = false;
    player.volume = 1;
    player.play();
    setPlayingId(track.id);
  };

  const changeVolume = (delta: number) => {
    Haptics.selectionAsync();
    const next = Math.min(1, Math.max(0, (player.volume || 1) + delta));
    // eslint-disable-next-line react-hooks/immutability -- false positive for native player mutations
    player.volume = next;
  };

  const close = () => {
    player.pause();
    player.seekTo(0);
    setPlayingId(null);
    setSearch("");
    setSelectedGenre("all");
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={close}
      statusBarTranslucent
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "flex-end",
        }}
        onPress={close}
      >
        <Pressable
          style={{
            backgroundColor: palette.surface,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            maxHeight: "85%",
            padding: 20,
            borderTopWidth: 1,
            borderColor: palette.border,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Sheet Handle */}
          <View style={{ alignItems: "center", marginBottom: 12 }}>
            <View
              style={{
                width: 48,
                height: 5,
                borderRadius: 3,
                backgroundColor: palette.border,
              }}
            />
          </View>

          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: palette.accent + "1A",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="musical-notes" size={20} color={palette.accent} />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "700",
                  color: palette.text,
                }}
              >
                Sounds & Music
              </Text>
            </View>

            {selectedTrack && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  onSelectTrack(null);
                  close();
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: palette.danger + "20",
                  borderWidth: 1,
                  borderColor: palette.danger + "40",
                }}
              >
                <Text style={{ color: palette.danger, fontSize: 12, fontWeight: "700" }}>
                  Remove
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: palette.surfaceMuted,
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 10,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <Ionicons name="search-outline" size={18} color={palette.muted} />
            <TextInput
              placeholder="Search songs, artists, or genres..."
              placeholderTextColor={palette.placeholder}
              value={search}
              onChangeText={setSearch}
              style={{
                flex: 1,
                marginLeft: 10,
                color: palette.text,
                fontSize: 14,
                padding: 0,
              }}
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch("")}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Ionicons name="close-circle" size={18} color={palette.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Genre & Trending Filter Tabs */}
          <View style={{ marginBottom: 12 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {GENRES.map((g) => {
                const active = selectedGenre === g.id;
                return (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedGenre(g.id);
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      borderRadius: 20,
                      backgroundColor: active
                        ? palette.primary
                        : palette.surfaceMuted,
                      borderWidth: 1,
                      borderColor: active
                        ? palette.primary
                        : palette.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: active ? colors.white : palette.muted,
                      }}
                    >
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Volume Control Bar */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
              backgroundColor: palette.surfaceMuted,
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <TouchableOpacity
              onPress={() => changeVolume(-0.25)}
              accessibilityRole="button"
              accessibilityLabel="Decrease volume"
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: palette.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="remove" size={14} color={palette.text} />
            </TouchableOpacity>
            <Ionicons name="volume-medium" size={16} color={palette.muted} />
            <View
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                backgroundColor: palette.border,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: "100%",
                  backgroundColor: palette.primary,
                  borderRadius: 3,
                  width: `${Math.round((player.volume || 1) * 100)}%`,
                }}
              />
            </View>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: palette.text,
                width: 36,
                textAlign: "right",
              }}
            >
              {Math.round((player.volume || 1) * 100)}%
            </Text>
            <TouchableOpacity
              onPress={() => changeVolume(0.25)}
              accessibilityRole="button"
              accessibilityLabel="Increase volume"
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: palette.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="add" size={14} color={palette.text} />
            </TouchableOpacity>
          </View>

          {/* Now Playing Strip */}
          {playingId ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
                backgroundColor: palette.accent + "1A",
                borderWidth: 1,
                borderColor: palette.accent + "40",
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, marginRight: 8 }}>
                {status.isBuffering && !status.playing ? (
                  <ActivityIndicator size="small" color={palette.accent} />
                ) : (
                  <Ionicons name="musical-notes" size={16} color={palette.accent} />
                )}
                <Text
                  style={{ color: palette.text, fontSize: 12, fontWeight: "700", flex: 1 }}
                  numberOfLines={1}
                >
                  {tracks.find((t) => t.id === playingId)?.title || "Playing sound..."}
                </Text>
              </View>
              <Text style={{ fontSize: 11, fontFamily: "monospace", color: palette.accent, fontWeight: "700" }}>
                {Math.floor(status.currentTime || 0)}s
              </Text>
            </View>
          ) : null}

          {/* Tracks List */}
          {loading ? (
            <View style={{ height: 300, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color={palette.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredTracks}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              ListEmptyComponent={
                <View style={{ paddingVertical: 48, alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <Ionicons name="musical-notes-outline" size={40} color={palette.muted} />
                  <Text style={{ textAlign: "center", color: palette.muted, fontSize: 14 }}>
                    No sounds found in this category.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = selectedTrack?.id === item.id;
                const isPlaying = playingId === item.id;
                const isBuffering = isPlaying && status.isBuffering && !status.playing;

                return (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: palette.borderSubtle,
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => togglePreview(item)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 14,
                        flex: 1,
                        marginRight: 12,
                      }}
                    >
                      {/* Thumbnail or Play Icon */}
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          backgroundColor: palette.surfaceMuted,
                          overflow: "hidden",
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: palette.border,
                          position: "relative",
                        }}
                      >
                        {item.coverUrl ? (
                          <Image
                            source={{ uri: item.coverUrl }}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="cover"
                          />
                        ) : null}

                        <View
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(0,0,0,0.4)",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {isBuffering ? (
                            <ActivityIndicator size="small" color={colors.white} />
                          ) : (
                            <Ionicons
                              name={isPlaying ? "pause" : "play"}
                              size={20}
                              color={colors.white}
                            />
                          )}
                        </View>
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 14,
                            fontWeight: "700",
                            color: isSelected ? palette.accent : palette.text,
                          }}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={{ fontSize: 12, color: palette.muted, marginTop: 2 }}
                          numberOfLines={1}
                        >
                          {item.artist}
                          {item.durationSeconds ? ` • ${formatDuration(item.durationSeconds)}` : ""}
                        </Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 4 }}>
                          {item.isTrending && (
                            <Text style={{ fontSize: 10, color: palette.warning, fontWeight: "700" }}>
                              TRENDING
                            </Text>
                          )}
                          {item.genre && (
                            <Text
                              style={{
                                fontSize: 10,
                                color: palette.muted,
                                textTransform: "uppercase",
                                fontWeight: "600",
                              }}
                            >
                              {item.genre}
                            </Text>
                          )}
                          {!!item.usageCount && (
                            <Text style={{ fontSize: 10, color: palette.muted }}>
                              {item.usageCount} {item.usageCount === 1 ? "post" : "posts"}
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Use / Select Button */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        onSelectTrack(item);
                        close();
                      }}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 6,
                        borderRadius: 20,
                        backgroundColor: isSelected
                          ? palette.primary
                          : palette.surfaceMuted,
                        borderWidth: 1,
                        borderColor: isSelected
                          ? palette.primary
                          : palette.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: isSelected ? colors.white : palette.text,
                        }}
                      >
                        {isSelected ? "Selected" : "Use"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
