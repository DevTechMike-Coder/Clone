import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Post } from "@/services/postService";
import { Avatar, Text, IconButton } from "@/components/ui";
import { formatRelativeTime } from "@/lib/dateUtils";
import { useTheme } from "@/context/ThemeContext";

export interface PostHeaderProps {
  post: Post;
  onOptionsPress: (post: Post) => void;
}

export const PostHeader: React.FC<PostHeaderProps> = ({
  post,
  onOptionsPress,
}) => {
  const { palette } = useTheme();

  const handleProfilePress = () => {
    router.push({
      pathname: "/(pages)/userProfile",
      params: { userId: post.user_id },
    });
  };

  const displayName = post.profiles?.full_name || post.profiles?.username || "User";
  const username = post.profiles?.username || "user";
  const timeAgo = formatRelativeTime(post.created_at);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleProfilePress}
        style={styles.profileRow}
        accessibilityRole="button"
        accessibilityLabel={`View profile of ${displayName}`}
      >
        <Avatar
          url={post.profiles?.avatar_url}
          name={displayName}
          size="sm"
        />

        <View style={styles.textContainer}>
          <View style={styles.authorRow}>
            <Text variant="body" weight="semibold" numberOfLines={1} style={styles.displayNameText}>
              {displayName}
            </Text>
            <Text variant="caption" color="muted" numberOfLines={1} style={styles.timeDotText}>
              • {timeAgo}
            </Text>
          </View>

          {post.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-sharp" size={12} color={palette.accent} />
              <Text variant="caption" weight="medium" numberOfLines={1} style={styles.locationText}>
                {post.location}
              </Text>
            </View>
          ) : (
            <Text variant="caption" color="muted" numberOfLines={1}>
              @{username}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <IconButton
        icon={<Ionicons name="ellipsis-horizontal" size={20} color={palette.muted} />}
        accessibilityLabel="More post options"
        onPress={() => onOptionsPress(post)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  textContainer: {
    marginLeft: 10,
    flex: 1,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  displayNameText: {
    maxWidth: 200,
  },
  timeDotText: {
    marginLeft: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 1,
  },
  locationText: {
    marginLeft: 3,
  },
});
