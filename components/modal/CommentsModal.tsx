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
import * as Haptics from "expo-haptics";
import { useTheme } from "@/context/ThemeContext";
import {
  Avatar,
  EmptyState,
  IconButton,
  PressableScale,
  Skeleton,
  Text,
} from "@/components/ui";

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
    Haptics.selectionAsync();
    setReplyingTo({ commentId, username });
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    Haptics.selectionAsync();
    setReplyingTo(null);
  };

  const toggleReplies = (commentId: string) => {
    Haptics.selectionAsync();
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const toggleLikeComment = (commentId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLikedComments((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      <View style={styles.commentItemWrapper}>
        {/* Main Comment Row */}
        <View style={styles.commentMainRow}>
          {/* Avatar (clickable) */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleUserPress(item.user_id)}
            style={styles.avatarTouchable}
          >
            <Avatar
              url={item.profiles?.avatar_url}
              name={username}
              size={36}
            />
          </TouchableOpacity>

          {/* Comment Content & Metadata */}
          <View style={styles.commentContentCol}>
            <View style={styles.metaRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleUserPress(item.user_id)}
              >
                <Text
                  variant="bodyMedium"
                  weight="semibold"
                >
                  {username}
                </Text>
              </TouchableOpacity>
              <Text variant="micro" color="muted">
                {formatRelativeTime(item.created_at)}
              </Text>
            </View>

            <Text
              variant="body"
              style={styles.commentBodyText}
            >
              {item.content}
            </Text>

            {/* Action Bar: Reply Button */}
            <View style={styles.actionBarRow}>
              <TouchableOpacity
                onPress={() => handleReplyPress(item.id, username)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text variant="caption" weight="semibold" color="muted">
                  Reply
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Like Heart Button */}
          <PressableScale
            onPress={() => toggleLikeComment(item.id)}
            style={styles.likeButton}
            accessibilityRole="button"
            accessibilityLabel={isLiked ? "Unlike comment" : "Like comment"}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={18}
              color={isLiked ? palette.like : palette.muted}
            />
          </PressableScale>
        </View>

        {/* Threaded Replies */}
        {hasReplies && (
          <View style={styles.threadedRepliesContainer}>
            {/* Render Nested Replies FIRST when expanded */}
            {isExpanded && (
              <View
                style={[
                  styles.expandedRepliesBox,
                  { borderColor: palette.borderSubtle },
                ]}
              >
                {item.replies!.map((reply) => {
                  const replyUsername =
                    reply.profiles?.username || reply.profiles?.full_name || "user";
                  const isReplyLiked = !!likedComments[reply.id];

                  return (
                    <View key={reply.id} style={styles.replyRow}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => handleUserPress(reply.user_id)}
                        style={styles.avatarTouchable}
                      >
                        <Avatar
                          url={reply.profiles?.avatar_url}
                          name={replyUsername}
                          size={28}
                        />
                      </TouchableOpacity>

                      <View style={styles.replyContentCol}>
                        <View style={styles.replyMetaRow}>
                          <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => handleUserPress(reply.user_id)}
                          >
                            <Text
                              variant="caption"
                              weight="semibold"
                            >
                              {replyUsername}
                            </Text>
                          </TouchableOpacity>
                          <Text
                            variant="micro"
                            color="muted"
                          >
                            {formatRelativeTime(reply.created_at)}
                          </Text>
                        </View>

                        <Text
                          variant="caption"
                          style={styles.replyBodyText}
                        >
                          {reply.content}
                        </Text>

                        <View style={styles.replyActionBar}>
                          <TouchableOpacity
                            onPress={() => handleReplyPress(item.id, replyUsername)}
                            activeOpacity={0.7}
                          >
                            <Text variant="micro" weight="semibold" color="muted">
                              Reply
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <PressableScale
                        onPress={() => toggleLikeComment(reply.id)}
                        style={styles.replyLikeButton}
                        accessibilityRole="button"
                        accessibilityLabel={isReplyLiked ? "Unlike reply" : "Like reply"}
                      >
                        <Ionicons
                          name={isReplyLiked ? "heart" : "heart-outline"}
                          size={15}
                          color={isReplyLiked ? palette.like : palette.muted}
                        />
                      </PressableScale>
                    </View>
                  );
                })}
              </View>
            )}

            {/* View / Hide Replies Toggle Button */}
            <TouchableOpacity
              onPress={() => toggleReplies(item.id)}
              activeOpacity={0.7}
              style={styles.toggleRepliesButton}
            >
              <View style={[styles.toggleRepliesLine, { backgroundColor: palette.border }]} />
              <Text variant="caption" weight="semibold" color="muted">
                {isExpanded
                  ? "Hide replies"
                  : `View ${item.replies!.length} ${
                      item.replies!.length === 1 ? "reply" : "replies"
                    }`}
              </Text>
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={14}
                color={palette.muted}
              />
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
          <View style={[styles.backdrop, { backgroundColor: palette.overlay }]} />
        </Pressable>

        {/* Animated Sheet */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
              transform: [{ translateY: slideAnim }],
              height: dynamicSheetHeight,
              marginBottom: keyboardHeight,
            },
          ]}
        >
          <View style={styles.flexContainer}>
            {/* Header Handle */}
            <View style={styles.handleContainer}>
              <View
                style={[
                  styles.handleBar,
                  { backgroundColor: palette.borderSubtle },
                ]}
              />
            </View>

            {/* Header Title */}
            <View
              style={[
                styles.headerRow,
                { borderBottomColor: palette.borderSubtle },
              ]}
            >
              <View style={styles.headerSpacer} />
              <Text variant="headline" weight="bold">
                Comments
              </Text>
              <IconButton
                icon={<Ionicons name="close" size={20} color={palette.muted} />}
                onPress={handleClose}
                accessibilityLabel="Close comments"
                size="sm"
              />
            </View>

            {/* Comments List / Skeleton Shimmer */}
            {loading ? (
              <View style={styles.skeletonList}>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton.Row key={i} style={styles.skeletonRow} />
                ))}
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c) => c.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                renderItem={renderCommentItem}
                ListEmptyComponent={
                  <EmptyState
                    icon={
                      <Ionicons
                        name="chatbubbles-outline"
                        size={44}
                        color={palette.muted}
                      />
                    }
                    title="No comments yet"
                    description="Be the first to share what you think!"
                  />
                }
              />
            )}

            {/* Replying Banner */}
            {replyingTo && (
              <View
                style={[
                  styles.replyingBanner,
                  {
                    backgroundColor: palette.surfaceElevated,
                    borderColor: palette.borderSubtle,
                  },
                ]}
              >
                <View style={styles.replyingTextRow}>
                  <Ionicons name="return-down-forward" size={16} color={palette.accent} />
                  <Text variant="caption" color="muted">
                    Replying to{" "}
                    <Text variant="caption" weight="bold" color="accent">
                      @{replyingTo.username}
                    </Text>
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={cancelReply}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel reply"
                  style={styles.cancelReplyBtn}
                >
                  <Ionicons name="close-circle" size={18} color={palette.muted} />
                </TouchableOpacity>
              </View>
            )}

            {/* Comment Input Footer */}
            <View
              style={[
                styles.inputFooter,
                {
                  backgroundColor: palette.surface,
                  borderTopColor: palette.borderSubtle,
                },
              ]}
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
                    backgroundColor: palette.background,
                    color: palette.text,
                    borderColor: palette.border,
                  },
                ]}
              />
              <PressableScale
                onPress={handleSubmit}
                disabled={submitting || !text.trim()}
                style={[
                  styles.postButton,
                  {
                    backgroundColor:
                      submitting || !text.trim()
                        ? palette.surfaceElevated
                        : palette.accent,
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
                      color:
                        submitting || !text.trim()
                          ? palette.muted
                          : palette.onAccent,
                    }}
                  >
                    Post
                  </Text>
                )}
              </PressableScale>
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
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    overflow: "hidden",
  },
  flexContainer: {
    flex: 1,
  },
  handleContainer: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  handleBar: {
    height: 5,
    width: 44,
    borderRadius: 2.5,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSpacer: {
    width: 32,
  },
  skeletonList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
    flex: 1,
  },
  skeletonRow: {
    marginVertical: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  commentItemWrapper: {
    marginBottom: 16,
  },
  commentMainRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  avatarTouchable: {
    marginTop: 2,
  },
  commentContentCol: {
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentBodyText: {
    marginTop: 4,
    lineHeight: 20,
  },
  actionBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 8,
  },
  likeButton: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  threadedRepliesContainer: {
    paddingLeft: 48,
    marginTop: 8,
  },
  expandedRepliesBox: {
    marginBottom: 8,
    gap: 12,
    paddingLeft: 10,
    borderLeftWidth: 1.5,
  },
  replyRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  replyContentCol: {
    flex: 1,
  },
  replyMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  replyBodyText: {
    marginTop: 2,
    lineHeight: 16,
  },
  replyActionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  replyLikeButton: {
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleRepliesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  toggleRepliesLine: {
    width: 24,
    height: 1,
  },
  replyingBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replyingTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cancelReplyBtn: {
    padding: 4,
  },
  inputFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  textInput: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 90,
    borderWidth: 1,
  },
  postButton: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 64,
  },
});

export default CommentsModal;