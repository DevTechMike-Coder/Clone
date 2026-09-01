import { Post, postService } from "@/services/postService";
import { likeService } from "@/services/likeService";
import { bookmarkService } from "@/services/bookmarkService";
import { repostService } from "@/services/repostService";
import { shareService } from "@/services/shareService";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CommentsModal from "@/components/modal/CommentsModal";
import { formatRelativeTime } from "@/lib/dateUtils";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { router, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  ListRenderItemInfo,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { styled } from "nativewind";

const StyledImage = styled(Image);

const AvatarMedia = ({ uri }: { uri?: string | null }) => {
  const [hasError, setHasError] = useState(false);

  if (!uri || hasError) {
    return (
      <StyledImage
        source={require("@/assets/homeIcons/profileUser.png")}
        className="h-7 w-7"
        contentFit="contain"
      />
    );
  }

  return (
    <StyledImage
      source={{ uri }}
      className="h-full w-full rounded-full"
      contentFit="cover"
      onError={() => setHasError(true)}
    />
  );
};

function FeedVideoMedia({ uri, active }: { uri: string; active: boolean }) {
  const [muted, setMuted] = useState(true);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
  });

  React.useEffect(() => {
    if (active) {
      player.play();
    } else {
      player.pause();
    }
    // No cleanup on purpose. `useVideoPlayer` releases the native player on
    // unmount (and whenever the source changes), and that release is registered
    // inside the hook — so React runs it *before* this component's effect
    // cleanups. Calling `player.pause()` in a cleanup threw
    // "Cannot use shared object that was already released" every time a video
    // scrolled out of the list. Releasing the player already stops playback.
  }, [active, player]);

  React.useEffect(() => {
    // expo-video requires mutating the returned player object.
    // eslint-disable-next-line react-hooks/immutability -- false positive for native player mutations
    player.muted = muted;
  }, [muted, player]);

  return (
    <View className="h-full w-full relative">
      <VideoView
        player={player}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        nativeControls={false}
      />
      {active && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setMuted((m) => !m)}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/50 items-center justify-center border border-white/20"
        >
          <Ionicons name={muted ? "volume-mute" : "volume-high"} size={17} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const FeedMedia = ({ uri, mediaType, active }: { uri: string; mediaType: "video" | "image"; active: boolean }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !uri) {
    return (
      <View className="h-full w-full items-center justify-center bg-slate-100 rounded-xl">
        <Ionicons name="image-outline" size={44} color="#94A3B8" />
        <Text className="text-xs text-slate-400 mt-2 font-medium">Image unavailable</Text>
      </View>
    );
  }

  if (mediaType === "video") {
    return <FeedVideoMedia uri={uri} active={active} />;
  }

  return (
    <StyledImage
      source={{ uri }}
      className="h-full w-full rounded-xl"
      contentFit="cover"
      transition={300}
      onError={() => {
        setHasError(true);
      }}
    />
  );
};



// ─── IndexVideoFeed ───────────────────────────────────────────────────────────

type IndexVideoFeedProps = {
  onOptionsPress: (item: Post) => void;
};

