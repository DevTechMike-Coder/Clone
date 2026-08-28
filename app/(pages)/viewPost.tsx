import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useCallback, useState } from "react";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Post, postService } from "@/services/postService";
import { likeService } from "@/services/likeService";
import { bookmarkService } from "@/services/bookmarkService";
import { repostService } from "@/services/repostService";
import { shareService } from "@/services/shareService";
import CommentsModal from "@/components/modal/CommentsModal";
import { formatRelativeTime } from "@/lib/dateUtils";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";

const SafeAreaView = styled(RNSafeAreaView);

export default function ViewPost() {
  const { postId } = useLocalSearchParams<{ postId: string }>();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const fetchPost = useCallback(async () => {
    if (!postId) return;
    try {
      setLoading(true);
      const data = await postService.getPostById(postId);
      setPost(data);
    } catch (error) {
      console.error("Error fetching post details:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [postId]);

  useFocusEffect(
    useCallback(() => {
      fetchPost();
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
    } catch (error) {
      // Rollback
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
        visibilityTime: 1800,
      });
    } catch (error: any) {
      // Rollback
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
        text2: error.message || "Failed to update repost",
      });
    }
  };

  const handleBookmark = async () => {
    if (!post) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const wasBookmarked = post.is_bookmarked;
    setPost((prev) =>
      prev
        ? {
            ...prev,
            is_bookmarked: !wasBookmarked,
          }
        : null
    );

    try {
      const res = await bookmarkService.toggleBookmark(post.id);
      Toast.show({
        type: "success",
        text1: res.bookmarked ? "Saved!" : "Removed Bookmark",
        text2: res.bookmarked ? "Post saved to your bookmarks." : "Bookmark removed.",
        visibilityTime: 1800,
      });
    } catch (error: any) {
      // Rollback
      setPost((prev) =>
        prev
          ? {
              ...prev,
              is_bookmarked: wasBookmarked,
            }
          : null
      );
    }
  };

  const handleShare = async () => {
    if (!post) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await shareService.sharePost(post);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100 bg-white">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-xl font-bold uppercase tracking-tighter text-blue-600">
            Post
          </Text>
        </View>
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : !post ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="alert-circle-outline" size={48} color="#CBD5E1" />
          <Text className="text-lg font-bold text-slate-900 mt-4">
            Post not found
          </Text>
          <Text className="text-slate-500 text-center mt-2">
            This post may have been removed or is unavailable.
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2563EB"
            />
          }
        >
          {/* Author Header */}
          <View className="flex-row items-center justify-between px-5 py-4 bg-white">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                router.push({
                  pathname: "/(pages)/userProfile",
                  params: { userId: post.user_id },
                })
              }
              className="flex-row items-center gap-3"
            >
              <View className="h-11 w-11 rounded-full overflow-hidden bg-slate-100 items-center justify-center border border-slate-200">
                {post.profiles?.avatar_url ? (
                  <Image
                    source={{ uri: post.profiles.avatar_url }}
                    className="h-full w-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Image
                    source={require("@/assets/homeIcons/profileUser.png")}
                    className="h-7 w-7"
                    resizeMode="contain"
                  />
                )}
              </View>

              <View>
                <Text className="text-base font-bold text-slate-900 leading-tight">
                  {post.profiles?.full_name || post.profiles?.username || "User"}
                </Text>
                <Text className="text-xs text-slate-400 mt-0.5">
                  @{post.profiles?.username || "user"} • {formatRelativeTime(post.created_at)}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Caption */}
          {post.caption ? (
            <View className="px-5 pb-3 bg-white">
              <Text className="text-sm leading-5 text-slate-800">
                {post.caption}
              </Text>
            </View>
          ) : null}

          {/* Media Full Aspect */}
          <View className="w-full aspect-square bg-slate-100 overflow-hidden">
            <Image
              source={{ uri: post.media_url }}
              className="w-full h-full"
              resizeMode="cover"
            />
          </View>

          {/* Action Bar */}
          <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-slate-100">
            <View className="flex-row items-center gap-6">
              {/* Like */}
              <TouchableOpacity
                onPress={handleLike}
                activeOpacity={0.7}
                className="flex-row items-center gap-1.5"
              >
                <Image
                  source={require("@/assets/homeIcons/heart.png")}
                  className="h-6 w-6"
                  resizeMode="contain"
                  style={{ tintColor: post.is_liked ? "#ef4444" : "#0f172a" }}
                />
                <Text
                  className={`text-sm font-medium ${
                    post.is_liked ? "text-red-500" : "text-slate-700"
                  }`}
                >
                  {post.like_count ?? 0}
                </Text>
              </TouchableOpacity>

              {/* Comment */}
              <TouchableOpacity
                onPress={() => setShowComments(true)}
                activeOpacity={0.7}
                className="flex-row items-center gap-1.5"
              >
                <Image
                  source={require("@/assets/homeIcons/bubbleChat.png")}
                  className="h-6 w-6"
                  resizeMode="contain"
                  style={{ tintColor: "#0f172a" }}
                />
                <Text className="text-sm font-medium text-slate-700">
                  {post.comment_count ?? 0}
                </Text>
              </TouchableOpacity>

              {/* Repost */}
              <TouchableOpacity
                onPress={handleRepost}
                activeOpacity={0.7}
                className="flex-row items-center gap-1.5"
              >
                <Image
                  source={require("@/assets/homeIcons/repeat.png")}
                  className="h-6 w-6"
                  resizeMode="contain"
                  style={{ tintColor: post.is_reposted ? "#10b981" : "#0f172a" }}
                />
                <Text
                  className={`text-sm font-medium ${
                    post.is_reposted ? "text-emerald-600" : "text-slate-700"
                  }`}
                >
                  {post.repost_count ?? 0}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center gap-4">
              {/* Bookmark */}
              <TouchableOpacity
                onPress={handleBookmark}
                activeOpacity={0.7}
                className="p-1"
              >
                <Image
                  source={require("@/assets/homeIcons/bookmark.png")}
                  className="h-6 w-6"
                  resizeMode="contain"
                  style={{ tintColor: post.is_bookmarked ? "#2563eb" : "#0f172a" }}
                />
              </TouchableOpacity>

              {/* Share */}
              <TouchableOpacity
                onPress={handleShare}
                activeOpacity={0.7}
                className="p-1"
              >
                <Image
                  source={require("@/assets/homeIcons/share.png")}
                  className="h-6 w-6"
                  resizeMode="contain"
                  style={{ tintColor: "#0f172a" }}
                />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Comments Modal */}
      {showComments && post && (
        <CommentsModal
          postId={post.id}
          onClose={() => {
            setShowComments(false);
            fetchPost();
          }}
        />
      )}
    </SafeAreaView>
  );
}
