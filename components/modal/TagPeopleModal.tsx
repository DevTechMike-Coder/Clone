import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ProfileSearchResult, profileService } from "@/services/profileService";
import { useTheme } from "@/context/ThemeContext";
import {
  Avatar,
  Button,
  EmptyState,
  IconButton,
  PressableScale,
  Text,
  TextField,
} from "@/components/ui";

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
  const { palette } = useTheme();
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
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: palette.overlay }]}
          onPress={onClose}
        />

        <View
          style={[
            styles.sheetCard,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          {/* Sheet Handle */}
          <View style={styles.handleWrapper}>
            <View
              style={[
                styles.handleBar,
                { backgroundColor: palette.borderSubtle },
              ]}
            />
          </View>

          {/* Header */}
          <View
            style={[
              styles.headerRow,
              { borderBottomColor: palette.borderSubtle },
            ]}
          >
            <IconButton
              icon={<Ionicons name="close" size={22} color={palette.muted} />}
              onPress={onClose}
              accessibilityLabel="Close"
              size="sm"
            />

            <Text variant="headline" weight="bold">
              Tag People {selected.length > 0 ? `(${selected.length})` : ""}
            </Text>

            <Button
              title="Done"
              size="sm"
              variant="primary"
              onPress={handleDone}
            />
          </View>

          {/* Search Bar */}
          <View style={styles.searchSection}>
            <TextField
              value={search}
              onChangeText={setSearch}
              placeholder="Search people to tag..."
              autoCapitalize="none"
              leftIcon={
                <Ionicons name="search" size={18} color={palette.muted} />
              }
              rightIcon={
                search.length > 0 ? (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={palette.muted}
                    />
                  </TouchableOpacity>
                ) : undefined
              }
            />
          </View>

          {/* Selected Users Chips */}
          {selected.length > 0 && (
            <View style={styles.chipsSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsScroll}
              >
                {selected.map((user) => (
                  <PressableScale
                    key={user.id}
                    onPress={() => toggleUser(user)}
                    style={[
                      styles.chipItem,
                      {
                        backgroundColor: palette.surfaceElevated,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <Avatar
                      url={user.avatar_url}
                      name={user.full_name || user.username}
                      size="xs"
                    />
                    <Text variant="caption" weight="bold">
                      @{user.username || "user"}
                    </Text>
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={palette.muted}
                    />
                  </PressableScale>
                ))}
              </ScrollView>
            </View>
          )}

          {/* User Results List */}
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" color={palette.accent} />
            </View>
          ) : results.length === 0 ? (
            <EmptyState
              icon={
                <Ionicons
                  name="people-outline"
                  size={40}
                  color={palette.muted}
                />
              }
              title={search ? "No users found" : "Search to tag people"}
              description={
                search
                  ? `No profiles matched "${search}"`
                  : "Type a username or full name above"
              }
            />
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = selected.some((u) => u.id === item.id);
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggleUser(item)}
                    style={[
                      styles.userRow,
                      { borderBottomColor: palette.borderSubtle },
                    ]}
                  >
                    <View style={styles.userRowLeft}>
                      <Avatar
                        url={item.avatar_url}
                        name={item.full_name || item.username}
                        size="md"
                      />

                      <View style={styles.userTextCol}>
                        <Text variant="body" weight="bold" numberOfLines={1}>
                          @{item.username || "user"}
                        </Text>
                        {item.full_name ? (
                          <Text
                            variant="caption"
                            color="muted"
                            numberOfLines={1}
                          >
                            {item.full_name}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: isSelected
                            ? palette.accent
                            : "transparent",
                          borderColor: isSelected
                            ? palette.accent
                            : palette.border,
                        },
                      ]}
                    >
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={palette.onAccent}
                        />
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

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
    flex: 1,
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  handleWrapper: {
    alignItems: "center",
    marginBottom: 8,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  searchSection: {
    paddingVertical: 12,
  },
  chipsSection: {
    marginBottom: 10,
  },
  chipsScroll: {
    gap: 8,
  },
  chipItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  listContent: {
    paddingBottom: 16,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  userTextCol: {
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
