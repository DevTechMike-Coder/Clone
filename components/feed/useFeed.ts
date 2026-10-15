import { useState, useRef, useCallback } from "react";
import { Animated } from "react-native";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import { Post, postService } from "@/services/postService";
import { likeService } from "@/services/likeService";
import { repostService } from "@/services/repostService";
import { bookmarkService } from "@/services/bookmarkService";

const PAGE_SIZE = 20;

export function useFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [newPostsCount, setNewPostsCount] = useState(0);

  const atTopRef = useRef(true);
  const seenPostIdsRef = useRef<Set<string>>(new Set());
  const unseenPostIdsRef = useRef<string[]>([]);
  const pageRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const bannerVisibleRef = useRef(false);

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
    [bannerOpacity, bannerTranslateY]
  );

  const fetchPosts = useCallback(async () => {
    try {
      pageRef.current = 0;
      const data = await postService.getPosts({ limit: PAGE_SIZE, offset: 0 });
      setHasMorePosts(data.length === PAGE_SIZE);

      const isAtTop = atTopRef.current || seenPostIdsRef.current.size === 0;
      const isUnseen = (post: Post) => !seenPostIdsRef.current.has(post.id);
      const firstUnseenIndex = data.findIndex(isUnseen);
      const hasUnseenPosts = firstUnseenIndex !== -1;

      if (isAtTop) {
        unseenPostIdsRef.current = hasUnseenPosts
          ? data.slice(firstUnseenIndex).map((p) => p.id)
          : [];
        setPosts(data);
        requestAnimationFrame(() => {
          seenPostIdsRef.current = new Set(data.map((p) => p.id));
          unseenPostIdsRef.current = [];
          setNewPostsCount(0);
          hideNewPostsBanner();
        });
      } else {
        const newPosts = hasUnseenPosts ? data.slice(0, firstUnseenIndex) : [];
        if (newPosts.length > 0) {
          unseenPostIdsRef.current = newPosts.map((p) => p.id);
          showNewPostsBanner(newPosts.length);
        } else {
          unseenPostIdsRef.current = [];
          setNewPostsCount(0);
          hideNewPostsBanner();
        }
        setPosts(data);
      }
    } catch (error) {
      console.error("Error fetching feed posts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hideNewPostsBanner, showNewPostsBanner]);

  const loadMorePosts = useCallback(async () => {
    if (loadingMoreRef.current || !hasMorePosts) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    const nextOffset = (pageRef.current + 1) * PAGE_SIZE;
    try {
      const data = await postService.getPosts({ limit: PAGE_SIZE, offset: nextOffset });
      setHasMorePosts(data.length === PAGE_SIZE);

      if (data.length > 0) {
        pageRef.current += 1;
        setPosts((prev) => {
          const existing = new Set(prev.map((p) => p.id));
          const fresh = data.filter((p) => !existing.has(p.id));
          return [...prev, ...fresh];
        });
        data.forEach((p) => seenPostIdsRef.current.add(p.id));
      }
    } catch (error) {
      console.error("Error loading more feed posts:", error);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMorePosts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts();
  }, [fetchPosts]);

  const handleLike = useCallback(async (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Optimistic toggle
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const wasLiked = p.is_liked;
          return {
            ...p,
            is_liked: !wasLiked,
            like_count: (p.like_count ?? 0) + (wasLiked ? -1 : 1),
          };
        }
        return p;
      })
    );

    try {
      await likeService.toggleLike(postId);
    } catch (err) {
      console.error("Error toggling like:", err);
      // Rollback
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const wasLiked = p.is_liked;
            return {
              ...p,
              is_liked: !wasLiked,
              like_count: (p.like_count ?? 0) + (wasLiked ? -1 : 1),
            };
          }
          return p;
        })
      );
      Toast.show({ type: "error", text1: "Error", text2: "Failed to update like" });
    }
  }, []);

  const handleRepost = useCallback(async (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const wasReposted = p.is_reposted;
          return {
            ...p,
            is_reposted: !wasReposted,
            repost_count: (p.repost_count ?? 0) + (wasReposted ? -1 : 1),
          };
        }
        return p;
      })
    );

    try {
      const res = await repostService.toggleRepost(postId);
      Toast.show({
        type: "success",
        text1: res.reposted ? "Reposted!" : "Removed Repost",
        text2: res.reposted ? "Post shared to your profile." : "Repost removed.",
      });
    } catch (err: any) {
      console.error("Error toggling repost:", err);
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            const wasReposted = p.is_reposted;
            return {
              ...p,
              is_reposted: !wasReposted,
              repost_count: (p.repost_count ?? 0) + (wasReposted ? -1 : 1),
            };
          }
          return p;
        })
      );
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.message || "Failed to update repost",
      });
    }
  }, []);

  const handleBookmark = useCallback(async (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            is_bookmarked: !p.is_bookmarked,
          };
        }
        return p;
      })
    );

    try {
      const res = await bookmarkService.toggleBookmark(postId);
      Toast.show({
        type: "success",
        text1: res.bookmarked ? "Saved!" : "Removed Bookmark",
        text2: res.bookmarked ? "Post saved to your bookmarks." : "Bookmark removed.",
      });
    } catch (err: any) {
      console.error("Error toggling bookmark:", err);
      setPosts((prev) =>
        prev.map((p) => {
          if (p.id === postId) {
            return {
              ...p,
              is_bookmarked: !p.is_bookmarked,
            };
          }
          return p;
        })
      );
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.message || "Failed to update bookmark",
      });
    }
  }, []);

  return {
    posts,
    loading,
    refreshing,
    loadingMore,
    hasMorePosts,
    newPostsCount,
    bannerOpacity,
    bannerTranslateY,
    atTopRef,
    seenPostIdsRef,
    unseenPostIdsRef,
    fetchPosts,
    loadMorePosts,
    onRefresh,
    handleLike,
    handleRepost,
    handleBookmark,
    hideNewPostsBanner,
    setNewPostsCount,
  };
}
