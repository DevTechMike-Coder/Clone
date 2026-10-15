import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Post } from "@/services/postService";
import { Text, PressableScale } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";

export interface PostActionsProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onRepost: (postId: string) => void;
  onBookmark: (postId: string) => void;
  onShare: (post: Post) => void;
}

export const PostActions: React.FC<PostActionsProps> = ({
  post,
  onLike,
  onComment,
  onRepost,
  onBookmark,
  onShare,
}) => {
  const { palette } = useTheme();

  const isLiked = Boolean(post.is_liked);
  const isReposted = Boolean(post.is_reposted);
  const isBookmarked = Boolean(post.is_bookmarked);

  return (
    <View style={styles.container}>
      <View style={styles.leftActions}>
        {/* Like Button */}
        <PressableScale
          onPress={() => onLike(post.id)}
          accessibilityRole="button"
          accessibilityLabel={isLiked ? "Unlike post" : "Like post"}
          accessibilityState={{ selected: isLiked }}
          style={styles.actionItem}
        >
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={24}
            color={isLiked ? palette.like : palette.text}
          />
          <Text
            variant="caption"
            weight="semibold"
            style={[
              styles.countText,
              { color: isLiked ? palette.like : palette.muted },
            ]}
          >
            {post.like_count ?? 0}
          </Text>
        </PressableScale>

        {/* Comment Button */}
        <PressableScale
          onPress={() => onComment(post.id)}
          accessibilityRole="button"
          accessibilityLabel="Open comments"
          style={styles.actionItem}
        >
          <Ionicons
            name="chatbubble-outline"
            size={23}
            color={palette.text}
          />
          <Text
            variant="caption"
            weight="semibold"
            color="muted"
            style={styles.countText}
          >
            {post.comment_count ?? 0}
          </Text>
        </PressableScale>

        {/* Repost Button */}
        <PressableScale
          onPress={() => onRepost(post.id)}
          accessibilityRole="button"
          accessibilityLabel={isReposted ? "Remove repost" : "Repost"}
          accessibilityState={{ selected: isReposted }}
          style={styles.actionItem}
        >
          <Ionicons
            name={isReposted ? "repeat" : "repeat-outline"}
            size={24}
            color={isReposted ? palette.repost : palette.text}
          />
          <Text
            variant="caption"
            weight="semibold"
            style={[
              styles.countText,
              { color: isReposted ? palette.repost : palette.muted },
            ]}
          >
            {post.repost_count ?? 0}
          </Text>
        </PressableScale>
      </View>

      <View style={styles.rightActions}>
        {/* Bookmark Button */}
        <PressableScale
          onPress={() => onBookmark(post.id)}
          accessibilityRole="button"
          accessibilityLabel={isBookmarked ? "Remove bookmark" : "Bookmark post"}
          accessibilityState={{ selected: isBookmarked }}
          style={styles.iconHitArea}
        >
          <Ionicons
            name={isBookmarked ? "bookmark" : "bookmark-outline"}
            size={23}
            color={isBookmarked ? palette.accent : palette.text}
          />
        </PressableScale>

        {/* Share Button */}
        <PressableScale
          onPress={() => onShare(post)}
          accessibilityRole="button"
          accessibilityLabel="Share post"
          style={styles.iconHitArea}
        >
          <Ionicons
            name="paper-plane-outline"
            size={23}
            color={palette.text}
          />
        </PressableScale>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  leftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    minHeight: 40,
  },
  countText: {
    marginLeft: 6,
  },
  iconHitArea: {
    padding: 6,
    minWidth: 40,
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
