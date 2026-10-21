import React, { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  ConversationItem,
  chatService,
} from "@/services/chatService";
import { formatRelativeTime } from "@/lib/dateUtils";
import { useTheme } from "@/context/ThemeContext";
import {
  Avatar,
  Badge,
  EmptyState,
  IconButton,
  PressableScale,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
  TextField,
} from "@/components/ui";

export default function Chat() {
  const { palette } = useTheme();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");

  const fetchConversations = useCallback(async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [fetchConversations])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const handleOpenConversation = (item: ConversationItem) => {
    Haptics.selectionAsync();
    router.push({
      pathname: "/(pages)/conversation",
      params: {
        conversationId: item.id,
        otherUserId: item.otherUser?.id,
      },
    });
  };

  const filteredConversations = conversations.filter((c) => {
    const q = searchText.toLowerCase().trim();
    if (!q) return true;
    const name = c.otherUser?.full_name?.toLowerCase() || "";
    const username = c.otherUser?.username?.toLowerCase() || "";
    const lastMsg = c.lastMessage?.content?.toLowerCase() || "";
    return name.includes(q) || username.includes(q) || lastMsg.includes(q);
  });

  return (
    <Screen>
      {/* Header */}
      <ScreenHeader
        title="Messages"
        showBack={false}
        leftAction={
          <IconButton
            icon={<Ionicons name="person-add-outline" size={20} color={palette.text} />}
            accessibilityLabel="Find people"
            onPress={() => router.push("/(pages)/followpage")}
            variant="ghost"
          />
        }
        rightAction={
          <IconButton
            icon={<Ionicons name="create-outline" size={22} color={palette.text} />}
            accessibilityLabel="New message"
            onPress={() => router.push("/(pages)/followpage")}
            variant="ghost"
          />
        }
        borderBottom
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextField
          placeholder="Search conversations..."
          leftIcon={
            <Ionicons name="search-outline" size={18} color={palette.muted} />
          }
          rightIcon={
            searchText ? (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={18} color={palette.muted} />
              </TouchableOpacity>
            ) : undefined
          }
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.skeletonContainer}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton.Row key={i} style={styles.skeletonRow} />
          ))}
        </View>
      ) : filteredConversations.length === 0 ? (
        <EmptyState
          icon={
            <Ionicons
              name="chatbubbles-outline"
              size={48}
              color={palette.muted}
            />
          }
          title="No messages yet"
          description="Connect with friends and creators to start chatting!"
          actionTitle="Discover People"
          onActionPress={() => router.push("/(pages)/followpage")}
        />
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.accent}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const hasUnread = (item.unreadCount ?? 0) > 0;

            return (
              <PressableScale
                onPress={() => handleOpenConversation(item)}
                style={[
                  styles.conversationCard,
                  {
                    borderColor: hasUnread
                      ? palette.accent + "50"
                      : palette.border,
                    backgroundColor: hasUnread
                      ? palette.surfaceElevated
                      : palette.surface,
                  },
                ]}
              >
                <View style={styles.cardLeft}>
                  <View style={styles.avatarWrapper}>
                    <Avatar
                      url={item.otherUser?.avatar_url}
                      name={item.otherUser?.full_name || item.otherUser?.username}
                      size={48}
                    />
                    {hasUnread && (
                      <View
                        style={[
                          styles.unreadDot,
                          {
                            backgroundColor: palette.accent,
                            borderColor: palette.surface,
                          },
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.textContainer}>
                    <View style={styles.titleRow}>
                      <Text
                        variant="body"
                        weight={hasUnread ? "bold" : "semibold"}
                        numberOfLines={1}
                        style={styles.userNameText}
                      >
                        {item.otherUser?.full_name ||
                          item.otherUser?.username ||
                          "Direct Chat"}
                      </Text>
                      {item.lastMessage?.created_at && (
                        <Text variant="micro" color="muted">
                          {formatRelativeTime(item.lastMessage.created_at)}
                        </Text>
                      )}
                    </View>

                    <Text
                      variant="caption"
                      color={hasUnread ? "default" : "muted"}
                      weight={hasUnread ? "semibold" : "regular"}
                      numberOfLines={1}
                      style={styles.lastMessageText}
                    >
                      {item.lastMessage?.content ||
                        (item.lastMessage?.media_url
                          ? "📷 Photo"
                          : "Tap to start conversation")}
                    </Text>
                  </View>
                </View>

                {hasUnread && (
                  <Badge
                    content={item.unreadCount}
                    variant="primary"
                    size="sm"
                  />
                )}
              </PressableScale>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  skeletonRow: {
    paddingVertical: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  conversationCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  avatarWrapper: {
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userNameText: {
    flex: 1,
    marginRight: 8,
  },
  lastMessageText: {
    marginTop: 3,
  },
});
