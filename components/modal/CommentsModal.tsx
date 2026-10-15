import { Comment, commentService } from "@/services/commentService";
import { formatRelativeTime } from "@/lib/dateUtils";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  ListRenderItemInfo,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { Avatar } from "@/components/ui/Avatar";
import { Text } from "@/components/ui/Text";

const SCREEN_HEIGHT = Dimensions.get("window").height;

type CommentsModalProps = {
  postId: string;
  onClose: () => void;
};

type ReplyingToState = {
  commentId: string;
  username: string;
} | null;

const CommentsModal = ({ postId, onClose }: CommentsModalProps) => {
  const { isDark, palette } = useTheme();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ReplyingToState>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({});
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const inputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    // Slide up animation
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();

    // Fetch comments
    loadComments();

    // Dynamic keyboard listener
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [postId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const data = await commentService.getComments(postId);
      setComments(data);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(onClose);
  };

  const handleReplyPress = (commentId: string, username: string) => {
    setReplyingTo({ commentId, username });
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const toggleLikeComment = (commentId: string) => {
    setLikedComments((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      const parentId = replyingTo?.commentId ?? null;
      const newComment = await commentService.addComment(postId, trimmed, parentId);

      if (parentId) {
        // Nested reply added
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === parentId) {
              return {
                ...c,
                replies: [...(c.replies || []), newComment],
              };
            }
            return c;
          })
        );
        // Automatically expand replies for this comment
        setExpandedReplies((prev) => ({ ...prev, [parentId]: true }));
      } else {
        // Root comment added
        setComments((prev) => [newComment, ...prev]);
      }

      setText("");
      setReplyingTo(null);
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUserPress = (userId?: string) => {
    if (!userId) return;
    onClose();
    router.push({
      pathname: "/(pages)/userProfile",
      params: { userId },
    });
  };

  const renderCommentItem = ({ item }: ListRenderItemInfo<Comment>) => {
    const isLiked = !!likedComments[item.id];
    const hasReplies = item.replies && item.replies.length > 0;
    const isExpanded = !!expandedReplies[item.id];
    const username = item.profiles?.username || item.profiles?.full_name || "user";

    return (
      <View style={{ marginBottom: 16 }}>
        {/* Main Comment Row */}
        <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
          {/* Avatar (clickable) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleUserPress(item.user_id)}
            style={{ marginTop: 2 }}
          >
            <Avatar
              url={item.profiles?.avatar_url}
              name={username}
              size={36}
            />
          </TouchableOpacity>

          {/* Comment Content & Metadata */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleUserPress(item.user_id)}
              >
                <Text
                  variant="bodyMedium"
                  weight="semibold"
                  style={{ color: palette.text }}
                >
                  {username}
                </Text>
              </TouchableOpacity>
              <Text variant="micro" style={{ color: palette.muted }}>
                {formatRelativeTime(item.created_at)}
              </Text>
            </View>

            <Text
              variant="body"
              style={{
                color: palette.text,
                marginTop: 4,
                lineHeight: 20,
              }}
            >
              {item.content}
            </Text>

            {/* Action Bar: Reply Button */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => handleReplyPress(item.id, username)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text variant="caption" weight="semibold" style={{ color: palette.muted }}>
                  Reply
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Like Heart Button */}
          <TouchableOpacity
            onPress={() => toggleLikeComment(item.id)}
            style={{ padding: 4, alignItems: "center", justifyContent: "center", marginTop: 2 }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isLiked ? "Unlike comment" : "Like comment"}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={16}
              color={isLiked ? palette.like : palette.muted}
            />
          </TouchableOpacity>
        </View>

        {/* Threaded Replies */}
        {hasReplies && (
          <View style={{ paddingLeft: 48, marginTop: 8 }}>
            {/* Render Nested Replies FIRST when expanded */}
            {isExpanded && (
              <View
                style={{
                  marginBottom: 8,
                  gap: 12,
                  paddingLeft: 8,
                  borderLeftWidth: 1,
                  borderColor: palette.borderSubtle,
                }}
              >
                {item.replies!.map((reply) => {
                  const replyUsername =
                    reply.profiles?.username || reply.profiles?.full_name || "user";
                  const isReplyLiked = !!likedComments[reply.id];

                  return (
                    <View key={reply.id} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleUserPress(reply.user_id)}
                        style={{ marginTop: 2 }}
                      >
                        <Avatar
                          url={reply.profiles?.avatar_url}
                          name={replyUsername}
                          size={28}
                        />
                      </TouchableOpacity>

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => handleUserPress(reply.user_id)}
                          >
                            <Text
                              variant="caption"
                              weight="semibold"
                              style={{ color: palette.text }}
                            >
                              {replyUsername}
                            </Text>
                          </TouchableOpacity>
                          <Text
                            variant="micro"
                            style={{ color: palette.muted }}
                          >
                            {formatRelativeTime(reply.created_at)}
                          </Text>
                        </View>

                        <Text
                          variant="caption"
                          style={{
                            color: palette.text,
                            marginTop: 2,
                            lineHeight: 16,
                          }}
                        >
                          {reply.content}
                        </Text>

                        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 }}>
                          <TouchableOpacity
                            onPress={() => handleReplyPress(item.id, replyUsername)}
                            activeOpacity={0.7}
                          >
                            <Text variant="micro" weight="semibold" style={{ color: palette.muted }}>
                              Reply
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => toggleLikeComment(reply.id)}
                        style={{ padding: 4, alignItems: "center", justifyContent: "center" }}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={isReplyLiked ? "Unlike reply" : "Like reply"}
                      >
                        <Ionicons
                          name={isReplyLiked ? "heart" : "heart-outline"}
                          size={14}
                          color={isReplyLiked ? palette.like : palette.muted}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* View / Hide Replies Toggle Button */}
            <TouchableOpacity
              onPress={() => toggleReplies(item.id)}
              activeOpacity={0.7}
              style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}
            >
              <View style={{ width: 24, height: 1, backgroundColor: palette.border }} />
              <Text variant="caption" weight="semibold" style={{ color: palette.muted }}>
                {isExpanded
                  ? "Hide replies"
                  : `View ${item.replies!.length} ${
                      item.replies!.length === 1 ? "reply" : "replies"
                    }`}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Adjust sheet height so when keyboard opens, the top comment and header stay comfortably on screen
  const dynamicSheetHeight =
    keyboardHeight > 0
      ? Math.max(SCREEN_HEIGHT * 0.45, SCREEN_HEIGHT - keyboardHeight - 65)
      : SCREEN_HEIGHT * 0.72;

  return (
    <Modal
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop */}
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
          <View style={styles.backdrop} />
        </Pressable>

        {/* Animated Sheet */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: palette.surface,
              transform: [{ translateY: slideAnim }],
              height: dynamicSheetHeight,
              marginBottom: keyboardHeight,
            },
          ]}
        >
          <View style={styles.flexContainer}>
            {/* Header Handle */}
            <View style={{ alignItems: "center", paddingTop: 12, paddingBottom: 4 }}>
              <View
                style={{
                  height: 4,
                  width: 44,
                  borderRadius: 2,
                  backgroundColor: palette.border,
                }}
              />
            </View>

            {/* Header Title */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingBottom: 12,
                paddingTop: 4,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderColor: palette.borderSubtle,
              }}
            >
              <View style={{ width: 24 }} />
              <Text variant="headline" weight="bold" style={{ color: palette.text }}>
                Comments
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Close comments"
              >
                <Ionicons name="close" size={22} color={palette.muted} />
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            {loading ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 }}>
                <ActivityIndicator size="small" color={palette.primary} />
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c) => c.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                renderItem={renderCommentItem}
                ListEmptyComponent={
                  <View style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 40 }}>
                    <Ionicons name="chatbubbles-outline" size={42} color={palette.muted} />
                    <Text
                      variant="body"
                      weight="medium"
                      style={{ color: palette.text, marginTop: 12, textAlign: "center" }}
                    >
                      No comments yet
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={{ color: palette.muted, textAlign: "center", marginTop: 4 }}
                    >
                      Be the first to share what you think!
                    </Text>
                  </View>
                }
              />
            )}

            {/* Replying Banner */}
            {replyingTo && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  backgroundColor: palette.surfaceMuted,
                  borderColor: palette.borderSubtle,
                }}
              >
                <Text variant="caption" style={{ color: palette.muted }}>
                  Replying to <Text variant="caption" weight="bold" style={{ color: palette.primary }}>@{replyingTo.username}</Text>
                </Text>
                <TouchableOpacity
                  onPress={cancelReply}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel reply"
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close-circle" size={16} color={palette.muted} />
                </TouchableOpacity>
              </View>
            )}

            {/* Comment Input Footer */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderTopWidth: StyleSheet.hairlineWidth,
                backgroundColor: palette.surface,
                borderColor: palette.borderSubtle,
              }}
            >
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                placeholder={
                  replyingTo
                    ? `Reply to @${replyingTo.username}...`
                    : "Add a comment..."
                }
                placeholderTextColor={palette.placeholder}
                multiline
                style={[
                  styles.textInput,
                  {
                    backgroundColor: palette.surfaceMuted,
                    color: palette.text,
                    borderColor: palette.borderSubtle,
                  },
                ]}
              />
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting || !text.trim()}
                activeOpacity={0.7}
                style={[
                  styles.postButton,
                  {
                    backgroundColor:
                      submitting || !text.trim()
                        ? palette.surfaceMuted
                        : palette.primary,
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={palette.onAccent} />
                ) : (
                  <Text
                    variant="bodyMedium"
                    weight="bold"
                    style={{
                      color: submitting || !text.trim() ? palette.muted : palette.onAccent,
                    }}
                  >
                    Post
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  flexContainer: {
    flex: 1,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 90,
    borderWidth: 1,
  },
  postButton: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
  },
});

export default CommentsModal;