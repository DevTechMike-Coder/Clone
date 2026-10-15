import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

import { useAuth } from "@/context/AuthContext";
import {
  ChatMessage,
  chatService,
} from "@/services/chatService";
import { profileService } from "@/services/profileService";
import { formatRelativeTime } from "@/lib/dateUtils";
import { useTheme } from "@/context/ThemeContext";
import { colors } from "@/constants/theme";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { EmptyState } from "@/components/ui/EmptyState";

export default function Conversation() {
  const { palette, isDark } = useTheme();
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
    <Screen>
      {/* Header */}
      <ScreenHeader
        showBack
        onBackPress={() => router.back()}
        title={otherUser?.full_name || otherUser?.username || "Chat"}
        subtitle={otherUser?.username ? `@${otherUser.username}` : undefined}
        rightAction={
          <TouchableOpacity
            onPress={() => {
              if (otherUserId) {
                router.push({
                  pathname: "/(pages)/userProfile",
                  params: { userId: otherUserId },
                });
              }
            }}
            style={{ padding: 4 }}
          >
            <Avatar
              url={otherUser?.avatar_url}
              name={otherUser?.full_name || otherUser?.username}
              size={34}
            />
          </TouchableOpacity>
        }
        borderBottom
      />

      {/* Messages List */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        style={{ flex: 1 }}
      >
        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={
              <EmptyState
                icon="chatbubbles-outline"
                title="No messages yet"
                description="Send a friendly message or photo to say hello!"
              />
            }
            renderItem={({ item }) => {
              const isMe = item.sender_id === authUser?.id;

              return (
                <View
                  style={{
                    marginBottom: 12,
                    flexDirection: "row",
                    justifyContent: isMe ? "flex-end" : "flex-start",
                  }}
                >
                  <View
                    style={{
                      maxWidth: "78%",
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 18,
                      borderBottomRightRadius: isMe ? 4 : 18,
                      borderBottomLeftRadius: isMe ? 18 : 4,
                      backgroundColor: isMe ? palette.primary : palette.surface,
                      borderWidth: isMe ? 0 : 1,
                      borderColor: palette.border,
                    }}
                  >
                    {/* Media Attachment */}
                    {item.media_url ? (
                      <View
                        style={{
                          width: 220,
                          height: 220,
                          borderRadius: 12,
                          overflow: "hidden",
                          marginBottom: item.content ? 8 : 4,
                          backgroundColor: palette.surfaceMuted,
                        }}
                      >
                        <Image
                          source={{ uri: item.media_url }}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      </View>
                    ) : null}

                    {/* Text content */}
                    {item.content ? (
                      <Text
                        variant="body"
                        color={isMe ? "white" : "default"}
                        style={{ lineHeight: 20 }}
                      >
                        {item.content}
                      </Text>
                    ) : null}

                    <Text
                      variant="micro"
                      style={{
                        marginTop: 4,
                        textAlign: "right",
                        color: isMe ? "rgba(255,255,255,0.7)" : palette.muted,
                      }}
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
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderTopWidth: 1,
              borderColor: palette.borderSubtle,
              backgroundColor: palette.surface,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: palette.border,
                position: "relative",
              }}
            >
              <Image
                source={{ uri: selectedImage }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => setSelectedImage(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove selected photo"
                style={{
                  position: "absolute",
                  top: 3,
                  right: 3,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  borderRadius: 12,
                  padding: 2,
                }}
              >
                <Ionicons name="close" size={14} color={colors.white} />
              </TouchableOpacity>
            </View>
            <Text variant="caption" color="muted" style={{ flex: 1 }}>
              Photo ready to send. Add a caption below if you like.
            </Text>
          </View>
        )}

        {/* Input Bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderTopWidth: 1,
            borderColor: palette.borderSubtle,
            backgroundColor: palette.surface,
          }}
        >
          <IconButton
            icon={<Ionicons name="image-outline" size={24} color={palette.muted} />}
            accessibilityLabel="Attach photo"
            onPress={handlePickImage}
            disabled={sending}
            variant="ghost"
          />

          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 8,
              marginHorizontal: 8,
              borderWidth: 1,
              borderColor: palette.border,
              backgroundColor: palette.background,
            }}
          >
            <TextInput
              placeholder="Send a message..."
              style={{
                flex: 1,
                fontSize: 15,
                color: palette.text,
                maxHeight: 96,
                padding: 0,
              }}
              placeholderTextColor={palette.placeholder}
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
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={{
              height: 42,
              width: 42,
              borderRadius: 21,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor:
                text.trim() || selectedImage
                  ? palette.primary
                  : palette.surfaceMuted,
            }}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={
                  text.trim() || selectedImage
                    ? colors.white
                    : palette.muted
                }
                style={{ marginLeft: 2 }}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
