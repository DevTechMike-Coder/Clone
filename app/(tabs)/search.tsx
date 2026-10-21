import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  ProfileSearchResult,
  profileService,
} from "@/services/profileService";
import { Post, postService } from "@/services/postService";
import PostGridThumbnail from "@/components/PostGridThumbnail";
import { useTheme } from "@/context/ThemeContext";
import {
  Avatar,
  EmptyState,
  PressableScale,
  Screen,
  SegmentedTabs,
  Skeleton,
  Text,
  TextField,
} from "@/components/ui";

const CATEGORIES = [
  "All",
  "Trending",
  "Photography",
  "Nature",
  "Design",
  "Tech",
  "Fitness",
  "Music",
] as const;

type Category = (typeof CATEGORIES)[number];
type SearchTab = "users" | "posts";

const CATEGORY_KEYWORDS: Record<Exclude<Category, "All" | "Trending">, string[]> = {
  Photography: [
    "photo",
    "photography",
    "camera",
    "portrait",
    "shot",
    "lens",
    "pic",
    "snapshot",
  ],
  Nature: [
    "nature",
    "sunset",
    "sunrise",
    "mountain",
    "ocean",
    "forest",
    "sky",
    "beach",
    "tree",
    "flower",
    "landscape",
    "wildlife",
    "hike",
  ],
  Design: [
    "design",
    "ui",
    "ux",
    "art",
    "graphic",
    "illustration",
    "brand",
    "type",
    "layout",
  ],
  Tech: [
    "tech",
    "code",
    "software",
    "app",
    "ai",
    "gadget",
    "phone",
    "computer",
    "startup",
    "dev",
  ],
  Fitness: [
    "fitness",
    "gym",
    "workout",
    "run",
    "yoga",
    "health",
    "training",
    "lift",
    "sport",
  ],
  Music: [
    "music",
    "song",
    "sound",
    "audio",
    "beat",
    "track",
    "melody",
    "dance",
    "concert",
    "band",
  ],
};

