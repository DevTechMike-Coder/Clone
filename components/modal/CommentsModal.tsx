import { Comment, commentService } from "@/services/commentService";
import { formatRelativeTime } from "@/lib/dateUtils";
import { Image } from "expo-image";
import { styled } from "nativewind";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItemInfo,
  Modal,
  Platform,
  Pressable,
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

const CommentsModal = ({ postId, onClose }: CommentsModalProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
    commentService
      .getComments(postId)
      .then(setComments)
      .finally(() => setLoading(false));
  }, [postId]);

  const handleClose = () => {
    // Slide down animation before closing
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(onClose);
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const newComment = await commentService.addComment(postId, text.trim());
      setComments((prev) => [newComment, ...prev]);
      setText("");
    } catch (error) {
      console.error("Failed to post comment:", error);
      // Maybe show an alert here
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal transparent animationType="none" onRequestClose={handleClose}>
      {/* Backdrop */}
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}
        onPress={handleClose}
      />

      {/* Sheet */}
      <Animated.View
        style={[
          {
            transform: [{ translateY: slideAnim }],
            height: SCREEN_HEIGHT * 0.7, // Increased height slightly for better view
          },
          {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          {/* Handle */}
          <View className="items-center pt-3 pb-2">
            <View className="h-1.5 w-12 rounded-full bg-slate-200" />
          </View>

          {/* Title */}
          <Text className="text-center text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
            Comments
          </Text>

          {/* List or Loading */}
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="small" color="#2563EB" />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              contentContainerStyle={{ padding: 20, gap: 16 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }: ListRenderItemInfo<Comment>) => (
                <View className="flex-row gap-3">
                  <View className="h-9 w-9 rounded-full bg-slate-100 overflow-hidden items-center justify-center border border-slate-200">
                    {item.profiles?.avatar_url ? (
                      <StyledImage
                        source={{ uri: item.profiles.avatar_url }}
                        className="h-full w-full"
                        contentFit="cover"
                      />
                    ) : (
                      <StyledImage
                        source={require("@/assets/homeIcons/profileUser.png")}
                        className="h-5 w-5"
                        contentFit="contain"
                        style={{ tintColor: "#94a3b8" }}
                      />
                    )}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-bold text-slate-900">
                        {item.profiles?.full_name ?? "user"}
                      </Text>
                      <Text className="text-[10px] text-slate-400">
                        {formatRelativeTime(item.created_at)}
                      </Text>
                    </View>
                    <Text className="text-sm text-slate-700 mt-1 leading-5">
                      {item.content}
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View className="items-center mt-12 px-10">
                  <Text className="text-slate-400 text-sm text-center">
                    No comments yet. Be the first to share what you think!
                  </Text>
                </View>
              }
            />
          )}

          {/* Input Area */}
          <View className="flex-row items-center gap-3 px-4 py-4 border-t border-slate-100 bg-white">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Add a comment..."
              placeholderTextColor="#94a3b8"
              multiline
              style={{
                flex: 1,
                backgroundColor: "#f8fafc",
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 10,
                fontSize: 14,
                color: "#0f172a",
                maxHeight: 100,
                borderWidth: 1,
                borderColor: "#f1f5f9",
              }}
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || !text.trim()}
              activeOpacity={0.7}
              style={{
                backgroundColor:
                  submitting || !text.trim() ? "#bfdbfe" : "#2563eb",
                borderRadius: 20,
                paddingHorizontal: 18,
                paddingVertical: 10,
              }}
            >
              <Text className="text-white text-sm font-bold">
                {submitting ? "..." : "Post"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

export default CommentsModal;