import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { styled } from "nativewind";
import {
  ProfileSearchResult,
  profileService,
} from "@/services/profileService";
import { Post, postService } from "@/services/postService";
import PostGridThumbnail from "@/components/PostGridThumbnail";
import { colors } from "@/constants/theme";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

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
type SearchTab = "users" | "posts" | "tags" | "places";
type TagSuggestion = { tag: string; count: number };
type PlaceSuggestion = { location: string; count: number };

/**
 * Keyword bags used to filter the explore grid client-side. Posts have no
 * dedicated category column, so we match caption / sound metadata / username
 * against these terms. "All" is unfiltered; "Trending" is sorted by engagement.
 */
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
  const [searchText, setSearchText] = useState("");
  const [searchTab, setSearchTab] = useState<SearchTab>("users");
  const [selectedCategory, setSelectedCategory] = useState<Category>("All");

  // Explore grid state (default view)
  const [explorePosts, setExplorePosts] = useState<Post[]>([]);
  const [exploreLoading, setExploreLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search results
  const [userResults, setUserResults] = useState<ProfileSearchResult[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [tagResults, setTagResults] = useState<TagSuggestion[]>([]);
  const [placeResults, setPlaceResults] = useState<PlaceSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // A tapped hashtag/place drills into a dedicated posts grid — the
  // "#tag · N posts" header shows what the grid is scoped to.
  const [scope, setScope] = useState<
    { type: "tag" | "place"; value: string } | null
  >(null);
  const [scopePosts, setScopePosts] = useState<Post[]>([]);
  const [scopeLoading, setScopeLoading] = useState(false);

  const fetchExplorePosts = useCallback(async () => {
    try {
      setExploreLoading(true);
      // Bound the explore grid so the whole `posts` table is never loaded at
      // once (the unbounded read was the source of the OkHttp OOM on Android).
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

  // Search logic debounce — people + posts + hashtags + places in parallel.
  useEffect(() => {
    const trimmed = searchText.trim();
    if (!trimmed) {
      setUserResults([]);
      setPostResults([]);
      setTagResults([]);
      setPlaceResults([]);
      setScope(null);
      setSearched(false);
      setSearchLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const [users, posts, tags, places] = await Promise.all([
          profileService.searchProfiles(trimmed),
          postService.searchPosts(trimmed),
          postService.getHashtagSuggestions(trimmed),
          postService.getLocationSuggestions(trimmed),
        ]);
        setUserResults(users);
        setPostResults(posts);
        setTagResults(tags);
        setPlaceResults(places);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setSearchLoading(false);
        setSearched(true);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Drill into a hashtag/place: dedicated grid below the header chip.
  useEffect(() => {
    if (!scope) {
      setScopePosts([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setScopeLoading(true);
      try {
        const posts =
          scope.type === "tag"
            ? await postService.searchPostsByHashtag(scope.value)
            : await postService.searchPostsByLocation(scope.value);
        if (!cancelled) setScopePosts(posts);
      } catch (error) {
        console.error("Scoped search error:", error);
      } finally {
        if (!cancelled) setScopeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const isSearching = searchText.trim().length > 0;

  const renderContent = () => {
    if (isSearching) {
      if (searchLoading) {
        return (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.blue[600]} />
          </View>
        );
      }

      // Drill-down grid for a tapped hashtag/place
      if (scope) {
        return (
          <View className="flex-1">
            <View className="flex-row items-center justify-between px-5 pb-2">
              <Text className="text-base font-bold text-slate-900 dark:text-slate-50">
                {scope.type === "tag" ? `#${scope.value}` : scope.value}
                {scopePosts.length > 0
                  ? ` · ${scopePosts.length} post${scopePosts.length === 1 ? "" : "s"}`
                  : ""}
              </Text>
              <TouchableOpacity
                onPress={() => setScope(null)}
                accessibilityRole="button"
                accessibilityLabel="Clear filter"
                className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Back to results
                </Text>
              </TouchableOpacity>
            </View>
            {scopeLoading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color={colors.blue[600]} />
              </View>
            ) : scopePosts.length === 0 ? (
              <View className="flex-1 items-center justify-center px-10">
                <Ionicons name="images-outline" size={48} color={colors.slate[300]} />
                <Text className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-100">
                  No posts yet
                </Text>
                <Text className="mt-1 text-center text-xs text-slate-400">
                  Be the first to post with this{" "}
                  {scope.type === "tag" ? "hashtag" : "location"}.
                </Text>
              </View>
            ) : (
              <FlatList
                key={`scope-posts-${scope.type}-${scope.value}`}
                data={scopePosts}
                keyExtractor={(item) => item.id}
                numColumns={3}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={item.caption ? `Open post: ${item.caption}` : "Open post"}
                    onPress={() =>
                      router.push({
                        pathname: "/(pages)/viewPost",
                        params: { postId: item.id },
                      })
                    }
                    className="w-1/3 aspect-square border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800"
                  >
                    <PostGridThumbnail post={item} />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        );
      }

      if (searchTab === "tags") {
        if (tagResults.length === 0) {
          return (
            <View className="flex-1 items-center justify-center px-10">
              <Ionicons name="pricetags-outline" size={48} color={colors.slate[300]} />
              <Text className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-100">
                No hashtags found
              </Text>
              <Text className="mt-1 text-center text-xs text-slate-400">
                Try a different tag, or add #hashtags to your captions.
              </Text>
            </View>
          );
        }
        return (
          <FlatList
            key="search-tags-list"
            data={tagResults}
            keyExtractor={(item) => item.tag}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`View hashtag ${item.tag}`}
                onPress={() => setScope({ type: "tag", value: item.tag })}
                className="flex-row items-center gap-3.5 rounded-2xl bg-white dark:bg-slate-900 px-4 py-3 mb-2.5 border border-slate-200 dark:border-slate-700/80 shadow-sm"
              >
                <View className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-950 items-center justify-center border border-blue-100 dark:border-blue-900">
                  <Ionicons name="pricetag" size={20} color={colors.blue[600]} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-slate-900 dark:text-slate-50">
                    #{item.tag}
                  </Text>
                  <Text className="text-xs text-slate-400 mt-0.5">
                    {item.count} post{item.count === 1 ? "" : "s"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.slate[400]} />
              </TouchableOpacity>
            )}
          />
        );
      }

      if (searchTab === "places") {
        if (placeResults.length === 0) {
          return (
            <View className="flex-1 items-center justify-center px-10">
              <Ionicons name="location-outline" size={48} color={colors.slate[300]} />
              <Text className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-100">
                No places found
              </Text>
              <Text className="mt-1 text-center text-xs text-slate-400">
                No posts tagged with a matching location yet.
              </Text>
            </View>
          );
        }
        return (
          <FlatList
            key="search-places-list"
            data={placeResults}
            keyExtractor={(item) => item.location}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`View posts from ${item.location}`}
                onPress={() => setScope({ type: "place", value: item.location })}
                className="flex-row items-center gap-3.5 rounded-2xl bg-white dark:bg-slate-900 px-4 py-3 mb-2.5 border border-slate-200 dark:border-slate-700/80 shadow-sm"
              >
                <View className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950 items-center justify-center border border-emerald-100">
                  <Ionicons name="location" size={20} color={colors.emerald[600]} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-slate-900 dark:text-slate-50">
                    {item.location}
                  </Text>
                  <Text className="text-xs text-slate-400 mt-0.5">
                    {item.count} post{item.count === 1 ? "" : "s"}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.slate[400]} />
              </TouchableOpacity>
            )}
          />
        );
      }

      if (searchTab === "users") {
        if (userResults.length === 0 && searched) {
          return (
            <View className="flex-1 items-center justify-center px-10">
              <Ionicons name="people-outline" size={48} color={colors.slate[300]} />
              <Text className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-100">
                No people found
              </Text>
              <Text className="mt-1 text-center text-xs text-slate-400">
                Try searching for another username or full name.
              </Text>
            </View>
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
                className="flex-row items-center gap-3.5 rounded-2xl bg-white dark:bg-slate-900 px-4 py-3 mb-2.5 border border-slate-200 dark:border-slate-700/80 shadow-sm"
                onPress={() =>
                  router.push({
                    pathname: "/(pages)/userProfile",
                    params: { userId: item.id },
                  })
                }
              >
                <View className="h-12 w-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700">
                  {item.avatar_url ? (
                    <Image
                      source={{ uri: item.avatar_url }}
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

                <View className="flex-1">
                  <Text className="text-base font-bold text-slate-900 dark:text-slate-50 leading-tight">
                    {item.full_name || item.username || "User"}
                  </Text>
                  <Text className="text-xs text-slate-400 mt-0.5">
                    @{item.username || "user"}
                  </Text>
                  {item.bio ? (
                    <Text className="text-xs text-slate-500 dark:text-slate-400 mt-1" numberOfLines={1}>
                      {item.bio}
                    </Text>
                  ) : null}
                </View>

                <Ionicons name="chevron-forward" size={18} color={colors.slate[400]} />
              </TouchableOpacity>
            )}
          />
        );
      } else {
        // Posts search
        if (postResults.length === 0 && searched) {
          return (
            <View className="flex-1 items-center justify-center px-10">
              <Ionicons name="images-outline" size={48} color={colors.slate[300]} />
              <Text className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-100">
                No posts found
              </Text>
              <Text className="mt-1 text-center text-xs text-slate-400">
                Try searching for different keywords or tags.
              </Text>
            </View>
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
                accessibilityLabel={item.caption ? `Open post: ${item.caption}` : "Open post"}
                onPress={() =>
                  router.push({
                    pathname: "/(pages)/viewPost",
                    params: { postId: item.id },
                  })
                }
                className="w-1/3 aspect-square border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800"
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
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.blue[600]} />
        </View>
      );
    }

    if (explorePosts.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="compass-outline" size={54} color={colors.slate[300]} />
          <Text className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-50">
            Explore Content
          </Text>
          <Text className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
            No posts discovered yet. Be the first to share!
          </Text>
        </View>
      );
    }

    if (filteredExplorePosts.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="funnel-outline" size={48} color={colors.slate[300]} />
          <Text className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-50">
            No {selectedCategory} posts
          </Text>
          <Text className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400">
            Nothing in this category yet. Try another filter or be the first to
            share.
          </Text>
        </View>
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
            tintColor={colors.blue[600]}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={item.caption ? `Open post: ${item.caption}` : "Open post"}
            onPress={() =>
              router.push({
                pathname: "/(pages)/viewPost",
                params: { postId: item.id },
              })
            }
            className="w-1/3 aspect-square border border-slate-100 dark:border-slate-800 bg-slate-100 dark:bg-slate-800"
          >
            <PostGridThumbnail post={item} />
          </TouchableOpacity>
        )}
      />
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Search Input Bar */}
      <View className="px-5 pt-3 pb-2">
        <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2.5 border border-slate-200 dark:border-slate-700">
          <Ionicons name="search-outline" size={20} color={colors.slate[400]} />
          <TextInput
            placeholder="Search creators, topics, captions..."
            className="flex-1 ml-3 text-base text-slate-800 dark:text-slate-100"
            placeholderTextColor={colors.slate[400]}
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search creators, topics, and captions"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText("")}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={18} color={colors.slate[400]} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Switcher Tabs (When Searching) */}
        {isSearching && (
          <View className="flex-row mt-3 border-t border-slate-100 dark:border-slate-800 pt-2">
            <TouchableOpacity
              onPress={() => setSearchTab("users")}
              accessibilityRole="tab"
              accessibilityLabel="People results"
              accessibilityState={{ selected: searchTab === "users" }}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 border-b-2 ${
                searchTab === "users" ? "border-blue-600" : "border-transparent"
              }`}
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={searchTab === "users" ? colors.blue[600] : colors.slate[500]}
              />
              <Text
                className={`text-sm font-bold ${
                  searchTab === "users" ? "text-blue-600" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                People ({userResults.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSearchTab("posts")}
              accessibilityRole="tab"
              accessibilityLabel="Post results"
              accessibilityState={{ selected: searchTab === "posts" }}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 border-b-2 ${
                searchTab === "posts" ? "border-blue-600" : "border-transparent"
              }`}
            >
              <Ionicons
                name="images-outline"
                size={16}
                color={searchTab === "posts" ? colors.blue[600] : colors.slate[500]}
              />
              <Text
                className={`text-sm font-bold ${
                  searchTab === "posts" ? "text-blue-600" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Posts ({postResults.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSearchTab("tags")}
              accessibilityRole="tab"
              accessibilityLabel="Hashtag results"
              accessibilityState={{ selected: searchTab === "tags" }}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 border-b-2 ${
                searchTab === "tags" ? "border-blue-600" : "border-transparent"
              }`}
            >
              <Ionicons
                name="pricetags-outline"
                size={16}
                color={searchTab === "tags" ? colors.blue[600] : colors.slate[500]}
              />
              <Text
                className={`text-sm font-bold ${
                  searchTab === "tags" ? "text-blue-600" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Tags ({tagResults.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSearchTab("places")}
              accessibilityRole="tab"
              accessibilityLabel="Place results"
              accessibilityState={{ selected: searchTab === "places" }}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 border-b-2 ${
                searchTab === "places" ? "border-blue-600" : "border-transparent"
              }`}
            >
              <Ionicons
                name="location-outline"
                size={16}
                color={searchTab === "places" ? colors.blue[600] : colors.slate[500]}
              />
              <Text
                className={`text-sm font-bold ${
                  searchTab === "places" ? "text-blue-600" : "text-slate-500 dark:text-slate-400"
                }`}
              >
                Places ({placeResults.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Category Pills (When Not Searching) */}
      {!isSearching && (
        <View className="py-3.5">
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
                  className={`px-4 py-1.5 rounded-full ${
                    active
                      ? "bg-blue-600 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      active ? "text-white" : "text-slate-600 dark:text-slate-300"
                    }`}
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
    </SafeAreaView>
  );
}
