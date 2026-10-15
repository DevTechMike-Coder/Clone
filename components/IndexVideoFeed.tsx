import React, { useState, useRef, useMemo, useCallback } from "react";
import {
  FlatList,
  ListRenderItemInfo,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Post } from "@/services/postService";
import { shareService } from "@/services/shareService";
import { stopAllSounds } from "@/lib/useTrackSound";
import StoriesBar from "@/components/StoriesBar";
import CommentsModal from "@/components/modal/CommentsModal";
import { PostCard, useFeed } from "@/components/feed";
import { Text, Skeleton, EmptyState } from "@/components/ui";
import { useTheme } from "@/context/ThemeContext";

export interface IndexVideoFeedProps {
  onOptionsPress: (post: Post) => void;
}

export default function IndexVideoFeed({ onOptionsPress }: IndexVideoFeedProps) {
  const { palette, isDark } = useTheme();
  const listRef = useRef<FlatList<Post>>(null);

  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  const {
    posts,
    loading,
    refreshing,
    loadingMore,
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
  } = useFeed();

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
      return () => stopAllSounds();
    }, [fetchPosts])
  );

  const handleScroll = (event: any) => {
    const isAtTop = event.nativeEvent.contentOffset.y <= 0;
    atTopRef.current = isAtTop;

    if (isAtTop && unseenPostIdsRef.current.length > 0) {
      unseenPostIdsRef.current.forEach((id) => seenPostIdsRef.current.add(id));
      unseenPostIdsRef.current = [];
      setNewPostsCount(0);
      hideNewPostsBanner();
    }
  };

  const handleNewPostsPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (unseenPostIdsRef.current.length > 0) {
      unseenPostIdsRef.current.forEach((id) => seenPostIdsRef.current.add(id));
    }
    unseenPostIdsRef.current = [];
    setNewPostsCount(0);
    hideNewPostsBanner();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const viewabilityConfig = useMemo(
    () => ({ itemVisiblePercentThreshold: 60, minimumViewTime: 300 }),
    []
  );

  const onViewableItemsChanged = useMemo(
    () =>
      ({ viewableItems }: { viewableItems: any[] }) => {
        const newlyVisible = viewableItems.filter(
          (view) => view.isViewable && view.item?.id
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
              (id) => !seenPostIdsRef.current.has(id)
            );
            if (unseenPostIdsRef.current.length === 0) {
              setNewPostsCount(0);
              hideNewPostsBanner();
            }
          }
        }

        const visibleVideo = viewableItems.find(
          (view) => view.isViewable && view.item?.media_type === "video"
        );
        setActiveVideoId(visibleVideo?.item?.id ?? null);

        const visibleAny = viewableItems.find(
          (view) => view.isViewable && view.item?.id
        );
        setActivePostId(visibleAny?.item?.id ?? null);
      },
    [hideNewPostsBanner, seenPostIdsRef, unseenPostIdsRef, setNewPostsCount]
  );

  const openComments = (postId: string) => setCommentPostId(postId);
  const closeComments = () => {
    setCommentPostId(null);
    fetchPosts();
  };

  const handleShare = async (post: Post) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await shareService.sharePost(post);
  };

  const renderItem = ({ item }: ListRenderItemInfo<Post>) => (
    <PostCard
      post={item}
      isActiveVideo={item.media_type === "video" && activeVideoId === item.id}
      isActiveSound={activePostId === item.id}
      onOptionsPress={onOptionsPress}
      onLike={handleLike}
      onComment={openComments}
      onRepost={handleRepost}
      onBookmark={handleBookmark}
      onShare={handleShare}
    />
  );

  // Skeleton loading screen
  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <StoriesBar />
        <Skeleton.PostCard />
        <Skeleton.PostCard />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <FlatList
        ref={listRef}
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={<StoriesBar />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon={
                <Ionicons
                  name="images-outline"
                  size={32}
                  color={palette.accent}
                />
              }
              title="No Posts Yet"
              description="Follow people or create your first post to see photos and videos in your feed."
              actionTitle="Explore Search"
              onActionPress={() => router.push("/search")}
            />
          ) : null
        }
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => (
          <View
            style={[
              styles.separator,
              { backgroundColor: palette.borderSubtle },
            ]}
          />
        )}
        showsVerticalScrollIndicator={false}
        initialNumToRender={3}
        maxToRenderPerBatch={4}
        windowSize={5}
        updateCellsBatchingPeriod={50}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <Skeleton width="40%" height={16} />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.accent}
          />
        }
      />

      {/* Floating New Posts Banner */}
      {newPostsCount > 0 && (
        <Animated.View
          pointerEvents="auto"
          style={[
            styles.bannerContainer,
            {
              opacity: bannerOpacity,
              transform: [{ translateY: bannerTranslateY }],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleNewPostsPress}
            style={[
              styles.bannerButton,
              {
                backgroundColor: isDark ? "#1E293B" : palette.text,
                borderColor: palette.borderSubtle,
              },
            ]}
          >
            <Ionicons name="arrow-up" size={16} color={palette.onAccent} />
            <Text
              variant="caption"
              weight="semibold"
              style={{ color: palette.onAccent }}
            >
              {newPostsCount} new {newPostsCount === 1 ? "post" : "posts"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Comments Modal Sheet */}
      {commentPostId && (
        <CommentsModal postId={commentPostId} onClose={closeComments} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  bannerContainer: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    zIndex: 20,
  },
  bannerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});
