import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ConversationItem,
  chatService,
} from "@/services/chatService";
import { formatRelativeTime } from "@/lib/dateUtils";
import { colors } from "@/constants/theme";
import { useTheme } from "@/context/ThemeContext";

const SafeAreaView = styled(RNSafeAreaView);

export default function Chat() {
  const { isDark, palette } = useTheme();
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
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: palette.background }}
    >
      {/* --- Header Section --- */}
      <View
        className="flex-row items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: palette.borderSubtle }}
      >
        <TouchableOpacity
          onPress={() => router.push("/(pages)/followpage")}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Find people"
          className="w-10 h-10 items-center justify-center rounded-full border"
          style={{
            backgroundColor: isDark
              ? colors.blue[950]
              : colors.blue[50],
            borderColor: isDark ? colors.blue[900] : colors.blue[100],
          }}
        >
          <Image
            source={require("@/assets/homeIcons/add-user.png")}
            className="w-6 h-6"
            resizeMode="contain"
            style={{ tintColor: isDark ? palette.primary : undefined }}
          />
        </TouchableOpacity>

        <Text
          className="text-xl font-bold uppercase tracking-tighter"
          style={{ color: palette.primary }}
        >
          Messages
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/(pages)/followpage")}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="New message"
          className="w-10 h-10 items-center justify-center rounded-full"
          style={{
            backgroundColor: isDark ? colors.slate[800] : colors.slate[100],
          }}
        >
          <Ionicons name="create-outline" size={20} color={palette.text} />
        </TouchableOpacity>
      </View>

      {/* --- Search Bar Section --- */}
      <View className="px-5 pt-3 pb-2">
        <View
          className="flex-row items-center rounded-2xl px-4 py-2.5 border shadow-sm"
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.border,
          }}
        >
          <Ionicons name="search-outline" size={18} color={palette.muted} />
          <TextInput
            placeholder="Search conversations..."
            className="flex-1 ml-3 text-base"
            style={{ color: palette.text }}
            placeholderTextColor={palette.placeholder}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText("")}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={palette.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* --- Main Content Section --- */}
      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : filteredConversations.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="chatbubbles-outline" size={54} color={colors.slate[400]} />
          <Text
            className="text-lg font-bold mt-4"
            style={{ color: palette.text }}
          >
            No messages yet
          </Text>
          <Text
            className="text-center text-sm mt-1 mb-6"
            style={{ color: palette.muted }}
          >
            Connect with friends and creators to start chatting!
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(pages)/followpage")}
            activeOpacity={0.8}
            className="px-6 py-3 rounded-full shadow-sm"
            style={{ backgroundColor: palette.primary }}
          >
            <Text className="text-white font-bold text-sm">Discover People</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10 }}
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
              onPress={() =>
                router.push({
                  pathname: "/(pages)/conversation",
                  params: {
                    conversationId: item.id,
                    otherUserId: item.otherUser?.id,
                  },
                })
              }
              className="flex-row items-center justify-between p-3.5 mb-2.5 rounded-2xl border shadow-sm"
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
              }}
            >
              <View className="flex-row items-center gap-3.5 flex-1 pr-2">
                <View
                  className="h-13 w-13 rounded-full overflow-hidden items-center justify-center border"
                  style={{
                    backgroundColor: isDark
                      ? colors.slate[800]
                      : colors.slate[100],
                    borderColor: palette.border,
                  }}
                >
                  {item.otherUser?.avatar_url ? (
                    <Image
                      source={{ uri: item.otherUser.avatar_url }}
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

                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-base font-bold leading-tight"
                      style={{ color: palette.text }}
                    >
                      {item.otherUser?.full_name || item.otherUser?.username || "Direct Chat"}
                    </Text>
                    {item.lastMessage?.created_at && (
                      <Text
                        className="text-[11px]"
                        style={{ color: palette.muted }}
                      >
                        {formatRelativeTime(item.lastMessage.created_at)}
                      </Text>
                    )}
                  </View>

                  <Text
                    className={`text-sm mt-1 leading-4 ${
                      item.unreadCount > 0 ? "font-bold" : ""
                    }`}
                    style={{
                      color:
                        item.unreadCount > 0
                          ? palette.text
                          : palette.muted,
                    }}
                    numberOfLines={1}
                  >
                    {item.lastMessage?.content ||
                      (item.lastMessage?.media_url ? "Photo" : "Tap to start conversation")}
                  </Text>
                </View>
              </View>

              {item.unreadCount > 0 && (
                <View
                  className="h-5 min-w-[20px] px-1.5 rounded-full items-center justify-center"
                  style={{ backgroundColor: palette.primary }}
                >
                  <Text className="text-white text-[10px] font-bold">
                    {item.unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
