import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { router } from "expo-router";
import StoryRing from "./StoryRing";
import { storyService, StoryRing as StoryRingType } from "@/services/storyService";
import { useAuth } from "@/context/AuthContext";

/**
 * Horizontal bar of Instagram-style story rings shown at the top of the home feed.
 * The first slot is always "Your story" which opens the story creator (or the
 * viewer if the user already has an active story).
 */
export default function StoriesBar() {
  const { user } = useAuth();
  const [rings, setRings] = useState<StoryRingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStories = useCallback(async () => {
    if (!user) return;
    try {
      const data = await storyService.getActiveStoriesForFeed();
      setRings(data);
    } catch (e) {
      console.error("Error loading stories bar:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadStories();
    }, [loadStories]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadStories();
  };

  const me = rings.find((r) => r.user_id === user?.id);
  const others = rings.filter((r) => r.user_id !== user?.id);

  const ownRing: StoryRingType = me ?? {
    user_id: user?.id ?? "",
    username: "Your story",
    full_name: user?.email?.split("@")[0] ?? "You",
    avatar_url: undefined,
    stories: [],
    has_unviewed: false,
  };

  if (loading) {
    return (
      <View className="py-4 items-center justify-center">
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  return (
    <View className="bg-white border-b border-slate-100 py-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Your story slot */}
        <StoryRing
          ring={ownRing}
          isFirst
          onCreateStory={() => router.push("/(pages)/createStory")}
          onPress={() => {
            if (me && me.stories.length > 0) {
              router.push({
                pathname: "/(pages)/storyViewer",
                params: { initialUserId: user?.id },
              });
            } else {
              router.push("/(pages)/createStory");
            }
          }}
        />

        {others.map((ring) => (
          <StoryRing
            key={ring.user_id}
            ring={ring}
            onPress={() =>
              router.push({
                pathname: "/(pages)/storyViewer",
                params: { initialUserId: ring.user_id },
              })
            }
          />
        ))}
      </ScrollView>
    </View>
  );
}
