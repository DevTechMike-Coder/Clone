import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  NotificationItem,
  notificationService,
} from "@/services/notificationService";
import PostGridThumbnail from "@/components/PostGridThumbnail";
import { formatRelativeTime } from "@/lib/dateUtils";
import { useTheme } from "@/context/ThemeContext";
import { colors } from "@/constants/theme";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";

type FilterType =
  | "all"
  | "like"
  | "comment"
  | "follow"
  | "repost"
  | "story"
  | "message";

const Inbox = () => {
  const { palette } = useTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
      // Mark all as read when opening inbox
      await notificationService.markAsRead();
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "story") {
      return n.type === "story" || n.type === "story_expiring";
    }
    return n.type === activeFilter;
  });

  const renderBadge = (type: NotificationItem["type"]) => {
    let iconName: keyof typeof Ionicons.glyphMap = "notifications";
    let bgColor: string = palette.accent;

    switch (type) {
      case "like":
        iconName = "heart";
        bgColor = palette.danger;
        break;
      case "comment":
        iconName = "chatbubble";
        bgColor = palette.accent;
        break;
      case "repost":
        iconName = "repeat";
        bgColor = palette.success;
        break;
      case "follow":
        iconName = "person";
        bgColor = colors.purple[500];
        break;
      case "story":
      case "story_expiring":
        iconName = "play";
        bgColor = palette.warning;
        break;
      case "message":
        iconName = "send";
        bgColor = palette.primary;
        break;
      default:
        return null;
    }

    return (
      <View
        style={{
          position: "absolute",
          bottom: -2,
          right: -2,
          backgroundColor: bgColor,
          borderRadius: 10,
          padding: 3,
          borderWidth: 2,
          borderColor: palette.background,
        }}
      >
        <Ionicons name={iconName} size={10} color={colors.white} />
      </View>
    );
  };

  const getNotificationText = (item: NotificationItem) => {
    const name = item.profiles?.full_name || item.profiles?.username || "Someone";
    let actionText = "sent you an update.";

    switch (item.type) {
      case "like":
        actionText = "liked your post.";
        break;
      case "comment":
        actionText = "commented on your post.";
        break;
      case "repost":
        actionText = "reposted your post.";
        break;
      case "follow":
        actionText = "started following you.";
        break;
      case "message":
        actionText = "sent you a message.";
        break;
      case "story":
        actionText = "posted a new story.";
        break;
      case "story_expiring":
        actionText = "'s story expires soon.";
        break;
    }

    return (
      <Text variant="caption" style={{ lineHeight: 18 }}>
        <Text variant="caption" weight="bold">
          {name}{" "}
        </Text>
        {actionText}
      </Text>
    );
  };

  const openNotification = (item: NotificationItem) => {
    switch (item.type) {
      case "like":
      case "comment":
      case "repost":
        if (item.post_id) {
          router.push({
            pathname: "/(pages)/viewPost",
            params: { postId: item.post_id },
          });
          return;
        }
        break;

      case "story":
      case "story_expiring":
        if (item.from_user_id) {
          router.push({
            pathname: "/(pages)/storyViewer",
            params: { initialUserId: item.from_user_id },
          });
          return;
        }
        break;

      case "message":
        if (item.conversation_id) {
          router.push({
            pathname: "/(pages)/conversation",
            params: {
              conversationId: item.conversation_id,
              ...(item.from_user_id
                ? { otherUserId: item.from_user_id }
                : {}),
            },
          });
          return;
        }
        break;

      default:
        break;
    }

    if (item.from_user_id) {
      router.push({
        pathname: "/(pages)/userProfile",
        params: { userId: item.from_user_id },
      });
    }
  };

  return (
    <Screen>
      {/* Header */}
      <ScreenHeader
        title="Activity"
        showBack
        onBackPress={() => router.back()}
        borderBottom
      />

      {/* Filter Chips */}
      <View style={{ paddingVertical: 10 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {(
            [
              { key: "all", label: "All" },
              { key: "like", label: "Likes" },
              { key: "comment", label: "Comments" },
              { key: "follow", label: "Follows" },
              { key: "repost", label: "Reposts" },
              { key: "story", label: "Stories" },
              { key: "message", label: "Messages" },
            ] as { key: FilterType; label: string }[]
          ).map((tab) => {
            const active = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveFilter(tab.key)}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: active
                    ? palette.primary
                    : palette.surface,
                  borderWidth: 1,
                  borderColor: active
                    ? palette.primary
                    : palette.border,
                }}
              >
                <Text
                  variant="caption"
                  weight="semibold"
                  color={active ? "white" : "muted"}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="No activity yet"
          description="When people follow you, like or comment on your posts, message you, or post a story, you'll see it here."
        />
      ) : (
        <FlatList
          data={filteredNotifications}
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
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openNotification(item)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 14,
                paddingVertical: 12,
                marginBottom: 8,
                borderRadius: 16,
                borderWidth: 1,
                backgroundColor: item.is_read
                  ? palette.surface
                  : palette.surfaceMuted,
                borderColor: palette.border,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flex: 1,
                  paddingRight: 12,
                }}
              >
                {/* Avatar with Badge */}
                <View style={{ position: "relative" }}>
                  <Avatar
                    url={item.profiles?.avatar_url}
                    name={item.profiles?.full_name || item.profiles?.username}
                    size={46}
                  />
                  {renderBadge(item.type)}
                </View>

                {/* Text Content */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  {getNotificationText(item)}
                  <Text
                    variant="micro"
                    color="muted"
                    style={{ marginTop: 2 }}
                  >
                    {formatRelativeTime(item.created_at)}
                  </Text>
                </View>
              </View>

              {/* Optional Post Media Preview */}
              {item.posts?.media_url ? (
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: palette.border,
                    backgroundColor: palette.surfaceMuted,
                  }}
                >
                  <PostGridThumbnail post={item.posts} />
                </View>
              ) : item.type === "follow" ? (
                <Ionicons name="chevron-forward" size={18} color={palette.muted} />
              ) : null}
            </TouchableOpacity>
          )}
        />
      )}
    </Screen>
  );
};

export default Inbox;
