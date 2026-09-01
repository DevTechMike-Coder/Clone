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
    <Modal transparent visible={visible} animationType="slide" onRequestClose={close}>
      <Pressable className="flex-1 bg-black/60 justify-end" onPress={close}>
        <Pressable
          className="bg-slate-900 rounded-t-[32px] max-h-[85%] p-5 border-t border-slate-800 shadow-2xl"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Sheet Handle */}
          <View className="items-center mb-3">
            <View className="w-12 h-1.5 rounded-full bg-slate-700" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2.5">
              <View className="w-9 h-9 rounded-full bg-blue-600/20 items-center justify-center border border-blue-500/30">
                <Ionicons name="musical-notes" size={20} color="#38BDF8" />
              </View>
              <Text className="text-xl font-bold text-white">Sounds & Music</Text>
            </View>

            {selectedTrack && (
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  onSelectTrack(null);
                  close();
                }}
                className="px-3.5 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 active:opacity-80"
              >
                <Text className="text-red-400 text-xs font-bold">Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center bg-slate-800 rounded-2xl px-3.5 py-2.5 mb-3 border border-slate-700">
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              placeholder="Search songs, artists, or genres..."
              placeholderTextColor="#64748B"
              value={search}
              onChangeText={setSearch}
              className="flex-1 ml-2.5 text-white text-sm"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Genre & Trending Filter Tabs */}
          <View className="mb-3">
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
                    className={`px-3.5 py-1.5 rounded-full border ${
                      active
                        ? "bg-blue-600 border-blue-500"
                        : "bg-slate-800 border-slate-700"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        active ? "text-white" : "text-slate-400"
                      }`}
                    >
                      {g.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Volume Control Bar */}
          <View className="flex-row items-center gap-3 mb-3 bg-slate-800/80 rounded-2xl px-3 py-2 border border-slate-700">
            <TouchableOpacity
              onPress={() => changeVolume(-0.25)}
              className="w-7 h-7 rounded-full bg-slate-700 items-center justify-center active:opacity-80"
            >
              <Ionicons name="remove" size={14} color="white" />
            </TouchableOpacity>
            <Ionicons name="volume-medium" size={16} color="#94A3B8" />
            <View className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <View
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${Math.round((player.volume || 1) * 100)}%` }}
              />
            </View>
            <Text className="text-xs font-bold text-slate-300 w-9 text-right">
              {Math.round((player.volume || 1) * 100)}%
            </Text>
            <TouchableOpacity
              onPress={() => changeVolume(0.25)}
              className="w-7 h-7 rounded-full bg-slate-700 items-center justify-center active:opacity-80"
            >
              <Ionicons name="add" size={14} color="white" />
            </TouchableOpacity>
          </View>

          {/* Now Playing Strip */}
          {playingId ? (
            <View className="flex-row items-center justify-between mb-2 bg-blue-600/20 border border-blue-500/40 rounded-2xl px-3.5 py-2">
              <View className="flex-row items-center gap-2 flex-1 mr-2">
                {status.isBuffering && !status.playing ? (
                  <ActivityIndicator size="small" color="#60A5FA" />
                ) : (
                  <Ionicons name="musical-notes" size={16} color="#60A5FA" />
                )}
                <Text className="text-white text-xs font-bold flex-1" numberOfLines={1}>
                  {tracks.find((t) => t.id === playingId)?.title || "Playing sound..."}
                </Text>
              </View>
              <Text className="text-[10px] font-mono text-blue-300 font-bold">
                {Math.floor(status.currentTime || 0)}s
              </Text>
            </View>
          ) : null}

          {/* Tracks List */}
          {loading ? (
            <View className="h-80 items-center justify-center">
              <ActivityIndicator size="large" color="#3B82F6" />
            </View>
          ) : (
            <FlatList
              data={filteredTracks}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              ListEmptyComponent={
                <View className="py-12 items-center justify-center gap-2">
                  <Ionicons name="musical-notes-outline" size={40} color="#475569" />
                  <Text className="text-center text-slate-400 text-sm">
                    No sounds found in this category.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = selectedTrack?.id === item.id;
                const isPlaying = playingId === item.id;
                const isBuffering = isPlaying && status.isBuffering && !status.playing;

                return (
                  <View className="flex-row items-center justify-between py-3 border-b border-slate-800/80">
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => togglePreview(item)}
                      className="flex-row items-center gap-3.5 flex-1 mr-3"
                    >
                      {/* Thumbnail or Play Icon */}
                      <View className="w-12 h-12 rounded-xl bg-slate-800 overflow-hidden items-center justify-center border border-slate-700 relative">
                        {item.coverUrl ? (
                          <Image
                            source={{ uri: item.coverUrl }}
                            className="w-full h-full"
                            contentFit="cover"
                          />
                        ) : null}

                        {/* Dark Tint overlay with Play/Pause button */}
                        <View className="absolute inset-0 bg-black/40 items-center justify-center">
                          {isBuffering ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <Ionicons
                              name={isPlaying ? "pause" : "play"}
                              size={20}
                              color="white"
                            />
                          )}
                        </View>
                      </View>

                      <View className="flex-1">
                        <Text
                          numberOfLines={1}
                          className={`text-sm font-bold leading-tight ${
                            isSelected ? "text-blue-400" : "text-white"
                          }`}
                        >
                          {item.title}
                        </Text>
                        <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={1}>
                          {item.artist}
                          {item.durationSeconds ? ` • ${formatDuration(item.durationSeconds)}` : ""}
                        </Text>
                        <View className="flex-row flex-wrap items-center gap-x-2 mt-1">
                          {item.isTrending && (
                            <Text className="text-[10px] text-amber-400 font-bold">
                              TRENDING
                            </Text>
                          )}
                          {item.genre && (
                            <Text className="text-[10px] text-slate-500 uppercase font-semibold">
                              {item.genre}
                            </Text>
                          )}
                          {!!item.usageCount && (
                            <Text className="text-[10px] text-slate-500">
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
                      className={`px-4 py-1.5 rounded-full ${
                        isSelected
                          ? "bg-blue-600"
                          : "bg-slate-800 border border-slate-700"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? "text-white" : "text-slate-300"
                        }`}
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
