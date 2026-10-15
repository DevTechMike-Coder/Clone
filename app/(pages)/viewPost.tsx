import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Post, postService } from "@/services/postService";
import { likeService } from "@/services/likeService";
import { bookmarkService } from "@/services/bookmarkService";
import { repostService } from "@/services/repostService";
import { shareService } from "@/services/shareService";
import CommentsModal from "@/components/modal/CommentsModal";
import { stopAllSounds } from "@/lib/useTrackSound";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { useTheme } from "@/context/ThemeContext";
import { Screen, ScreenHeader, EmptyState, Skeleton } from "@/components/ui";
import { PostCard } from "@/components/feed/PostCard";
import { Ionicons } from "@expo/vector-icons";

export default function ViewPostScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { palette } = useTheme();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const fetchPost = useCallback(async () => {
    if (!id) return;
    try {
      const data = await postService.getPostById(id);
      setPost(data);
    } catch (err) {
      console.error("Error fetching single post:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchPost();
      return () => stopAllSounds();
    }, [fetchPost])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPost();
  };

  const handleLike = async () => {
    if (!post) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const wasLiked = post.is_liked;
    setPost((prev) =>
      prev
        ? {
            ...prev,
            is_liked: !wasLiked,
            like_count: (prev.like_count ?? 0) + (wasLiked ? -1 : 1),
          }
        : null
    );

    try {
      await likeService.toggleLike(post.id);
    } catch {
      setPost((prev) =>
        prev
          ? {
              ...prev,
              is_liked: wasLiked,
              like_count: (prev.like_count ?? 0) + (wasLiked ? 1 : -1),
            }
          : null
      );
    }
  };

  const handleRepost = async () => {
    if (!post) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const wasReposted = post.is_reposted;
    setPost((prev) =>
      prev
        ? {
            ...prev,
            is_reposted: !wasReposted,
            repost_count: (prev.repost_count ?? 0) + (wasReposted ? -1 : 1),
          }
        : null
    );

    try {
      const res = await repostService.toggleRepost(post.id);
      Toast.show({
        type: "success",
        text1: res.reposted ? "Reposted!" : "Removed Repost",
        text2: res.reposted ? "Post shared to your profile." : "Repost removed.",
      });
    } catch (err: any) {
      setPost((prev) =>
        prev
          ? {
              ...prev,
              is_reposted: wasReposted,
              repost_count: (prev.repost_count ?? 0) + (wasReposted ? 1 : -1),
            }
          : null
      );
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.message || "Failed to update repost",
      });
    }
  };

  const handleBookmark = async () => {
    if (!post) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const wasBookmarked = post.is_bookmarked;
    setPost((prev) =>
      prev ? { ...prev, is_bookmarked: !wasBookmarked } : null
    );

    try {
      const res = await bookmarkService.toggleBookmark(post.id);
      Toast.show({
        type: "success",
        text1: res.bookmarked ? "Saved!" : "Removed Bookmark",
        text2: res.bookmarked ? "Post saved to your bookmarks." : "Bookmark removed.",
      });
    } catch (err: any) {
      setPost((prev) =>
        prev ? { ...prev, is_bookmarked: wasBookmarked } : null
      );
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.message || "Failed to update bookmark",
      });
    }
  };

  const handleShare = async (p: Post) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await shareService.sharePost(p);
  };

  return (
    <Screen edges={["top", "bottom"]}>
      <ScreenHeader title="Post" />

      {loading && !post ? (
        <View style={styles.loadingContainer}>
          <Skeleton.PostCard />
        </View>
      ) : !post ? (
        <EmptyState
          icon={<Ionicons name="alert-circle-outline" size={40} color={palette.muted} />}
          title="Post Not Found"
          description="This post may have been removed or is currently unavailable."
          actionTitle="Back to Feed"
          onActionPress={() => router.back()}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.accent}
            />
          }
        >
          <PostCard
            post={post}
            isActiveVideo={post.media_type === "video"}
            isActiveSound={true}
            onOptionsPress={() => {}}
            onLike={handleLike}
            onComment={() => setShowComments(true)}
            onRepost={handleRepost}
            onBookmark={handleBookmark}
            onShare={handleShare}
          />
        </ScrollView>
      )}

      {showComments && post && (
        <CommentsModal
          postId={post.id}
          onClose={() => {
            setShowComments(false);
            fetchPost();
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingTop: 12,
  },
  scrollContent: {
    paddingBottom: 32,
  },
});
