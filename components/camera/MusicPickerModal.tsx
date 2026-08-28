import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MusicTrackItem } from "@/store/pendingPost";

export const TRENDING_SOUNDS: MusicTrackItem[] = [
  { id: "1", title: "Golden Glow (Original Mix)", artist: "Aurora Beats" },
  { id: "2", title: "Midnight City Lights", artist: "SynthWave Collective" },
  { id: "3", title: "Summer Breeze", artist: "Tropical Vibes" },
  { id: "4", title: "Future Funk Deluxe", artist: "Kairo & Friends" },
  { id: "5", title: "Acoustic Sunrise", artist: "Luna Woods" },
  { id: "6", title: "Cyber Odyssey", artist: "Neon Pulse" },
  { id: "7", title: "Lo-Fi Coffee Moments", artist: "ChillHop Dreamer" },
  { id: "8", title: "Drift Away", artist: "The Skyline" },
];

type MusicPickerModalProps = {
  visible: boolean;
  selectedTrack?: MusicTrackItem | null;
  onClose: () => void;
  onSelectTrack: (track: MusicTrackItem | null) => void;
};

export default function MusicPickerModal({
  visible,
  selectedTrack,
  onClose,
  onSelectTrack,
}: MusicPickerModalProps) {
  const [search, setSearch] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);

  const filteredTracks = TRENDING_SOUNDS.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.artist.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
        <Pressable
          className="bg-slate-900 rounded-t-[32px] max-h-[80%] p-6 border-t border-slate-800"
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
                  onClose();
                }}
                className="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30"
              >
                <Text className="text-red-400 text-xs font-bold">Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center bg-slate-800 rounded-2xl px-4 py-2.5 mb-4 border border-slate-700">
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              placeholder="Search sounds or artists..."
              placeholderTextColor="#64748B"
              value={search}
              onChangeText={setSearch}
              className="flex-1 ml-3 text-white text-sm"
            />
          </View>

          {/* Tracks List */}
          <FlatList
            data={filteredTracks}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => {
              const isSelected = selectedTrack?.id === item.id;
              const isPlaying = playingId === item.id;

              return (
                <View className="flex-row items-center justify-between py-3 border-b border-slate-800/80">
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setPlayingId(isPlaying ? null : item.id)}
                    className="flex-row items-center gap-3.5 flex-1"
                  >
                    <View
                      className={`w-11 h-11 rounded-xl items-center justify-center ${
                        isPlaying ? "bg-blue-600" : "bg-slate-800"
                      }`}
                    >
                      <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={18}
                        color="white"
                      />
                    </View>

                    <View className="flex-1">
                      <Text
                        className={`text-sm font-bold leading-tight ${
                          isSelected ? "text-blue-400" : "text-white"
                        }`}
                      >
                        {item.title}
                      </Text>
                      <Text className="text-xs text-slate-400 mt-0.5">
                        {item.artist}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      onSelectTrack(item);
                      onClose();
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}
