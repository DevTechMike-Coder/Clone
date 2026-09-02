import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useCallback, useState } from "react";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  NotificationItem,
  notificationService,
} from "@/services/notificationService";
import PostGridThumbnail from "@/components/PostGridThumbnail";
import { formatRelativeTime } from "@/lib/dateUtils";
import { colors } from "@/constants/theme";

const SafeAreaView = styled(RNSafeAreaView);

type FilterType = "all" | "like" | "comment" | "follow" | "repost";

const Inbox = () => {
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
    return n.type === activeFilter;
  });

  const renderBadge = (type: NotificationItem["type"]) => {
    switch (type) {
      case "like":
        return (
          <View className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1 border-2 border-white">
            <Ionicons name="heart" size={10} color={colors.white} />
          </View>
        );
      case "comment":
        return (
          <View className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1 border-2 border-white">
            <Ionicons name="chatbubble" size={10} color={colors.white} />
          </View>
        );
      case "repost":
        return (
          <View className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 border-2 border-white">
            <Ionicons name="repeat" size={10} color={colors.white} />
          </View>
        );
      case "follow":
        return (
          <View className="absolute -bottom-1 -right-1 bg-purple-500 rounded-full p-1 border-2 border-white">
            <Ionicons name="person" size={10} color={colors.white} />
          </View>
        );
      default:
        return null;
    }
  };

  const getNotificationText = (item: NotificationItem) => {
    const name = item.profiles?.full_name || item.profiles?.username || "Someone";
    switch (item.type) {
      case "like":
        return (
          <Text className="text-slate-800 dark:text-slate-100 text-sm">
            <Text className="font-bold text-slate-900 dark:text-slate-50">{name}</Text> liked your post.
          </Text>
        );
      case "comment":
        return (
          <Text className="text-slate-800 dark:text-slate-100 text-sm">
            <Text className="font-bold text-slate-900 dark:text-slate-50">{name}</Text> commented on your post.
          </Text>
        );
      case "repost":
        return (
          <Text className="text-slate-800 dark:text-slate-100 text-sm">
            <Text className="font-bold text-slate-900 dark:text-slate-50">{name}</Text> reposted your post.
          </Text>
        );
      case "follow":
        return (
          <Text className="text-slate-800 dark:text-slate-100 text-sm">
            <Text className="font-bold text-slate-900 dark:text-slate-50">{name}</Text> started following you.
          </Text>
        );
      default:
        return (
          <Text className="text-slate-800 dark:text-slate-100 text-sm">
            <Text className="font-bold text-slate-900 dark:text-slate-50">{name}</Text> sent you an update.
          </Text>
        );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.slate[900]} />
          </TouchableOpacity>
          <Text className="text-xl font-bold uppercase tracking-tighter text-blue-600">
            Activity
          </Text>
        </View>
      </View>

      {/* Filter Chips */}
      <View className="flex-row px-5 py-3 gap-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        {(
          [
            { key: "all", label: "All" },
            { key: "like", label: "Likes" },
            { key: "comment", label: "Comments" },
            { key: "follow", label: "Follows" },
            { key: "repost", label: "Reposts" },
          ] as { key: FilterType; label: string }[]
        ).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveFilter(tab.key)}
            activeOpacity={0.7}
            className={`px-3.5 py-1.5 rounded-full ${
              activeFilter === tab.key
                ? "bg-blue-600"
                : "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                activeFilter === tab.key ? "text-white" : "text-slate-600 dark:text-slate-300"
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.blue[600]} />
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="notifications-outline" size={48} color={colors.slate[300]} />
          <Text className="text-lg font-semibold text-slate-900 dark:text-slate-50 mt-4">
            No activity yet
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-center mt-2">
            When people like, comment, repost, or follow you, you&apos;ll see it here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.blue[600]}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (item.from_user_id) {
                  router.push({
                    pathname: "/(pages)/userProfile",
                    params: { userId: item.from_user_id },
                  });
                }
              }}
              className={`flex-row items-center justify-between p-3.5 mb-2.5 rounded-2xl border ${
                item.is_read
                  ? "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                  : "bg-blue-50 dark:bg-blue-950/50 border-blue-100"
              }`}
            >
              <View className="flex-row items-center gap-3.5 flex-1 pr-3">
                {/* Avatar with Badge */}
                <View className="relative">
                  <View className="h-12 w-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700">
                    {item.profiles?.avatar_url ? (
                      <Image
                        source={{ uri: item.profiles.avatar_url }}
                        className="h-full w-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Image
                        source={require("@/assets/homeIcons/profileUser.png")}
                        className="h-7 w-7"
                        resizeMode="contain"
                      />
                    )}
                  </View>
                  {renderBadge(item.type)}
                </View>

                {/* Text Content */}
                <View className="flex-1">
                  {getNotificationText(item)}
                  <Text className="text-xs text-slate-400 mt-1">
                    {formatRelativeTime(item.created_at)}
                  </Text>
                </View>
              </View>

              {/* Optional Post Media Preview */}
              {item.posts?.media_url ? (
                <View className="h-11 w-11 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <PostGridThumbnail post={item.posts} />
                </View>
              ) : item.type === "follow" ? (
                <Ionicons name="chevron-forward" size={18} color={colors.slate[400]} />
              ) : null}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default Inbox;
