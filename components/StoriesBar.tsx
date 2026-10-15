import React, { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import {
  StoryRing as StoryRingType,
  storyService,
} from "@/services/storyService";
import StoryRing from "./StoryRing";
import { Skeleton } from "@/components/ui/Skeleton";

export default function StoriesBar() {
  const { user } = useAuth();
  const { palette } = useTheme();
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
    }, [loadStories])
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
      <View style={styles.skeletonContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.skeletonItem}>
              <Skeleton width={64} height={64} borderRadius={32} />
              <Skeleton width={48} height={10} style={{ marginTop: 6 }} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.accent}
          />
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

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  skeletonContainer: {
    paddingVertical: 10,
  },
  skeletonItem: {
    alignItems: "center",
    marginRight: 14,
    width: 68,
  },
});