const IndexVideoFeed = ({ onOptionsPress }: IndexVideoFeedProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const listBottomPadding = 70 + Math.max(insets.bottom, 16) + 8;

  // Refs that must be readable inside the fetch callbacks without being
  // dependencies: the scroll position at fetch time, the list handle for
  // jumping back to the top, and the set of post ids the user has already
  // seen in this feed session.
  const listRef = useRef<FlatList<Post>>(null);
  const atTopRef = useRef(true);
  const seenPostIdsRef = useRef<Set<string>>(new Set());
  const unseenPostIdsRef = useRef<string[]>([]);
  const newPostsCountRef = useRef(0);
  const bannerVisibleRef = useRef(false);
  // Stable Animated values for the banner (kept in state so they are never
  // recreated; only the .setValue/.timing mutations below ever touch them).
  const [bannerOpacity] = useState(() => new Animated.Value(0));
  const [bannerTranslateY] = useState(() => new Animated.Value(16));

  const hideNewPostsBanner = useCallback(() => {
    if (!bannerVisibleRef.current) return;
    bannerVisibleRef.current = false;
    Animated.parallel([
      Animated.timing(bannerOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(bannerTranslateY, {
        toValue: 16,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [bannerOpacity, bannerTranslateY]);

  const showNewPostsBanner = useCallback(
    (count: number) => {
      bannerVisibleRef.current = true;
      setNewPostsCount(count);
      Animated.parallel([
        Animated.timing(bannerOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(bannerTranslateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [bannerOpacity, bannerTranslateY],
  );

  const fetchPosts = useCallback(async () => {
    try {
      const data = await postService.getPosts();

      // The user is only shown the newest posts when they are at the top of
      // the list (or on the very first load). Posts fetched while scrolled
      // down get reported through the "new posts" banner instead.
      const isAtTop = atTopRef.current || seenPostIdsRef.current.size === 0;

      const isUnseen = (post: Post) => !seenPostIdsRef.current.has(post.id);
      const firstUnseenIndex = data.findIndex(isUnseen);
      const hasUnseenPosts = firstUnseenIndex !== -1;

      if (isAtTop) {
        // Everything is about to be visible, so every fetched post counts as
        // seen from here on. Wait for the render to commit before clearing
        // the list so the ids cannot be lost in the meantime.
        unseenPostIdsRef.current = hasUnseenPosts
          ? data.slice(firstUnseenIndex).map((post) => post.id)
          : [];
        setPosts(data);
        requestAnimationFrame(() => {
          seenPostIdsRef.current = new Set(data.map((post) => post.id));
          unseenPostIdsRef.current = [];
          newPostsCountRef.current = 0;
          setNewPostsCount(0);
          hideNewPostsBanner();
        });
      } else {
        // firstUnseenIndex is -1 when every fetched post was already seen
        // (nothing new since the last refresh) — guard the slice so it does
        // not accidentally drop the last post (slice(0, -1)).
        const newPosts = hasUnseenPosts ? data.slice(0, firstUnseenIndex) : [];
        const unseenIds = newPosts.map((post) => post.id);

        if (newPosts.length > 0) {
          unseenPostIdsRef.current = unseenIds;
          newPostsCountRef.current = newPosts.length;
          showNewPostsBanner(newPosts.length);
        } else {
          unseenPostIdsRef.current = [];
          newPostsCountRef.current = 0;
          hideNewPostsBanner();
        }

        // Keep the list contents fresh (new like counts, captions, etc.)
        // without disturbing the user's scroll position.
        setPosts(data);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hideNewPostsBanner, showNewPostsBanner]);

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [fetchPosts]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleNewPostsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Bring the unseen posts into view: mark them as seen, dismiss the
    // banner, and jump back to the top of the list where they sit.
    if (unseenPostIdsRef.current.length > 0) {
      unseenPostIdsRef.current.forEach((id) => seenPostIdsRef.current.add(id));
    }
    unseenPostIdsRef.current = [];
    newPostsCountRef.current = 0;
    setNewPostsCount(0);
    hideNewPostsBanner();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const handleScroll = (event: any) => {
    const isAtTop = event.nativeEvent.contentOffset.y <= 0;
    atTopRef.current = isAtTop;

    // Reaching the top puts the unseen posts back in view, so they are no
    // longer "new" — dismiss the banner without a scroll animation.
    if (isAtTop && unseenPostIdsRef.current.length > 0) {
      unseenPostIdsRef.current.forEach((id) => seenPostIdsRef.current.add(id));
      unseenPostIdsRef.current = [];
      newPostsCountRef.current = 0;
      setNewPostsCount(0);
      hideNewPostsBanner();
    }
  };

  const viewabilityConfig = useMemo(
    () => ({ itemVisiblePercentThreshold: 60, minimumViewTime: 300 }),
    [],
  );

  const onViewableItemsChanged = useMemo(
    () =>
      ({ viewableItems }: { viewableItems: any[] }) => {
        // Mark posts as "seen" the moment they actually become visible, so
        // the new-posts banner only counts posts that are still out of view
        // (e.g. the user scrolled up partway and the newest posts slid into
        // the screen — those are no longer new).
        const newlyVisible = viewableItems.filter(
          (view) => view.isViewable && view.item?.id,
        );
        if (newlyVisible.length > 0) {
          let addedSeen = false;
          for (const view of newlyVisible) {
            const id = view.item.id as string;
            if (!seenPostIdsRef.current.has(id)) {
              seenPostIdsRef.current.add(id);
              addedSeen = true;
            }
          }
          if (addedSeen) {
            unseenPostIdsRef.current = unseenPostIdsRef.current.filter(
              (id) => !seenPostIdsRef.current.has(id),
            );
            if (unseenPostIdsRef.current.length === 0) {
              newPostsCountRef.current = 0;
              setNewPostsCount(0);
              hideNewPostsBanner();
            }
          }
        }

        const visiblePost = viewableItems.find(
          (view) => view.isViewable && view.item?.media_type === "video",
        );
        setActiveVideoId(visiblePost?.item?.id ?? null);
      },
    [hideNewPostsBanner],
  );

  const openMenu = (item: Post) => onOptionsPress(item);
  const openComments = (postId: string) => setCommentPostId(postId);
  const closeComments = () => {
    setCommentPostId(null);
    fetchPosts();
  };

  const handleLike = async (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 1. Optimistic Update
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const wasLiked = post.is_liked;
          return {
            ...post,
            is_liked: !wasLiked,
            like_count: (post.like_count ?? 0) + (wasLiked ? -1 : 1),
          };
        }
        return post;
      }),
    );

    try {
      // 2. Background API call
      await likeService.toggleLike(postId);
    } catch (error) {
      console.error("Error toggling like:", error);
      // 3. Rollback on error
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId) {
            const wasLikedNow = post.is_liked;
            return {
              ...post,
              is_liked: !wasLikedNow,
              like_count: (post.like_count ?? 0) + (wasLikedNow ? -1 : 1),
            };
          }
          return post;
        }),
      );
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to update like",
      });
    }
  };

  const handleRepost = async (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // 1. Optimistic Update
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const wasReposted = post.is_reposted;
          return {
            ...post,
            is_reposted: !wasReposted,
            repost_count: (post.repost_count ?? 0) + (wasReposted ? -1 : 1),
          };
        }
        return post;
      }),
    );

    try {
      const res = await repostService.toggleRepost(postId);
      Toast.show({
        type: "success",
        text1: res.reposted ? "Reposted!" : "Removed Repost",
        text2: res.reposted ? "Post shared to your profile." : "Repost removed.",
        visibilityTime: 2000,
      });
    } catch (error: any) {
      console.error("Error toggling repost:", error);
      // Rollback on error
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId) {
            const wasRepostedNow = post.is_reposted;
            return {
              ...post,
              is_reposted: !wasRepostedNow,
              repost_count: (post.repost_count ?? 0) + (wasRepostedNow ? -1 : 1),
            };
          }
          return post;
        }),
      );
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to update repost",
      });
    }
  };

  const handleBookmark = async (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // 1. Optimistic Update
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const wasBookmarked = post.is_bookmarked;
          return {
            ...post,
            is_bookmarked: !wasBookmarked,
          };
        }
        return post;
      }),
    );

    try {
      const res = await bookmarkService.toggleBookmark(postId);
      Toast.show({
        type: "success",
        text1: res.bookmarked ? "Saved!" : "Removed Bookmark",
        text2: res.bookmarked ? "Post saved to your bookmarks." : "Bookmark removed.",
        visibilityTime: 2000,
      });
    } catch (error: any) {
      console.error("Error toggling bookmark:", error);
      // Rollback on error
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              is_bookmarked: !post.is_bookmarked,
            };
          }
          return post;
        }),
      );
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to update bookmark",
      });
    }
  };

  const handleShare = async (post: Post) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await shareService.sharePost(post);
  };

  const renderItem = ({ item }: ListRenderItemInfo<Post>) => (
    <View>
      {/* Header: Avatar and User Info */}
      <View className="flex-row items-center justify-between px-5 mb-3">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: "/(pages)/userProfile", params: { userId: item.user_id } })}
            className="h-10 w-10 items-center justify-center rounded-full border border-slate-200"
          >
            <AvatarMedia uri={item.profiles?.avatar_url} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push({ pathname: "/(pages)/userProfile", params: { userId: item.user_id } })}
          >
            <Text className="text-sm font-bold text-slate-900">
              {item.profiles?.full_name || "Anonymous"}
            </Text>
            <Text className="text-xs text-slate-400">
              @{item.profiles?.username || "user"} • {formatRelativeTime(item.created_at)}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => openMenu(item)}
          className="h-8 w-8 items-center justify-center"
        >
          <StyledImage
            source={require("@/assets/homeIcons/menuV.png")}
            className="h-5 w-5"
            contentFit="contain"
            style={{ tintColor: "#64748b" }}
          />
        </TouchableOpacity>
      </View>

      {/* Caption */}
      {item.caption && (
        <View className="px-5 mb-3">
          <Text className="text-sm leading-5 text-slate-700">
            {item.caption}
          </Text>
        </View>
      )}

      {/* Media: Full Width Image / Video */}
      <View className="relative w-full aspect-square bg-slate-100 overflow-hidden">
        <FeedMedia
          uri={item.media_url}
          mediaType={item.media_type}
          active={item.media_type === "video" && activeVideoId === item.id}
        />

        {/* Attached Sound Tag */}
        {(item.has_sound || item.music_track_title) && (
          <View
            pointerEvents="none"
            className="absolute left-3 bottom-3 flex-row items-center gap-1.5 bg-black/55 px-3 py-1.5 rounded-full border border-white/15"
          >
            <Ionicons name="musical-notes" size={13} color="#38BDF8" />
            <Text className="text-white text-[11px] font-bold" numberOfLines={1}>
              {item.music_track_title || "Original Sound"}
              {item.music_track_artist ? ` • ${item.music_track_artist}` : ""}
            </Text>
          </View>
        )}
      </View>

      {/* Action Bar */}
      <View className="flex-row items-center justify-between px-5 pt-3">
        <View className="flex-row items-center gap-5">
          <TouchableOpacity
            className="flex-row items-center gap-1.5"
            activeOpacity={0.7}
            onPress={() => handleLike(item.id)}
          >
            <StyledImage
              source={require("@/assets/homeIcons/heart.png")}
              className="h-6 w-6"
              contentFit="contain"
              style={{ tintColor: item.is_liked ? "#ef4444" : "#0f172a" }}
            />
            <Text
              className={`text-sm font-medium ${
                item.is_liked ? "text-red-500" : "text-slate-600"
              }`}
            >
              {item.like_count ?? 0}
            </Text>
          </TouchableOpacity>

          {/* Comment button */}
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row items-center gap-1.5"
            onPress={() => openComments(item.id)}
          >
            <StyledImage
              source={require("@/assets/homeIcons/bubbleChat.png")}
              className="h-6 w-6"
              contentFit="contain"
              style={{ tintColor: "#0f172a" }}
            />
            <Text className="text-sm font-medium text-slate-600">
              {item.comment_count ?? 0}
            </Text>
          </TouchableOpacity>

          {/* Repost button */}
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row items-center gap-1.5"
            onPress={() => handleRepost(item.id)}
          >
            <StyledImage
              source={require("@/assets/homeIcons/repeat.png")}
              className="h-6 w-6"
              contentFit="contain"
              style={{ tintColor: item.is_reposted ? "#10b981" : "#0f172a" }}
            />
            <Text
              className={`text-sm font-medium ${
                item.is_reposted ? "text-emerald-600" : "text-slate-600"
              }`}
            >
              {item.repost_count ?? 0}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center gap-3">
          {/* Bookmark button */}
          <TouchableOpacity
            activeOpacity={0.7}
            className="flex-row items-center gap-1.5 p-1"
            onPress={() => handleBookmark(item.id)}
          >
            <StyledImage
              source={require("@/assets/homeIcons/bookmark.png")}
              className="h-6 w-6"
              contentFit="contain"
              style={{ tintColor: item.is_bookmarked ? "#2563eb" : "#0f172a" }}
            />
          </TouchableOpacity>

          {/* Share button */}
          <TouchableOpacity
            activeOpacity={0.7}
            className="p-1"
            onPress={() => handleShare(item)}
          >
            <StyledImage
              source={require("@/assets/homeIcons/share.png")}
              className="h-6 w-6"
              contentFit="contain"
              style={{ tintColor: "#0f172a" }}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View className="flex-1 pt-5">
      <FlatList
        ref={listRef}
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: listBottomPadding }}
        ItemSeparatorComponent={() => <View className="h-5" />}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ bottom: listBottomPadding }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
          />
        }
      />

      {/* New posts banner — appears when a refresh brings in posts the user
          has not seen while the feed was scrolled down. */}
      {newPostsCount > 0 && (
        <Animated.View
          pointerEvents="auto"
          style={{
            position: "absolute",
            top: 8,
            alignSelf: "center",
            opacity: bannerOpacity,
            transform: [{ translateY: bannerTranslateY }],
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleNewPostsPress}
            className="flex-row items-center gap-2 bg-slate-900/90 border border-white/20 px-4 py-2.5 rounded-full shadow-lg"
          >
            <Ionicons name="arrow-up" size={16} color="#fff" />
            <Text className="text-white text-sm font-semibold">
              {newPostsCount} new {newPostsCount === 1 ? "post" : "posts"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Comments Modal — rendered outside FlatList to avoid clipping */}
      {commentPostId && (
        <CommentsModal postId={commentPostId} onClose={closeComments} />
      )}
    </View>
  );
};

export default IndexVideoFeed;
