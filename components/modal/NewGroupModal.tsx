import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import {
  ProfileSearchResult,
  profileService,
} from "@/services/profileService";
import { chatService } from "@/services/chatService";
import { colors } from "@/constants/theme";

type NewGroupModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Called with the new conversation id once the group has been created. */
  onCreated: (conversationId: string) => void;
};

const MIN_OTHER_MEMBERS = 2;

const NewGroupModal = ({ visible, onClose, onCreated }: NewGroupModalProps) => {
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [selected, setSelected] = useState<ProfileSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadInitialSuggestions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await profileService.searchProfiles("a");
      setResults(data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setSelected([]);
      setGroupName("");
      setSearch("");
      loadInitialSuggestions();
    }
  }, [visible, loadInitialSuggestions]);

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
  }, [search, visible, loadInitialSuggestions]);

  const toggleUser = (user: ProfileSearchResult) => {
    Haptics.selectionAsync();
    setSelected((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const canCreate = selected.length >= MIN_OTHER_MEMBERS && !creating;

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const conversationId = await chatService.createGroupConversation(
        groupName.trim(),
        selected.map((u) => u.id)
      );
      onClose();
      onCreated(conversationId);
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Couldn't create group",
        text2: error?.message || "Please try again.",
      });
    } finally {
      setCreating(false);
    }
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
        <View className="bg-white dark:bg-slate-900 rounded-t-3xl border border-slate-100 dark:border-slate-800 p-6 max-h-[85%]">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-bold text-slate-900 dark:text-slate-50">
              New group
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.slate[500]} />
            </TouchableOpacity>
          </View>

          <TextInput
            placeholder="Group name (optional)"
            placeholderTextColor={colors.slate[400]}
            value={groupName}
            onChangeText={setGroupName}
            maxLength={80}
            className="h-12 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 text-base text-slate-900 dark:text-slate-50 mb-3"
          />

          {/* Selected members */}
          {selected.length > 0 && (
            <View className="flex-row flex-wrap gap-2 mb-3">
              {selected.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  onPress={() => toggleUser(user)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${user.username}`}
                  className="flex-row items-center gap-1.5 bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-900 rounded-full pl-1 pr-2.5 py-1"
                >
                  <MemberAvatar user={user} size={20} />
                  <Text className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                    {user.username}
                  </Text>
                  <Ionicons
                    name="close"
                    size={12}
                    color={colors.blue[600]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View className="flex-row items-center bg-slate-50 dark:bg-slate-800 rounded-2xl px-4 py-2.5 border border-slate-200 dark:border-slate-700 mb-3">
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.slate[400]}
            />
            <TextInput
              placeholder="Search people..."
              placeholderTextColor={colors.slate[400]}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              className="flex-1 ml-3 text-base text-slate-800 dark:text-slate-100"
            />
          </View>

          {loading ? (
            <ActivityIndicator
              size="small"
              color={colors.blue[600]}
              className="my-6"
            />
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 260 }}
              renderItem={({ item }) => {
                const isSelected = selected.some((u) => u.id === item.id);
                return (
                  <TouchableOpacity
                    onPress={() => toggleUser(item)}
                    activeOpacity={0.7}
                    className="flex-row items-center gap-3 py-2.5"
                  >
                    <MemberAvatar user={item} size={40} />
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-900 dark:text-slate-50">
                        {item.full_name || item.username}
                      </Text>
                      <Text className="text-xs text-slate-400">
                        @{item.username}
                      </Text>
                    </View>
                    <Ionicons
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                      size={22}
                      color={
                        isSelected ? colors.blue[600] : colors.slate[300]
                      }
                    />
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text className="text-sm text-slate-400 text-center py-6">
                  No people found
                </Text>
              }
            />
          )}

          <TouchableOpacity
            onPress={handleCreate}
            disabled={!canCreate}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Create group"
            className={`mt-4 h-12 rounded-full items-center justify-center ${
              canCreate ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
            }`}
          >
            {creating ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text
                className={`font-bold text-sm ${
                  canCreate
                    ? "text-white"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {selected.length < MIN_OTHER_MEMBERS
                  ? `Pick at least ${MIN_OTHER_MEMBERS} people`
                  : "Create group"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

function MemberAvatar({
  user,
  size,
}: {
  user: ProfileSearchResult;
  size: number;
}) {
  return (
    <View
      className="rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 items-center justify-center"
      style={{ width: size, height: size }}
    >
      {user.avatar_url ? (
        <Image
          source={{ uri: user.avatar_url }}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      ) : (
        <Ionicons name="person" size={size * 0.55} color={colors.slate[400]} />
      )}
    </View>
  );
}

export default NewGroupModal;
