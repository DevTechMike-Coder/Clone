import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  ConversationItem,
  chatService,
} from "@/services/chatService";
import { formatRelativeTime } from "@/lib/dateUtils";
import { useTheme } from "@/context/ThemeContext";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/ui/Avatar";
import { TextField } from "@/components/ui/TextField";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

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
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
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
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : filteredConversations.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="No messages yet"
          description="Connect with friends and creators to start chatting!"
          actionTitle="Discover People"
          onActionPress={() => router.push("/(pages)/followpage")}
        />
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.primary}
            />
          }
          renderItem={({ item }) => {
            const hasUnread = item.unreadCount > 0;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: "/(pages)/conversation",
                    params: {
                      conversationId: item.id,
                      otherUserId: item.otherUser?.id,
                    },
                  })
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  marginBottom: 8,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: palette.border,
                  backgroundColor: palette.surface,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                    marginRight: 10,
                  }}
                >
                  <Avatar
                    url={item.otherUser?.avatar_url}
                    name={item.otherUser?.full_name || item.otherUser?.username}
                    size={48}
                  />

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        variant="body"
                        weight={hasUnread ? "bold" : "semibold"}
                        numberOfLines={1}
                        style={{ flex: 1, marginRight: 8 }}
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
                      style={{ marginTop: 3 }}
                    >
                      {item.lastMessage?.content ||
                        (item.lastMessage?.media_url
                          ? "📷 Photo"
                          : "Tap to start conversation")}
                    </Text>
                  </View>
                </View>

                {hasUnread && (
                  <Badge content={item.unreadCount} variant="primary" size="sm" />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </Screen>
  );
}