function postMatchesCategory(post: Post, cat: Category): boolean {
  if (cat === "All" || cat === "Trending") return true;

  const textToScan = [
    post.caption ?? "",
    post.music_track_title ?? "",
    post.music_track_artist ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const keywords = CATEGORY_KEYWORDS[cat] ?? [];
  return keywords.some((kw) => textToScan.includes(kw));
}

function engagementScore(post: Post): number {
  const likes = post.like_count ?? 0;
  const comments = post.comment_count ?? 0;
  const reposts = post.repost_count ?? 0;
  return likes * 1 + comments * 2 + reposts * 3;
}

export default function SearchScreen() {
  const { palette } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const tileWidth = windowWidth / 3;

  const [searchText, setSearchText] = useState("");
  const [searchTab, setSearchTab] = useState<SearchTab>("users");
  const [selectedCategory, setSelectedCategory] = useState<Category>("All");

  // Explore grid state
  const [explorePosts, setExplorePosts] = useState<Post[]>([]);
  const [exploreLoading, setExploreLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search results
  const [userResults, setUserResults] = useState<ProfileSearchResult[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchExplorePosts = useCallback(async () => {
    try {
      setExploreLoading(true);
      const posts = await postService.getPosts({ limit: 40, offset: 0 });
      setExplorePosts(posts);
    } catch (error) {
      console.error("Error fetching explore posts:", error);
    } finally {
      setExploreLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchExplorePosts();
    }, [fetchExplorePosts])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchExplorePosts();
  };

  const filteredExplorePosts = useMemo(() => {
    const matched = explorePosts.filter((post) =>
      postMatchesCategory(post, selectedCategory)
    );
    if (selectedCategory === "Trending") {
      return [...matched].sort(
        (a, b) => engagementScore(b) - engagementScore(a)
      );
    }
    return matched;
  }, [explorePosts, selectedCategory]);

  // Debounced search logic
  useEffect(() => {
    const trimmed = searchText.trim();
    if (!trimmed) {
      setUserResults([]);
      setPostResults([]);
      setSearched(false);
      setSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const [users, posts] = await Promise.all([
          profileService.searchProfiles(trimmed),
          postService.searchPosts(trimmed),
        ]);
        setUserResults(users);
        setPostResults(posts);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearchLoading(false);
        setSearched(true);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchText]);

  const handleSelectCategory = (cat: Category) => {
    Haptics.selectionAsync();
    setSelectedCategory(cat);
  };

  const handleOpenPost = (postId: string) => {
    Haptics.selectionAsync();
    router.push({
      pathname: "/(pages)/viewPost",
      params: { id: postId, postId },
    });
  };

  const isSearching = searchText.trim().length > 0;

  const renderContent = () => {
    if (isSearching) {
      if (searchLoading) {
        return searchTab === "users" ? (
          <View style={styles.searchSkeletonContainer}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton.Row key={i} style={styles.skeletonRow} />
            ))}
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <View key={i} style={[styles.gridTileWrapper, { width: tileWidth, height: tileWidth }]}>
                <Skeleton width="100%" height="100%" borderRadius={0} />
              </View>
            ))}
          </View>
        );
      }

      if (searchTab === "users") {
        if (userResults.length === 0 && searched) {
          return (
            <EmptyState
              icon={
                <Ionicons
                  name="people-outline"
                  size={48}
                  color={palette.muted}
                />
              }
              title="No people found"
              description="Try searching for another username or full name."
            />
          );
        }

        return (
          <FlatList
            key="search-users-list"
            data={userResults}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.usersListContent}
            renderItem={({ item }) => (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`View profile of ${item.full_name || item.username || "user"}`}
                style={[
                  styles.userCard,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push({
                    pathname: "/(pages)/userProfile",
                    params: { userId: item.id },
                  });
                }}
              >
                <Avatar
                  url={item.avatar_url}
                  name={item.full_name || item.username}
                  size={46}
                />

                <View style={styles.userTextContainer}>
                  <Text variant="body" weight="semibold" numberOfLines={1}>
                    {item.full_name || item.username || "User"}
                  </Text>
                  <Text
                    variant="caption"
                    color="muted"
                    style={styles.marginTop2}
                    numberOfLines={1}
                  >
                    @{item.username || "user"}
                  </Text>
                  {item.bio ? (
                    <Text
                      variant="micro"
                      color="muted"
                      style={styles.marginTop2}
                      numberOfLines={1}
                    >
                      {item.bio}
                    </Text>
                  ) : null}
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={palette.muted}
                />
              </PressableScale>
            )}
          />
        );
      } else {
        // Posts search
        if (postResults.length === 0 && searched) {
          return (
            <EmptyState
              icon={
                <Ionicons
                  name="images-outline"
                  size={48}
                  color={palette.muted}
                />
              }
              title="No posts found"
              description="Try searching for different keywords or tags."
            />
          );
        }

        return (
          <FlatList
            key="search-posts-list"
            data={postResults}
            keyExtractor={(item) => item.id}
            numColumns={3}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={
                  item.caption ? `Open post: ${item.caption}` : "Open post"
                }
                onPress={() => handleOpenPost(item.id)}
                style={[
                  styles.gridTile,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.surface,
                  },
                ]}
              >
                <PostGridThumbnail post={item} />
              </TouchableOpacity>
            )}
          />
        );
      }
    }

    // Default Explore View
    if (exploreLoading && !refreshing) {
      return (
        <View style={styles.gridContainer}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <View key={i} style={[styles.gridTileWrapper, { width: tileWidth, height: tileWidth }]}>
              <Skeleton width="100%" height="100%" borderRadius={0} />
            </View>
          ))}
        </View>
      );
    }

    if (explorePosts.length === 0) {
      return (
        <EmptyState
          icon={
            <Ionicons
              name="compass-outline"
              size={48}
              color={palette.muted}
            />
          }
          title="Explore Content"
          description="No posts discovered yet. Be the first to share!"
        />
      );
    }

    if (filteredExplorePosts.length === 0) {
      return (
        <EmptyState
          icon={
            <Ionicons
              name="funnel-outline"
              size={48}
              color={palette.muted}
            />
          }
          title={`No ${selectedCategory} posts`}
          description="Nothing in this category yet. Try another filter or be the first to share."
        />
      );
    }

    return (
      <FlatList
        key={`explore-posts-list-${selectedCategory}`}
        data={filteredExplorePosts}
        keyExtractor={(item) => item.id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.accent}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              item.caption ? `Open post: ${item.caption}` : "Open post"
            }
            onPress={() => handleOpenPost(item.id)}
            style={[
              styles.gridTile,
              {
                borderColor: palette.border,
                backgroundColor: palette.surface,
              },
            ]}
          >
            <PostGridThumbnail post={item} />
          </TouchableOpacity>
        )}
      />
    );
  };

  return (
    <Screen>
      {/* Search Input Bar */}
      <View style={styles.searchInputBar}>
        <TextField
          placeholder="Search creators, topics, captions..."
          leftIcon={
            <Ionicons name="search-outline" size={18} color={palette.muted} />
          }
          rightIcon={
            searchText ? (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={18} color={palette.muted} />
              </TouchableOpacity>
            ) : undefined
          }
          value={searchText}
          onChangeText={setSearchText}
        />

        {/* Search Switcher Tabs (When Searching) */}
        {isSearching && (
          <View style={styles.tabsWrapper}>
            <SegmentedTabs
              tabs={[
                { key: "users", label: "People", badge: userResults.length },
                { key: "posts", label: "Posts", badge: postResults.length },
              ]}
              activeTab={searchTab}
              onTabChange={(key) => setSearchTab(key as SearchTab)}
            />
          </View>
        )}
      </View>

      {/* Category Pills (When Not Searching) */}
      {!isSearching && (
        <View style={styles.categoriesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <PressableScale
                  key={cat}
                  onPress={() => handleSelectCategory(cat)}
                  accessibilityRole="tab"
                  accessibilityLabel={`${cat} category`}
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: active
                        ? palette.accent
                        : palette.surface,
                      borderColor: active
                        ? palette.accent
                        : palette.border,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    weight="bold"
                    style={{
                      color: active ? palette.onAccent : palette.muted,
                    }}
                  >
                    {cat}
                  </Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Content Area */}
      {renderContent()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchInputBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  tabsWrapper: {
    marginTop: 10,
  },
  categoriesSection: {
    paddingVertical: 10,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    flex: 1,
  },
  gridTileWrapper: {
    borderWidth: 0.5,
    borderColor: "transparent",
  },
  gridTile: {
    width: "33.333%",
    aspectRatio: 1,
    borderWidth: 0.5,
  },
  searchSkeletonContainer: {
    padding: 16,
    gap: 12,
  },
  skeletonRow: {
    marginVertical: 4,
  },
  usersListContent: {
    padding: 16,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
  userTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  marginTop2: {
    marginTop: 2,
  },
});
