import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { useTheme } from "@/context/ThemeContext";

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
  const { isDark, palette } = useTheme();
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
      const data = await profileService.searchProfiles("a");
      setResults(data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!search.trim()) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await profileService.searchProfiles(search.trim());
        setResults(data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const toggleUser = (user: ProfileSearchResult) => {
    Haptics.selectionAsync();
    setSelected((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      if (exists) {
        return prev.filter((u) => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        className="flex-1 justify-end"
        style={{ backgroundColor: palette.overlay }}
      >
        <View
          className="rounded-t-[32px] max-h-[85%] flex-1 pt-4 pb-8 px-5 border-t shadow-2xl"
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.border,
          }}
        >
          {/* Sheet Handle */}
          <View className="items-center mb-3">
            <View
              className="w-12 h-1.5 rounded-full"
              style={{
                backgroundColor: isDark
                  ? colors.slate[700]
                  : colors.slate[300],
              }}
            />
          </View>

          {/* Header */}
          <View
            className="flex-row items-center justify-between pb-3 border-b"
            style={{ borderColor: palette.borderSubtle }}
          >
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="p-1"
            >
              <Ionicons name="close" size={24} color={palette.muted} />
            </TouchableOpacity>

            <Text
              className="text-lg font-bold"
              style={{ color: palette.text }}
            >
              Tag People {selected.length > 0 ? `(${selected.length})` : ""}
            </Text>

            <TouchableOpacity
              onPress={handleDone}
              className="px-4 py-1.5 rounded-full"
              style={{ backgroundColor: palette.primary }}
            >
              <Text className="text-white font-bold text-sm">Done</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View
            className="flex-row items-center rounded-2xl px-3.5 py-2.5 my-3.5 border"
            style={{
              backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
              borderColor: palette.border,
            }}
          >
            <Ionicons name="search" size={18} color={palette.muted} />
            <TextInput
              placeholder="Search people to tag..."
              placeholderTextColor={palette.placeholder}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              className="flex-1 ml-2.5 text-sm"
              style={{ color: palette.text }}
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
                    className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border"
                    style={{
                      backgroundColor: isDark
                        ? colors.blue[950] + "50"
                        : colors.blue[50],
                      borderColor: isDark
                        ? colors.blue[900] + "60"
                        : colors.blue[200],
                    }}
                  >
                    {user.avatar_url ? (
                      <Image
                        source={{ uri: user.avatar_url }}
                        className="w-5 h-5 rounded-full"
                        contentFit="cover"
                      />
                    ) : (
                      <Ionicons
                        name="person-circle"
                        size={20}
                        color={palette.primary}
                      />
                    )}
                    <Text
                      className="text-xs font-bold"
                      style={{
                        color: isDark ? colors.blue[300] : colors.blue[700],
                      }}
                    >
                      @{user.username || "user"}
                    </Text>
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={palette.primary}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* User Results List */}
          {loading ? (
            <View className="flex-1 items-center justify-center py-12">
              <ActivityIndicator size="small" color={palette.primary} />
            </View>
          ) : results.length === 0 ? (
            <View className="flex-1 items-center justify-center py-12 gap-2">
              <Ionicons name="people-outline" size={40} color={colors.slate[400]} />
              <Text
                className="text-sm font-semibold"
                style={{ color: palette.muted }}
              >
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
                    className="flex-row items-center justify-between py-3 border-b"
                    style={{ borderColor: palette.borderSubtle }}
                  >
                    <View className="flex-row items-center gap-3 flex-1 mr-3">
                      <View
                        className="w-11 h-11 rounded-full overflow-hidden items-center justify-center border"
                        style={{
                          backgroundColor: isDark
                            ? colors.slate[800]
                            : colors.slate[100],
                          borderColor: palette.border,
                        }}
                      >
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
                            color={palette.muted}
                          />
                        )}
                      </View>

                      <View className="flex-1">
                        <Text
                          className="text-sm font-bold"
                          style={{ color: palette.text }}
                          numberOfLines={1}
                        >
                          @{item.username || "user"}
                        </Text>
                        {item.full_name && (
                          <Text
                            className="text-xs"
                            style={{ color: palette.muted }}
                            numberOfLines={1}
                          >
                            {item.full_name}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View
                      className="w-6 h-6 rounded-full items-center justify-center border"
                      style={{
                        backgroundColor: isSelected
                          ? palette.primary
                          : "transparent",
                        borderColor: isSelected
                          ? palette.primary
                          : palette.border,
                      }}
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
