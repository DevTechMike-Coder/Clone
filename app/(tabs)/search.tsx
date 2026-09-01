import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { styled } from "nativewind";
import {
  ProfileSearchResult,
  profileService,
} from "@/services/profileService";
import { Post, postService } from "@/services/postService";
import PostGridThumbnail from "@/components/PostGridThumbnail";
import React, { useCallback, useEffect, useState } from "react";
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
];

type SearchTab = "users" | "posts";

export default function Search() {
  const [searchText, setSearchText] = useState("");
  const [searchTab, setSearchTab] = useState<SearchTab>("users");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Explore grid state (default view)
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

  // Search logic debounce
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
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        );
      }

      if (searchTab === "users") {
        if (userResults.length === 0 && searched) {
          return (
            <View className="flex-1 items-center justify-center px-10">
              <Ionicons name="people-outline" size={48} color="#CBD5E1" />
              <Text className="mt-4 text-base font-semibold text-slate-800">
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
                className="flex-row items-center gap-3.5 rounded-2xl bg-white px-4 py-3 mb-2.5 border border-slate-200/80 shadow-sm"
                onPress={() =>
                  router.push({
                    pathname: "/(pages)/userProfile",
                    params: { userId: item.id },
                  })
                }
              >
                <View className="h-12 w-12 rounded-full overflow-hidden bg-slate-100 items-center justify-center border border-slate-200">
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
                  <Text className="text-base font-bold text-slate-900 leading-tight">
                    {item.full_name || item.username || "User"}
                  </Text>
                  <Text className="text-xs text-slate-400 mt-0.5">
                    @{item.username || "user"}
                  </Text>
                  {item.bio ? (
                    <Text className="text-xs text-slate-500 mt-1" numberOfLines={1}>
                      {item.bio}
                    </Text>
                  ) : null}
                </View>

                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          />
        );
      } else {
        // Posts search
        if (postResults.length === 0 && searched) {
          return (
            <View className="flex-1 items-center justify-center px-10">
              <Ionicons name="images-outline" size={48} color="#CBD5E1" />
              <Text className="mt-4 text-base font-semibold text-slate-800">
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
                onPress={() =>
                  router.push({
                    pathname: "/(pages)/viewPost",
                    params: { postId: item.id },
                  })
                }
                className="w-1/3 aspect-square border border-slate-100 bg-slate-100"
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
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      );
    }

    if (explorePosts.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="compass-outline" size={54} color="#CBD5E1" />
          <Text className="mt-4 text-lg font-bold text-slate-900">
            Explore Content
          </Text>
          <Text className="mt-1 text-center text-sm text-slate-500">
            No posts discovered yet. Be the first to share!
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        key="explore-posts-list"
        data={explorePosts}
        keyExtractor={(item) => item.id}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/(pages)/viewPost",
                params: { postId: item.id },
              })
            }
            className="w-1/3 aspect-square border border-slate-100 bg-slate-100"
          >
            <PostGridThumbnail post={item} />
          </TouchableOpacity>
        )}
      />
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Search Input Bar */}
      <View className="px-5 pt-3 pb-2 bg-white border-b border-slate-100 shadow-sm">
        <View className="flex-row items-center bg-slate-100 rounded-2xl px-4 py-2.5 border border-slate-200">
          <Ionicons name="search-outline" size={20} color="#94A3B8" />
          <TextInput
            placeholder="Search creators, topics, captions..."
            className="flex-1 ml-3 text-base text-slate-800"
            placeholderTextColor="#94A3B8"
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Switcher Tabs (When Searching) */}
        {isSearching && (
          <View className="flex-row mt-3 border-t border-slate-100 pt-2">
            <TouchableOpacity
              onPress={() => setSearchTab("users")}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 border-b-2 ${
                searchTab === "users" ? "border-blue-600" : "border-transparent"
              }`}
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={searchTab === "users" ? "#2563EB" : "#64748B"}
              />
              <Text
                className={`text-sm font-bold ${
                  searchTab === "users" ? "text-blue-600" : "text-slate-500"
                }`}
              >
                People ({userResults.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSearchTab("posts")}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 border-b-2 ${
                searchTab === "posts" ? "border-blue-600" : "border-transparent"
              }`}
            >
              <Ionicons
                name="images-outline"
                size={16}
                color={searchTab === "posts" ? "#2563EB" : "#64748B"}
              />
              <Text
                className={`text-sm font-bold ${
                  searchTab === "posts" ? "text-blue-600" : "text-slate-500"
                }`}
              >
                Posts ({postResults.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Category Pills (When Not Searching) */}
      {!isSearching && (
        <View className="bg-white py-2.5 border-b border-slate-100">
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
                  className={`px-4 py-1.5 rounded-full ${
                    active
                      ? "bg-blue-600 shadow-sm"
                      : "bg-slate-100 border border-slate-200"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      active ? "text-white" : "text-slate-600"
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
