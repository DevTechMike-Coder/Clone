import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Post, TaggedUser } from "@/services/postService";
import { Text } from "@/components/ui/Text";
import { PostHeader } from "./PostHeader";
import { PostMedia } from "./PostMedia";
import { PostActions } from "./PostActions";
import { useTheme } from "@/context/ThemeContext";

export interface PostCardProps {
  post: Post;
  isActiveVideo: boolean;
  isActiveSound: boolean;
  onOptionsPress: (post: Post) => void;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onRepost: (postId: string) => void;
  onBookmark: (postId: string) => void;
  onShare: (post: Post) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  isActiveVideo,
  isActiveSound,
  onOptionsPress,
  onLike,
  onComment,
  onRepost,
  onBookmark,
  onShare,
}) => {
  const { palette } = useTheme();

  const taggedList: TaggedUser[] = React.useMemo(() => {
    if (!post.tagged_users) return [];
    if (Array.isArray(post.tagged_users)) return post.tagged_users as TaggedUser[];
    if (typeof post.tagged_users === "string") {
      try {
        const parsed = JSON.parse(post.tagged_users);
        if (Array.isArray(parsed)) return parsed as TaggedUser[];
      } catch {
        return [];
      }
    }
    return [];
  }, [post.tagged_users]);

  return (
    <View style={[styles.card, { backgroundColor: palette.background }]}>
      {/* Header */}
      <PostHeader post={post} onOptionsPress={onOptionsPress} />

      {/* Caption */}
      {post.caption ? (
        <View style={styles.captionContainer}>
          <Text variant="body" style={styles.captionText}>
            {post.caption}
          </Text>
        </View>
      ) : null}

      {/* Tagged People Badge */}
      {taggedList.length > 0 ? (
        <View style={styles.taggedContainer}>
          <View
            style={[
              styles.taggedBadge,
              {
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.borderSubtle,
              },
            ]}
          >
            <Ionicons name="people" size={12} color={palette.accent} />
            <Text variant="micro" color="muted" style={{ marginLeft: 4, marginRight: 2 }}>
              with
            </Text>
            <View style={styles.taggedChipsRow}>
              {taggedList.map((user, idx) => (
                <TouchableOpacity
                  key={user.id || idx}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: "/(pages)/userProfile",
                      params: { userId: user.id },
                    })
                  }
                >
                  <Text variant="micro" color="accent" weight="bold">
                    @{user.username || "user"}
                    {idx < taggedList.length - 1 ? ", " : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ) : null}

      {/* Media with Double-Tap Like */}
      <PostMedia
        post={post}
        isActiveVideo={isActiveVideo}
        isActiveSound={isActiveSound}
        onDoubleTapLike={onLike}
      />

      {/* Actions */}
      <PostActions
        post={post}
        onLike={onLike}
        onComment={onComment}
        onRepost={onRepost}
        onBookmark={onBookmark}
        onShare={onShare}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "100%",
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  captionText: {
    lineHeight: 21,
  },
  taggedContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  taggedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    flexWrap: "wrap",
  },
  taggedChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 3,
  },
});
