import { Comment, commentService } from "@/services/commentService";
import { formatRelativeTime } from "@/lib/dateUtils";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { styled } from "nativewind";
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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const StyledImage = styled(Image);
const SCREEN_HEIGHT = Dimensions.get("window").height;

type CommentsModalProps = {
  postId: string;
  onClose: () => void;
};

type ReplyingToState = {
  commentId: string;
  username: string;
} | null;

const CommentAvatar = ({ uri }: { uri?: string | null }) => {
  const [hasError, setHasError] = useState(false);

  if (!uri || hasError) {
    return (
      <StyledImage
        source={require("@/assets/homeIcons/profileUser.png")}
        className="h-5 w-5"
        contentFit="contain"
        style={{ tintColor: "#94a3b8" }}
      />
    );
  }

  return (
    <StyledImage
      source={{ uri }}
      className="h-full w-full"
      contentFit="cover"
      onError={() => setHasError(true)}
    />
  );
};

const CommentsModal = ({ postId, onClose }: CommentsModalProps) => {
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
      <View className="mb-4">
        {/* Main Comment Row */}
        <View className="flex-row gap-3 items-start">
          {/* Avatar (clickable) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleUserPress(item.user_id)}
            className="h-9 w-9 rounded-full bg-slate-100 overflow-hidden items-center justify-center border border-slate-200 mt-0.5"
          >
            <CommentAvatar uri={item.profiles?.avatar_url} />
          </TouchableOpacity>

          {/* Comment Content & Metadata */}
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleUserPress(item.user_id)}
              >
                <Text className="text-sm font-bold text-slate-900">
                  {username}
                </Text>
              </TouchableOpacity>
              <Text className="text-[11px] text-slate-400">
                {formatRelativeTime(item.created_at)}
              </Text>
            </View>

            <Text className="text-sm text-slate-800 mt-1 leading-5">
              {item.content}
            </Text>

            {/* Action Bar: Reply Button */}
            <View className="flex-row items-center gap-4 mt-2">
              <TouchableOpacity
                onPress={() => handleReplyPress(item.id, username)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-xs font-bold text-slate-500">
                  Reply
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Like Heart Button */}
          <TouchableOpacity
            onPress={() => toggleLikeComment(item.id)}
            className="p-1 items-center justify-center mt-1"
            activeOpacity={0.7}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={16}
              color={isLiked ? "#ef4444" : "#94a3b8"}
            />
          </TouchableOpacity>
        </View>

        {/* Threaded Replies */}
        {hasReplies && (
          <View className="pl-12 mt-2">
            {/* Render Nested Replies FIRST when expanded (Above the toggle) */}
            {isExpanded && (
              <View className="mb-2 gap-3 pl-2 border-l border-slate-200">
                {item.replies!.map((reply) => {
                  const replyUsername =
                    reply.profiles?.username || reply.profiles?.full_name || "user";
                  const isReplyLiked = !!likedComments[reply.id];

                  return (
                    <View key={reply.id} className="flex-row gap-2.5 items-start">
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleUserPress(reply.user_id)}
                        className="h-7 w-7 rounded-full bg-slate-100 overflow-hidden items-center justify-center border border-slate-200 mt-0.5"
                      >
                        <CommentAvatar uri={reply.profiles?.avatar_url} />
                      </TouchableOpacity>

                      <View className="flex-1">
                        <View className="flex-row items-center gap-1.5">
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => handleUserPress(reply.user_id)}
                          >
                            <Text className="text-xs font-bold text-slate-900">
                              {replyUsername}
                            </Text>
                          </TouchableOpacity>
                          <Text className="text-[10px] text-slate-400">
                            {formatRelativeTime(reply.created_at)}
                          </Text>
                        </View>

                        <Text className="text-xs text-slate-800 mt-0.5 leading-4">
                          {reply.content}
                        </Text>

                        <View className="flex-row items-center gap-3 mt-1.5">
                          <TouchableOpacity
                            onPress={() => handleReplyPress(item.id, replyUsername)}
                            activeOpacity={0.7}
                          >
                            <Text className="text-[11px] font-bold text-slate-500">
                              Reply
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => toggleLikeComment(reply.id)}
                        className="p-1 items-center justify-center"
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isReplyLiked ? "heart" : "heart-outline"}
                          size={14}
                          color={isReplyLiked ? "#ef4444" : "#94a3b8"}
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
              className="flex-row items-center gap-2 py-1"
            >
              <View className="w-6 h-[1px] bg-slate-300" />
              <Text className="text-xs font-semibold text-slate-500">
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
              transform: [{ translateY: slideAnim }],
              height: dynamicSheetHeight,
              marginBottom: keyboardHeight,
            },
          ]}
        >
          <View style={styles.flexContainer}>
            {/* Header Handle */}
            <View className="items-center pt-3 pb-1">
              <View className="h-1.5 w-12 rounded-full bg-slate-300" />
            </View>

            {/* Header Title */}
            <View className="flex-row items-center justify-between px-5 pb-3 pt-1 border-b border-slate-100">
              <View className="w-6" />
              <Text className="text-base font-bold text-slate-900">
                Comments
              </Text>
              <TouchableOpacity onPress={handleClose} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            {loading ? (
              <View className="flex-1 items-center justify-center py-10">
                <ActivityIndicator size="small" color="#2563EB" />
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
                  <View className="items-center py-12 px-10">
                    <Ionicons name="chatbubbles-outline" size={42} color="#cbd5e1" />
                    <Text className="text-slate-500 font-medium text-sm mt-3 text-center">
                      No comments yet
                    </Text>
                    <Text className="text-slate-400 text-xs text-center mt-1">
                      Be the first to share what you think!
                    </Text>
                  </View>
                }
              />
            )}

            {/* Replying Banner */}
            {replyingTo && (
              <View className="flex-row items-center justify-between px-4 py-2 bg-slate-100 border-t border-slate-200">
                <Text className="text-xs text-slate-600 font-medium">
                  Replying to <Text className="font-bold text-blue-600">@{replyingTo.username}</Text>
                </Text>
                <TouchableOpacity onPress={cancelReply} activeOpacity={0.7} className="p-1">
                  <Ionicons name="close-circle" size={16} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            )}

            {/* Comment Input Footer */}
            <View className="flex-row items-center gap-3 px-4 py-3 border-t border-slate-100 bg-white">
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                placeholder={
                  replyingTo
                    ? `Reply to @${replyingTo.username}...`
                    : "Add a comment..."
                }
                placeholderTextColor="#94a3b8"
                multiline
                style={styles.textInput}
              />
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={submitting || !text.trim()}
                activeOpacity={0.7}
                style={[
                  styles.postButton,
                  {
                    backgroundColor:
                      submitting || !text.trim() ? "#bfdbfe" : "#2563eb",
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white text-sm font-bold">Post</Text>
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
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  flexContainer: {
    flex: 1,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    maxHeight: 90,
    borderWidth: 1,
    borderColor: "#e2e8f0",
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