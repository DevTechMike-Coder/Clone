import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import {
  ChatMessage,
  chatService,
} from "@/services/chatService";
import { profileService } from "@/services/profileService";
import { formatRelativeTime } from "@/lib/dateUtils";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

const SafeAreaView = styled(RNSafeAreaView);

export default function Conversation() {
  const { user: authUser } = useAuth();
  const { conversationId, otherUserId } = useLocalSearchParams<{
    conversationId: string;
    otherUserId?: string;
  }>();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const fetchInitialData = useCallback(async () => {
    if (!conversationId) return;
    try {
      setLoading(true);
      const [msgs, profile] = await Promise.all([
        chatService.getMessages(conversationId),
        otherUserId ? profileService.getProfile(otherUserId) : Promise.resolve(null),
      ]);
      setMessages(msgs);
      if (profile) setOtherUser(profile);

      // Mark messages as read
      await chatService.markMessagesAsRead(conversationId);
    } catch (error) {
      console.error("Error fetching conversation data:", error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, otherUserId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Realtime subscription to new messages
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = chatService.subscribeToMessages(
      conversationId,
      (newMsg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // If incoming message from other user, mark as read
        if (newMsg.sender_id !== authUser?.id) {
          chatService.markMessagesAsRead(conversationId);
        }

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [conversationId, authUser?.id]);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Toast.show({
          type: "error",
          text1: "Permission Denied",
          text2: "Media library permission is required to send images.",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error("Error selecting image:", error);
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if ((!trimmed && !selectedImage) || !conversationId || sending || !authUser)
      return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const imageToSend = selectedImage;
    const textToSend = trimmed;

    setText("");
    setSelectedImage(null);
    setSending(true);

    try {
      let mediaUrl: string | undefined;
      if (imageToSend) {
        mediaUrl = await chatService.uploadChatMedia(imageToSend, authUser.id);
      }

      const newMsg = await chatService.sendMessage(
        conversationId,
        textToSend,
        mediaUrl
      );

      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error("Failed to send message:", error);
      setText(textToSend);
      setSelectedImage(imageToSend);
      Toast.show({
        type: "error",
        text1: "Send Failed",
        text2: error.message || "Failed to deliver message",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100 bg-white shadow-sm">
        <View className="flex-row items-center gap-3 flex-1">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="p-1"
          >
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              if (otherUserId) {
                router.push({
                  pathname: "/(pages)/userProfile",
                  params: { userId: otherUserId },
                });
              }
            }}
            className="flex-row items-center gap-3 flex-1"
          >
            <View className="h-10 w-10 rounded-full overflow-hidden bg-slate-100 items-center justify-center border border-slate-200">
              {otherUser?.avatar_url ? (
                <Image
                  source={{ uri: otherUser.avatar_url }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              ) : (
                <Image
                  source={require("@/assets/homeIcons/profileUser.png")}
                  className="h-6 w-6"
                  resizeMode="contain"
                />
              )}
            </View>

            <View className="flex-1">
              <Text className="text-base font-bold text-slate-900 leading-tight" numberOfLines={1}>
                {otherUser?.full_name || otherUser?.username || "Chat"}
              </Text>
              {otherUser?.username && (
                <Text className="text-xs text-slate-400">
                  @{otherUser.username}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => {
            if (otherUserId) {
              router.push({
                pathname: "/(pages)/userProfile",
                params: { userId: otherUserId },
              });
            }
          }}
          className="p-2"
        >
          <Ionicons name="information-circle-outline" size={22} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        className="flex-1"
      >
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-24 px-10">
                <Ionicons name="chatbubbles-outline" size={48} color="#CBD5E1" />
                <Text className="text-base font-semibold text-slate-800 mt-4">
                  No messages yet
                </Text>
                <Text className="text-slate-400 text-center text-xs mt-1">
                  Send a friendly message or photo to say hello!
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMe = item.sender_id === authUser?.id;

              return (
                <View
                  className={`mb-3 flex-row ${
                    isMe ? "justify-end" : "justify-start"
                  }`}
                >
                  <View
                    className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl ${
                      isMe
                        ? "bg-blue-600 rounded-br-none"
                        : "bg-white border border-slate-200/80 rounded-bl-none shadow-sm"
                    }`}
                  >
                    {/* Media Attachment */}
                    {item.media_url ? (
                      <View className="w-56 h-56 rounded-xl overflow-hidden mb-1.5 bg-slate-100">
                        <Image
                          source={{ uri: item.media_url }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      </View>
                    ) : null}

                    {/* Text content */}
                    {item.content ? (
                      <Text
                        className={`text-sm leading-5 ${
                          isMe ? "text-white" : "text-slate-800"
                        }`}
                      >
                        {item.content}
                      </Text>
                    ) : null}

                    <Text
                      className={`text-[10px] mt-1 text-right ${
                        isMe ? "text-blue-100" : "text-slate-400"
                      }`}
                    >
                      {formatRelativeTime(item.created_at)}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Selected Image Preview (Before Sending) */}
        {selectedImage && (
          <View className="px-4 py-2 bg-white border-t border-slate-100 flex-row items-center gap-3">
            <View className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 relative">
              <Image
                source={{ uri: selectedImage }}
                className="w-full h-full"
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => setSelectedImage(null)}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
              >
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text className="text-xs text-slate-500 flex-1">
              Photo ready to send. Add a caption below if you like.
            </Text>
          </View>
        )}

        {/* Input Bar */}
        <View className="flex-row items-center px-4 py-3 bg-white border-t border-slate-100">
          <TouchableOpacity
            onPress={handlePickImage}
            disabled={sending}
            activeOpacity={0.7}
            className="p-2 mr-1"
          >
            <Ionicons name="image-outline" size={24} color="#64748B" />
          </TouchableOpacity>

          <View className="flex-1 flex-row items-center bg-slate-100 rounded-2xl px-4 py-2 mr-3 border border-slate-200">
            <TextInput
              placeholder="Send a message..."
              className="flex-1 text-sm text-slate-800 max-h-24"
              placeholderTextColor="#94A3B8"
              value={text}
              onChangeText={setText}
              multiline
              autoCapitalize="sentences"
            />
          </View>

          <TouchableOpacity
            onPress={handleSend}
            disabled={(!text.trim() && !selectedImage) || sending}
            activeOpacity={0.7}
            className={`h-11 w-11 rounded-full items-center justify-center ${
              text.trim() || selectedImage ? "bg-blue-600" : "bg-slate-200"
            }`}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={text.trim() || selectedImage ? "#FFFFFF" : "#94A3B8"}
                style={{ marginLeft: 2 }}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
