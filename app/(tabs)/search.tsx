import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  ProfileSearchResult,
  profileService,
} from "@/services/profileService";
import { Post, postService } from "@/services/postService";
import PostGridThumbnail from "@/components/PostGridThumbnail";
import { useTheme } from "@/context/ThemeContext";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Avatar } from "@/components/ui/Avatar";
import { TextField } from "@/components/ui/TextField";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { EmptyState } from "@/components/ui/EmptyState";

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
    "track",
    "concert",
    "band",
    "album",
    "sound",
    "beat",
    "dj",
  ],
};

function haystackFor(post: Post): string {
  return [
    post.caption,
    post.music_track_title,
    post.music_track_artist,
    post.profiles?.username,
    post.profiles?.full_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function postMatchesCategory(post: Post, category: Category): boolean {
  if (category === "All" || category === "Trending") return true;
  const keywords = CATEGORY_KEYWORDS[category];
  const haystack = haystackFor(post);
  if (category === "Music" && (post.has_sound || post.music_track_title)) {
    return true;
  }
  return keywords.some((keyword) => haystack.includes(keyword));
}

function engagementScore(post: Post): number {
  return (
    (post.view_count ?? 0) +
    (post.like_count ?? 0) * 3 +
    (post.comment_count ?? 0) * 2 +
    (post.repost_count ?? 0) * 2
  );
}

export default function Search() {
  const { palette } = useTheme();
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

  const isSearching = searchText.trim().length > 0;

  const renderContent = () => {
    if (isSearching) {
      if (searchLoading) {
        return (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color={palette.primary} />
          </View>
        );
      }

      if (searchTab === "users") {
        if (userResults.length === 0 && searched) {
          return (
            <EmptyState
              icon="people-outline"
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
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`View profile of ${item.full_name || item.username || "user"}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  borderWidth: 1,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginBottom: 10,
                }}
                onPress={() =>
                  router.push({
                    pathname: "/(pages)/userProfile",
                    params: { userId: item.id },
                  })
                }
              >
                <Avatar
                  url={item.avatar_url}
                  name={item.full_name || item.username}
                  size={46}
                />

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text variant="body" weight="semibold" numberOfLines={1}>
                    {item.full_name || item.username || "User"}
                  </Text>
                  <Text
                    variant="caption"
                    color="muted"
                    style={{ marginTop: 2 }}
                    numberOfLines={1}
                  >
                    @{item.username || "user"}
                  </Text>
                  {item.bio ? (
                    <Text
                      variant="micro"
                      color="muted"
                      style={{ marginTop: 2 }}
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
              </TouchableOpacity>
            )}
          />
        );
      } else {
        // Posts search
        if (postResults.length === 0 && searched) {
          return (
            <EmptyState
              icon="images-outline"
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
                onPress={() =>
                  router.push({
                    pathname: "/(pages)/viewPost",
                    params: { postId: item.id },
                  })
                }
                style={{
                  width: "33.333%",
                  aspectRatio: 1,
                  borderWidth: 0.5,
                  borderColor: palette.border,
                  backgroundColor: palette.surface,
                }}
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
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      );
    }

    if (explorePosts.length === 0) {
      return (
        <EmptyState
          icon="compass-outline"
          title="Explore Content"
          description="No posts discovered yet. Be the first to share!"
        />
      );
    }

    if (filteredExplorePosts.length === 0) {
      return (
        <EmptyState
          icon="funnel-outline"
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
            tintColor={palette.primary}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              item.caption ? `Open post: ${item.caption}` : "Open post"
            }
            onPress={() =>
              router.push({
                pathname: "/(pages)/viewPost",
                params: { postId: item.id },
              })
            }
            style={{
              width: "33.333%",
              aspectRatio: 1,
              borderWidth: 0.5,
              borderColor: palette.border,
              backgroundColor: palette.surface,
            }}
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
      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }}>
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
          <View style={{ marginTop: 10 }}>
            <SegmentedTabs
              tabs={[
                { key: "users", label: "People", badge: userResults.length },
                { key: "posts", label: "Posts", badge: postResults.length },
              ]}
              activeTab={searchTab}
              onTabChange={(key) => setSearchTab(key)}
            />
          </View>
        )}
      </View>

      {/* Category Pills (When Not Searching) */}
      {!isSearching && (
        <View style={{ paddingVertical: 10 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.7}
                  onPress={() => setSelectedCategory(cat)}
                  accessibilityRole="tab"
                  accessibilityLabel={`${cat} category`}
                  accessibilityState={{ selected: active }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 7,
                    borderRadius: 20,
                    backgroundColor: active
                      ? palette.primary
                      : palette.surface,
                    borderWidth: 1,
                    borderColor: active
                      ? palette.primary
                      : palette.border,
                  }}
                >
                  <Text
                    variant="caption"
                    weight="bold"
                    color={active ? "white" : "muted"}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
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
