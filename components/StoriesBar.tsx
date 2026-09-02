import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";

import { colors } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import {
  StoryRing as StoryRingType,
  storyService,
} from "@/services/storyService";
import StoryRing from "./StoryRing";

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
        <ActivityIndicator color={colors.blue[600]} />
      </View>
    );
  }

  return (
    <View className="py-3">
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
          onCreateStory={() =>
            router.push({
              pathname: "/(pages)/createNew",
              params: { mode: "Story" },
            })
          }
          onPress={() => {
            if (me && me.stories.length > 0) {
              router.push({
                pathname: "/(pages)/storyViewer",
                params: { initialUserId: user?.id },
              });
            } else {
              router.push({
                pathname: "/(pages)/createNew",
                params: { mode: "Story" },
              });
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
