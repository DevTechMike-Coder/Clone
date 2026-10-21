import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
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
import {
  Avatar,
  EmptyState,
  IconButton,
  PressableScale,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
} from "@/components/ui";

export default function Conversation() {
  const { palette } = useTheme();
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
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
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
            style={styles.headerAvatarTouch}
          >
            <Avatar
              url={otherUser?.avatar_url}
              name={otherUser?.full_name || otherUser?.username}
              size={36}
            />
          </TouchableOpacity>
        }
        borderBottom
      />

      {/* Messages List */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        style={styles.flex1}
      >
        {loading ? (
          <View style={styles.skeletonContainer}>
            <View style={styles.skeletonPartnerBubble}>
              <Skeleton width={180} height={42} borderRadius={18} />
            </View>
            <View style={styles.skeletonUserBubble}>
              <Skeleton width={220} height={52} borderRadius={18} />
            </View>
            <View style={styles.skeletonPartnerBubble}>
              <Skeleton width={140} height={38} borderRadius={18} />
            </View>
            <View style={styles.skeletonUserBubble}>
              <Skeleton width={190} height={42} borderRadius={18} />
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={
              <EmptyState
                icon={
                  <Ionicons
                    name="chatbubbles-outline"
                    size={48}
                    color={palette.muted}
                  />
                }
                title="No messages yet"
                description="Send a friendly message or photo to say hello!"
              />
            }
            renderItem={({ item }) => {
              const isMe = item.sender_id === authUser?.id;

              return (
                <View
                  style={[
                    styles.messageRow,
                    { justifyContent: isMe ? "flex-end" : "flex-start" },
                  ]}
                >
                  <View
                    style={[
                      styles.bubbleCard,
                      {
                        borderBottomRightRadius: isMe ? 4 : 18,
                        borderBottomLeftRadius: isMe ? 18 : 4,
                        backgroundColor: isMe ? palette.accent : palette.surface,
                        borderWidth: isMe ? 0 : 1,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    {/* Media Attachment */}
                    {item.media_url ? (
                      <PressableScale
                        onPress={() => setPreviewMediaUrl(item.media_url || null)}
                        style={styles.mediaContainer}
                      >
                        <Image
                          source={{ uri: item.media_url }}
                          style={styles.mediaImage}
                          contentFit="cover"
                          transition={200}
                        />
                      </PressableScale>
                    ) : null}

                    {/* Text content */}
                    {item.content ? (
                      <Text
                        variant="body"
                        color={isMe ? "white" : "default"}
                        style={styles.messageText}
                      >
                        {item.content}
                      </Text>
                    ) : null}

                    {/* Time & Delivery status */}
                    <View style={styles.bubbleFooter}>
                      <Text
                        variant="micro"
                        style={{
                          color: isMe
                            ? "rgba(255,255,255,0.75)"
                            : palette.muted,
                        }}
                      >
                        {formatRelativeTime(item.created_at)}
                      </Text>
                      {isMe && (
                        <Ionicons
                          name="checkmark-done"
                          size={13}
                          color="rgba(255,255,255,0.85)"
                          style={styles.checkIcon}
                        />
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Selected Image Preview (Before Sending) */}
        {selectedImage && (
          <View
            style={[
              styles.selectedPreviewBanner,
              {
                borderColor: palette.borderSubtle,
                backgroundColor: palette.surfaceElevated,
              },
            ]}
          >
            <View
              style={[
                styles.previewThumbnailBox,
                { borderColor: palette.border },
              ]}
            >
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
                contentFit="cover"
              />
              <TouchableOpacity
                onPress={() => setSelectedImage(null)}
                accessibilityRole="button"
                accessibilityLabel="Remove selected photo"
                style={styles.removeImageBtn}
              >
                <Ionicons name="close" size={14} color={colors.white} />
              </TouchableOpacity>
            </View>
            <Text variant="caption" color="muted" style={styles.flex1}>
              Photo attached. Add a message below and tap send.
            </Text>
          </View>
        )}

        {/* Input Bar */}
        <View
          style={[
            styles.inputBar,
            {
              borderTopColor: palette.borderSubtle,
              backgroundColor: palette.surface,
            },
          ]}
        >
          <IconButton
            icon={<Ionicons name="image-outline" size={24} color={palette.muted} />}
            accessibilityLabel="Attach photo"
            onPress={handlePickImage}
            disabled={sending}
            variant="ghost"
          />

          <View
            style={[
              styles.textInputBox,
              {
                borderColor: palette.border,
                backgroundColor: palette.background,
              },
            ]}
          >
            <TextInput
              placeholder="Send a message..."
              style={[
                styles.textInputField,
                { color: palette.text },
              ]}
              placeholderTextColor={palette.placeholder}
              value={text}
              onChangeText={setText}
              multiline
              autoCapitalize="sentences"
            />
          </View>

          <PressableScale
            onPress={handleSend}
            disabled={(!text.trim() && !selectedImage) || sending}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  text.trim() || selectedImage
                    ? palette.accent
                    : palette.surfaceElevated,
              },
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color={palette.onAccent} />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={
                  text.trim() || selectedImage
                    ? palette.onAccent
                    : palette.muted
                }
                style={styles.sendIconOffset}
              />
            )}
          </PressableScale>
        </View>
      </KeyboardAvoidingView>

      {/* Lightbox Image Preview Modal */}
      <Modal
        visible={!!previewMediaUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewMediaUrl(null)}
        statusBarTranslucent
      >
        <View style={styles.lightboxContainer}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setPreviewMediaUrl(null)}
          />
          <View style={styles.lightboxHeader}>
            <IconButton
              icon={<Ionicons name="close" size={24} color={colors.white} />}
              onPress={() => setPreviewMediaUrl(null)}
              accessibilityLabel="Close photo preview"
              size="md"
            />
          </View>
          {previewMediaUrl && (
            <Image
              source={{ uri: previewMediaUrl }}
              style={styles.lightboxImage}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  headerAvatarTouch: {
    padding: 2,
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 16,
  },
  skeletonPartnerBubble: {
    alignItems: "flex-start",
  },
  skeletonUserBubble: {
    alignItems: "flex-end",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: "row",
  },
  bubbleCard: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  mediaContainer: {
    width: 220,
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 6,
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  messageText: {
    lineHeight: 20,
  },
  bubbleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
    gap: 4,
  },
  checkIcon: {
    marginLeft: 2,
  },
  selectedPreviewBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewThumbnailBox: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  removeImageBtn: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 10,
    padding: 3,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  textInputBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderWidth: 1,
  },
  textInputField: {
    flex: 1,
    fontSize: 15,
    maxHeight: 96,
    padding: 0,
    fontFamily: "PlusJakartaSans_400Regular",
  },
  sendButton: {
    height: 42,
    width: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  sendIconOffset: {
    marginLeft: 2,
  },
  lightboxContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxHeader: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  lightboxImage: {
    width: "100%",
    height: "80%",
  },
});
