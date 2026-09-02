import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ProfileSearchResult, profileService } from "@/services/profileService";
import { colors } from "@/constants/theme";

type TagPeopleModalProps = {
  visible: boolean;
  selectedUsers: ProfileSearchResult[];
  onClose: () => void;
  onSave: (users: ProfileSearchResult[]) => void;
};

export default function TagPeopleModal({
  visible,
  selectedUsers: initialSelected,
  onClose,
  onSave,
}: TagPeopleModalProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [selected, setSelected] = useState<ProfileSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelected(initialSelected || []);
      setSearch("");
      loadInitialSuggestions();
    }
  }, [visible, initialSelected]);

  const loadInitialSuggestions = async () => {
    setLoading(true);
    try {
      // Search for common active letters or empty
      const data = await profileService.searchProfiles("a");
      setResults(data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;

    const trimmed = search.trim();
    if (!trimmed) {
      loadInitialSuggestions();
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await profileService.searchProfiles(trimmed);
        setResults(data || []);
      } catch (err) {
        console.warn("Search profiles error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [search, visible]);

  const toggleUser = (user: ProfileSearchResult) => {
    Haptics.selectionAsync();
    setSelected((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      if (exists) {
        return prev.filter((u) => u.id !== user.id);
      }
      return [...prev, user];
    });
  };

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave(selected);
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
        <View className="bg-white rounded-t-[32px] max-h-[85%] flex-1 pt-4 pb-8 px-5 border-t border-slate-100 shadow-2xl">
          {/* Sheet Handle */}
          <View className="items-center mb-3">
            <View className="w-12 h-1.5 rounded-full bg-slate-300" />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="p-1"
            >
              <Ionicons name="close" size={24} color={colors.slate[500]} />
            </TouchableOpacity>

            <Text className="text-lg font-bold text-slate-900">
              Tag People {selected.length > 0 ? `(${selected.length})` : ""}
            </Text>

            <TouchableOpacity
              onPress={handleDone}
              className="bg-blue-600 px-4 py-1.5 rounded-full"
            >
              <Text className="text-white font-bold text-sm">Done</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View className="flex-row items-center bg-slate-100 rounded-2xl px-3.5 py-2.5 my-3.5">
            <Ionicons name="search" size={18} color={colors.slate[400]} />
            <TextInput
              placeholder="Search people to tag..."
              placeholderTextColor={colors.slate[400]}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              className="flex-1 ml-2.5 text-sm text-slate-900"
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

          {/* Selected Users Chips */}
          {selected.length > 0 && (
            <View className="mb-3">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {selected.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    onPress={() => toggleUser(user)}
                    className="flex-row items-center gap-1.5 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full"
                  >
                    {user.avatar_url ? (
                      <Image
                        source={{ uri: user.avatar_url }}
                        className="w-5 h-5 rounded-full"
                        contentFit="cover"
                      />
                    ) : (
                      <Ionicons name="person-circle" size={20} color={colors.blue[600]} />
                    )}
                    <Text className="text-xs font-bold text-blue-700">
                      @{user.username || "user"}
                    </Text>
                    <Ionicons name="close-circle" size={16} color={colors.blue[500]} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* User Results List */}
          {loading ? (
            <View className="flex-1 items-center justify-center py-12">
              <ActivityIndicator size="small" color={colors.blue[600]} />
            </View>
          ) : results.length === 0 ? (
            <View className="flex-1 items-center justify-center py-12 gap-2">
              <Ionicons name="people-outline" size={40} color={colors.slate[300]} />
              <Text className="text-sm font-semibold text-slate-500">
                {search ? "No users found" : "Search users by username or name"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = selected.some((u) => u.id === item.id);
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggleUser(item)}
                    className="flex-row items-center justify-between py-3 border-b border-slate-50"
                  >
                    <View className="flex-row items-center gap-3 flex-1 mr-3">
                      <View className="w-11 h-11 rounded-full bg-slate-100 overflow-hidden items-center justify-center border border-slate-200">
                        {item.avatar_url ? (
                          <Image
                            source={{ uri: item.avatar_url }}
                            className="w-full h-full"
                            contentFit="cover"
                          />
                        ) : (
                          <Ionicons
                            name="person-outline"
                            size={20}
                            color={colors.slate[400]}
                          />
                        )}
                      </View>

                      <View className="flex-1">
                        <Text
                          className="text-sm font-bold text-slate-900"
                          numberOfLines={1}
                        >
                          @{item.username || "user"}
                        </Text>
                        {item.full_name && (
                          <Text
                            className="text-xs text-slate-500"
                            numberOfLines={1}
                          >
                            {item.full_name}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View
                      className={`w-6 h-6 rounded-full items-center justify-center border ${
                        isSelected
                          ? "bg-blue-600 border-blue-600"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color="white" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
