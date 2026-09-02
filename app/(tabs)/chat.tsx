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

const SafeAreaView = styled(RNSafeAreaView);

export default function Chat() {
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
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* --- Header Section --- */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <TouchableOpacity
          onPress={() => router.push("/(pages)/followpage")}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Find people"
          className="w-10 h-10 items-center justify-center rounded-full bg-blue-50 border border-blue-100"
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
          onPress={() => router.push("/(pages)/followpage")}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="New message"
          className="w-10 h-10 items-center justify-center rounded-full bg-slate-100"
        >
          <Ionicons name="create-outline" size={20} color={colors.slate[900]} />
        </TouchableOpacity>
      </View>

      {/* --- Search Bar Section --- */}
      <View className="px-5 pt-3 pb-2">
        <View className="flex-row items-center bg-white rounded-2xl px-4 py-2.5 border border-slate-200 shadow-sm">
          <Ionicons name="search-outline" size={18} color={colors.slate[400]} />
          <TextInput
            placeholder="Search conversations..."
            className="flex-1 ml-3 text-base text-slate-800"
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
          <Text className="text-lg font-bold text-slate-900 mt-4">
            No messages yet
          </Text>
          <Text className="text-slate-500 text-center text-sm mt-1 mb-6">
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
              className="flex-row items-center justify-between p-3.5 mb-2.5 rounded-2xl bg-white border border-slate-200/70 shadow-sm"
            >
              <View className="flex-row items-center gap-3.5 flex-1 pr-2">
                <View className="h-13 w-13 rounded-full overflow-hidden bg-slate-100 items-center justify-center border border-slate-200">
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
                    <Text className="text-base font-bold text-slate-900 leading-tight">
                      {item.otherUser?.full_name || item.otherUser?.username || "Direct Chat"}
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
                        ? "font-bold text-slate-900"
                        : "text-slate-500"
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
