import React from "react";
import { StyleSheet, View } from "react-native";
import { Post } from "@/services/postService";
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
});
