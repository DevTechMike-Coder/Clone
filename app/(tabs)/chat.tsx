import {
  ActivityIndicator,
  Alert,
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
import NewGroupModal from "@/components/modal/NewGroupModal";
import { formatRelativeTime } from "@/lib/dateUtils";
import { colors } from "@/constants/theme";
import { usePalette } from "@/context/ThemeContext";
import { ConversationParticipant } from "@/services/chatService";

const SafeAreaView = styled(RNSafeAreaView);

/** Overlapping member avatars for group rows; generic icon as fallback. */
function ConversationAvatar({
  participants,
}: {
  participants?: ConversationParticipant[];
}) {
  const list = (participants || []).filter((p) => p.avatar_url).slice(0, 2);

  if (list.length === 0) {
    return (
      <View className="h-13 w-13 rounded-full bg-blue-50 dark:bg-blue-950 items-center justify-center border border-blue-100 dark:border-blue-900">
        <Ionicons name="people" size={22} color={colors.blue[600]} />
      </View>
    );
  }

  return (
    <View className="h-13 w-13">
      {list.map((p, index) => (
        <View
          key={p.id}
          className="absolute rounded-full overflow-hidden border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800"
          style={{
            width: 34,
            height: 34,
            top: index === 0 ? 0 : 18,
            left: index === 0 ? 0 : 18,
            zIndex: list.length - index,
          }}
        >
          <Image
            source={{ uri: p.avatar_url! }}
            className="h-full w-full"
            resizeMode="cover"
          />
        </View>
      ))}
    </View>
  );
}

export default function Chat() {
  const palette = usePalette();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);

  const handleCreatePress = () => {
    Alert.alert("Start a conversation", undefined, [
      {
        text: "New message",
        onPress: () => router.push("/(pages)/followpage"),
      },
      { text: "New group", onPress: () => setShowNewGroup(true) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

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

  const conversationTitle = (c: ConversationItem): string => {
    if (c.is_group) {
      if (c.name) return c.name;
      const names = (c.otherParticipants || []).map(
        (p) => p.full_name || p.username
      );
      return names.slice(0, 3).join(", ") || "Group chat";
    }
    return c.otherUser?.full_name || c.otherUser?.username || "Direct Chat";
  };

  const filteredConversations = conversations.filter((c) => {
    const q = searchText.toLowerCase().trim();
    if (!q) return true;
    const title = conversationTitle(c).toLowerCase();
    const groupName = c.name?.toLowerCase() || "";
    const name = c.otherUser?.full_name?.toLowerCase() || "";
    const username = c.otherUser?.username?.toLowerCase() || "";
    const lastMsg = c.lastMessage?.content?.toLowerCase() || "";
    return (
      title.includes(q) ||
      groupName.includes(q) ||
      name.includes(q) ||
      username.includes(q) ||
      lastMsg.includes(q)
    );
  });

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* --- Header Section --- */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <TouchableOpacity
          onPress={() => router.push("/(pages)/followpage")}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Find people"
          className="w-10 h-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-100"
        >
          <Image
            source={require("@/assets/homeIcons/add-user.png")}
            className="w-6 h-6"
            resizeMode="contain"
          />
        </TouchableOpacity>

        <Text className="text-xl font-bold uppercase tracking-tighter text-blue-600">
          Messages
        </Text>

        <TouchableOpacity
          onPress={handleCreatePress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="New message or group"
          className="w-10 h-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
        >
          <Ionicons name="create-outline" size={20} color={palette.text} />
        </TouchableOpacity>
      </View>

      <NewGroupModal
        visible={showNewGroup}
        onClose={() => setShowNewGroup(false)}
        onCreated={(conversationId) => {
          fetchConversations();
          router.push({
            pathname: "/(pages)/conversation",
            params: { conversationId },
          });
        }}
      />

      {/* --- Search Bar Section --- */}
      <View className="px-5 pt-3 pb-2">
        <View className="flex-row items-center bg-white dark:bg-slate-900 rounded-2xl px-4 py-2.5 border border-slate-200 dark:border-slate-700 shadow-sm">
          <Ionicons name="search-outline" size={18} color={colors.slate[400]} />
          <TextInput
            placeholder="Search conversations..."
            className="flex-1 ml-3 text-base text-slate-800 dark:text-slate-100"
            placeholderTextColor={colors.slate[400]}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText("")}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={colors.slate[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* --- Main Content Section --- */}
      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.blue[600]} />
        </View>
      ) : filteredConversations.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="chatbubbles-outline" size={54} color={colors.slate[300]} />
          <Text className="text-lg font-bold text-slate-900 dark:text-slate-50 mt-4">
            No messages yet
          </Text>
          <Text className="text-slate-500 dark:text-slate-400 text-center text-sm mt-1 mb-6">
            Connect with friends and creators to start chatting!
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(pages)/followpage")}
            activeOpacity={0.8}
            className="bg-blue-600 px-6 py-3 rounded-full shadow-sm"
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
              tintColor={colors.blue[600]}
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
              className="flex-row items-center justify-between p-3.5 mb-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/70 shadow-sm"
            >
              <View className="flex-row items-center gap-3.5 flex-1 pr-2">
                {item.is_group ? (
                  <ConversationAvatar participants={item.otherParticipants} />
                ) : (
                  <View className="h-13 w-13 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700">
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
                )}

                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-bold text-slate-900 dark:text-slate-50 leading-tight">
                      {conversationTitle(item)}
                    </Text>
                    {item.lastMessage?.created_at && (
                      <Text className="text-[11px] text-slate-400">
                        {formatRelativeTime(item.lastMessage.created_at)}
                      </Text>
                    )}
                  </View>

                  <Text
                    className={`text-sm mt-1 leading-4 ${
                      item.unreadCount > 0
                        ? "font-bold text-slate-900 dark:text-slate-50"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                    numberOfLines={1}
                  >
                    {item.lastMessage?.content ||
                      (item.lastMessage?.media_url ? "Photo" : "Tap to start conversation")}
                  </Text>
                </View>
              </View>

              {item.unreadCount > 0 && (
                <View className="h-5 min-w-[20px] px-1.5 rounded-full bg-blue-600 items-center justify-center">
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
