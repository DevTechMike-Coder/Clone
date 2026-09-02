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
import { useVideoPlayer, VideoView } from "expo-video";
import { Post, postService } from "@/services/postService";
import { likeService } from "@/services/likeService";
import { bookmarkService } from "@/services/bookmarkService";
import { repostService } from "@/services/repostService";
import { shareService } from "@/services/shareService";
import CommentsModal from "@/components/modal/CommentsModal";
import SoundChip from "@/components/SoundChip";
import { stopAllSounds } from "@/lib/useTrackSound";
import { formatRelativeTime } from "@/lib/dateUtils";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { colors } from "@/constants/theme";

const SafeAreaView = styled(RNSafeAreaView);

function VideoPostMedia({ post }: { post: Post }) {
  const [muted, setMuted] = useState(true);
  const player = useVideoPlayer(post.media_url, (p) => {
    p.loop = true;
    p.muted = true;
  });

  // No cleanup on purpose. `useVideoPlayer` releases the native player on
  // unmount (and whenever the source changes), and that release is registered
  // inside the hook — so React runs it *before* this component's effect
  // cleanups. Calling `player.pause()` here threw
  // "Cannot use shared object that was already released". Releasing the player
  // already stops playback.
  React.useEffect(() => {
    player.play();
  }, [player]);

  React.useEffect(() => {
    // expo-audio/player requires mutating the returned player object.
    // eslint-disable-next-line react-hooks/immutability -- false positive for native player mutations
    player.muted = muted;
  }, [muted, player]);

  return (
    <View className="w-full h-full relative">
      <VideoView
        player={player}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        nativeControls={false}
      />
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setMuted((m) => !m)}
        accessibilityRole="button"
        accessibilityLabel={muted ? "Unmute video" : "Mute video"}
        className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-black/55 items-center justify-center border border-white/25"
      >
        <Ionicons name={muted ? "volume-mute" : "volume-high"} size={18} color="white" />
      </TouchableOpacity>
    </View>
  );
}

function PostDetailMedia({ post }: { post: Post }) {
  if (post.media_type !== "video") {
    return (
      <Image
        source={{ uri: post.media_url }}
        className="w-full h-full"
        resizeMode="cover"
      />
    );
  }

  return <VideoPostMedia post={post} />;
}

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

      // This screen is pushed over the feed rather than replacing it, and both
      // can have a sound going. Losing focus (back to the feed, into comments on
      // another post) has to silence this one.
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
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={colors.slate[900]} />
          </TouchableOpacity>
          <Text className="text-xl font-bold uppercase tracking-tighter text-blue-600">
            Post
          </Text>
        </View>
      </View>

      {/* Keep the already-loaded post (and its video player) mounted while a
          refetch runs, instead of swapping the screen for a spinner. */}
      {loading && !post ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.blue[600]} />
        </View>
      ) : !post ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="alert-circle-outline" size={48} color={colors.slate[300]} />
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
              tintColor={colors.blue[600]}
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
            <PostDetailMedia post={post} />
          </View>

          {/* Attached Sound — also the control that plays it */}
          {(post.has_sound || post.music_track_title || post.music_track_audio_url) && (
            <View className="px-5 py-3 bg-white border-b border-slate-100">
              <SoundChip
                variant="card"
                trackKey={post.id}
                title={post.music_track_title}
                artist={post.music_track_artist}
                audioUrl={post.music_track_audio_url}
                attribution={post.music_track_attribution}
              />
            </View>
          )}

          {/* Action Bar */}
          <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-slate-100">
            <View className="flex-row items-center gap-6">
              {/* Like */}
              <TouchableOpacity
                onPress={handleLike}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={post.is_liked ? "Unlike post" : "Like post"}
                accessibilityState={{ selected: !!post.is_liked }}
                className="flex-row items-center gap-1.5"
              >
                <Image
                  source={require("@/assets/homeIcons/heart.png")}
                  className="h-6 w-6"
                  resizeMode="contain"
                  style={{ tintColor: post.is_liked ? colors.red[500] : colors.slate[900] }}
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
                accessibilityRole="button"
                accessibilityLabel="Open comments"
                className="flex-row items-center gap-1.5"
              >
                <Image
                  source={require("@/assets/homeIcons/bubbleChat.png")}
                  className="h-6 w-6"
                  resizeMode="contain"
                  style={{ tintColor: colors.slate[900] }}
                />
                <Text className="text-sm font-medium text-slate-700">
                  {post.comment_count ?? 0}
                </Text>
              </TouchableOpacity>

              {/* Repost */}
              <TouchableOpacity
                onPress={handleRepost}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={post.is_reposted ? "Remove repost" : "Repost"}
                accessibilityState={{ selected: !!post.is_reposted }}
                className="flex-row items-center gap-1.5"
              >
                <Image
                  source={require("@/assets/homeIcons/repeat.png")}
                  className="h-6 w-6"
                  resizeMode="contain"
                  style={{ tintColor: post.is_reposted ? colors.emerald[500] : colors.slate[900] }}
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
                accessibilityRole="button"
                accessibilityLabel={post.is_bookmarked ? "Remove bookmark" : "Bookmark post"}
                accessibilityState={{ selected: !!post.is_bookmarked }}
                className="p-1"
              >
                <Image
                  source={require("@/assets/homeIcons/bookmark.png")}
                  className="h-6 w-6"
                  resizeMode="contain"
                  style={{ tintColor: post.is_bookmarked ? colors.blue[600] : colors.slate[900] }}
                />
              </TouchableOpacity>

              {/* Share */}
              <TouchableOpacity
                onPress={handleShare}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Share post"
                className="p-1"
              >
                <Image
                  source={require("@/assets/homeIcons/share.png")}
                  className="h-6 w-6"
                  resizeMode="contain"
                  style={{ tintColor: colors.slate[900] }}
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
