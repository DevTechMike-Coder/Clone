import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  SafeAreaView as RNSafeAreaView,
} from "react-native-safe-area-context";
import { styled } from "nativewind";
import { useAuth } from "@/context/AuthContext";
import {
  CreatorInsights,
  insightsService,
} from "@/services/insightsService";
import PostGridThumbnail from "@/components/PostGridThumbnail";
import { colors } from "@/constants/theme";

const SafeAreaView = styled(RNSafeAreaView);

const formatCount = (n: number): string =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`
      : String(n);

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <View className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
      <View
        className="w-9 h-9 rounded-full items-center justify-center mb-2"
        style={{ backgroundColor: `${accent}1A` }}
      >
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text className="text-xl font-bold text-slate-900 dark:text-slate-50">
        {formatCount(value)}
      </Text>
      <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
        {label}
      </Text>
    </View>
  );
}

export default function Insights() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<CreatorInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setInsights(await insightsService.getCreatorInsights(user.id));
    } catch (error) {
      console.error("Error loading insights:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="p-1"
        >
          <Ionicons name="arrow-back" size={24} color={colors.slate[700]} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-900 dark:text-slate-50">
          Insights
        </Text>
        <View className="w-8" />
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.blue[600]} />
        </View>
      ) : !insights ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="bar-chart-outline" size={48} color={colors.slate[300]} />
          <Text className="mt-4 text-base font-semibold text-slate-800 dark:text-slate-100">
            No data yet
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.blue[600]}
            />
          }
        >
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Lifetime totals
          </Text>

          {/* Stat grid */}
          <View className="flex-row gap-3 mb-3">
            <StatCard icon="eye" label="Views" value={insights.totalViews} accent={colors.blue[600]} />
            <StatCard icon="heart" label="Likes" value={insights.totalLikes} accent={colors.rose[500]} />
          </View>
          <View className="flex-row gap-3 mb-3">
            <StatCard icon="chatbubble" label="Comments" value={insights.totalComments} accent={colors.violet[500]} />
            <StatCard icon="repeat" label="Reposts" value={insights.totalReposts} accent={colors.emerald[600]} />
          </View>
          <View className="flex-row gap-3 mb-6">
            <StatCard icon="people" label="Followers" value={insights.followersCount} accent={colors.amber[500]} />
            <StatCard icon="images" label="Posts" value={insights.postsCount} accent={colors.cyan[500]} />
          </View>

          {/* Top posts */}
          <Text className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Top posts
          </Text>

          {insights.topPosts.length === 0 ? (
            <View className="items-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
              <Ionicons name="images-outline" size={40} color={colors.slate[300]} />
              <Text className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Post something to start seeing what performs.
              </Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {insights.topPosts.map((post, index) => (
                <TouchableOpacity
                  key={post.id}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: "/(pages)/viewPost",
                      params: { postId: post.id },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`View post ranked ${index + 1}`}
                  className="flex-row items-center gap-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-3"
                >
                  <Text className="w-6 text-center text-sm font-bold text-slate-400">
                    {index + 1}
                  </Text>
                  <View className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <PostGridThumbnail post={post} />
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-sm font-semibold text-slate-900 dark:text-slate-50"
                      numberOfLines={1}
                    >
                      {post.caption || "Post"}
                    </Text>
                    <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {formatCount(post.view_count ?? 0)} views ·{" "}
                      {formatCount(post.like_count ?? 0)} likes ·{" "}
                      {formatCount(post.comment_count ?? 0)} comments
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.slate[300]} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
