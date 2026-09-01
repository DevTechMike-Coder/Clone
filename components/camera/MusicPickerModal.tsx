import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { MusicTrackItem } from "@/store/pendingPost";
import { musicService } from "@/services/musicService";
import { stopAllSounds } from "@/lib/useTrackSound";

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
      // No `player.pause()` here. `useAudioPlayer` releases the native player
      // when the modal unmounts, and that release is registered inside the hook
      // — so React runs it *before* this cleanup, and pausing threw
      // "Cannot use shared object that was already released". Stopping the
      // preview is already handled by the `!visible` branch above, which runs
      // whenever the modal is hidden.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const filteredTracks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tracks;

    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q),
    );
  }, [tracks, search]);

  const togglePreview = (track: MusicTrackItem) => {
    // A preview started here has to silence any post sound that is playing
    // underneath (the feed is still mounted behind the camera sheet).
    stopAllSounds();

    if (!track.audioUrl) {
      setPlayingId(null);
      return;
    }

    if (playingId === track.id) {
      player.pause();
      player.seekTo(0);
      setPlayingId(null);
      return;
    }

    player.replace(track.audioUrl);
    // eslint-disable-next-line react-hooks/immutability -- false positive for native player mutations
    player.loop = false;
    player.volume = 1;
    player.play();
    setPlayingId(track.id);
  };

  const changeVolume = (delta: number) => {
    const next = Math.min(1, Math.max(0, (player.volume || 1) + delta));
    // eslint-disable-next-line react-hooks/immutability -- false positive for native player mutations
    player.volume = next;
  };

  const close = () => {
    player.pause();
    player.seekTo(0);
    setPlayingId(null);
    setSearch("");
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={close}>
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={close}>
        <Pressable
          className="bg-slate-900 rounded-t-[32px] max-h-[82%] p-6 border-t border-slate-800"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Sheet Handle */}
          <View className="items-center mb-4">
            <View className="w-12 h-1.5 rounded-full bg-slate-700" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="musical-notes" size={22} color="#3B82F6" />
              <Text className="text-xl font-bold text-white">Add Sound</Text>
            </View>
            {selectedTrack && (
              <TouchableOpacity
                onPress={() => {
                  onSelectTrack(null);
                  close();
                }}
                className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30"
              >
                <Text className="text-red-400 text-xs font-bold">Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center bg-slate-800 rounded-2xl px-4 py-2.5 mb-3 border border-slate-700">
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              placeholder="Search sounds or artists..."
              placeholderTextColor="#64748B"
              value={search}
              onChangeText={setSearch}
              className="flex-1 ml-3 text-white text-sm"
            />
          </View>

          {/* Volume Control */}
          <View className="flex-row items-center gap-3 mb-3 bg-slate-800/60 rounded-2xl px-3 py-2 border border-slate-700">
            <TouchableOpacity
              onPress={() => changeVolume(-0.25)}
              className="w-8 h-8 rounded-full bg-slate-700 items-center justify-center"
            >
              <Ionicons name="remove" size={16} color="white" />
            </TouchableOpacity>
            <Ionicons name="volume-medium" size={18} color="#94A3B8" />
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
              className="w-8 h-8 rounded-full bg-slate-700 items-center justify-center"
            >
              <Ionicons name="add" size={16} color="white" />
            </TouchableOpacity>
          </View>

          {/* Now Playing Strip */}
          {playingId ? (
            <View className="flex-row items-center justify-between mb-2 bg-blue-600/20 border border-blue-500/30 rounded-2xl px-3 py-2">
              <View className="flex-row items-center gap-2 flex-1">
                {status.isBuffering && !status.playing ? (
                  <ActivityIndicator size="small" color="#60A5FA" />
                ) : (
                  <Ionicons name="musical-notes" size={16} color="#60A5FA" />
                )}
                <Text className="text-white text-xs font-bold flex-1" numberOfLines={1}>
                  {tracks.find((t) => t.id === playingId)?.title || "Loading sound..."}
                </Text>
              </View>
              <Text className="text-[10px] font-mono text-blue-200">
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
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                <Text className="text-center text-slate-400 text-sm py-10">
                  No sounds found.
                </Text>
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
                      disabled={!item.audioUrl}
                      className="flex-row items-center gap-3.5 flex-1"
                    >
                      <View
                        className={`w-11 h-11 rounded-xl items-center justify-center ${
                          isPlaying ? "bg-blue-600" : "bg-slate-800"
                        }`}
                      >
                        {isBuffering ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Ionicons
                            name={isPlaying ? "pause" : "play"}
                            size={18}
                            color={item.audioUrl ? "white" : "#475569"}
                          />
                        )}
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
                        <Text className="text-xs text-slate-400 mt-0.5">
                          {item.artist}
                          {item.durationSeconds ? ` • ${formatDuration(item.durationSeconds)}` : ""}
                        </Text>
                        <View className="flex-row flex-wrap items-center gap-x-2 mt-0.5">
                          {item.isTrending && (
                            <Text className="text-[10px] text-amber-400 font-bold">
                              TRENDING
                            </Text>
                          )}
                          {!!item.usageCount && (
                            <Text className="text-[10px] text-slate-500">
                              {item.usageCount} {item.usageCount === 1 ? "post" : "posts"}
                            </Text>
                          )}
                          {!!item.license && (
                            <Text className="text-[9px] font-bold text-emerald-400/90 border border-emerald-500/30 rounded-full px-1.5 py-px">
                              {item.license}
                            </Text>
                          )}
                        </View>
                        {!!item.attribution && (
                          <Text className="text-[9px] text-slate-500 mt-0.5" numberOfLines={1}>
                            {item.attribution}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
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
