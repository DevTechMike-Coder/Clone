import { File } from "expo-file-system";
import { supabase } from "../lib/supabase";

export type Story = {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video";
  background_color?: string;
  caption?: string;
  text_color?: string;
  expires_at: string;
  created_at: string;
  view_count: number;
  profiles?: {
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
  has_viewed?: boolean;
};

export type StoryRing = {
  user_id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  stories: Story[];
  has_unviewed: boolean;
};

/**
 * Upload story media to the `stories` storage bucket.
 */
async function uploadStoryMedia(
  uri: string,
  userId: string,
  mediaType: "image" | "video",
): Promise<string> {
  const ext = mediaType === "video" ? "mp4" : "jpg";
  const contentType = mediaType === "video" ? "video/mp4" : "image/jpeg";
  const fileName = `${userId}/${Date.now()}.${ext}`;

  const file = new File(uri);
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from("stories")
    .upload(fileName, arrayBuffer, { contentType, upsert: true });

  if (error) {
    console.error("Supabase story upload error:", error);
    throw new Error(`Story upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("stories").getPublicUrl(fileName);

  return publicUrl;
}

export const storyService = {
  /**
   * Create a new story.
   */
  async createStory(input: {
    userId: string;
    mediaUri: string;
    mediaType: "image" | "video";
    caption?: string;
    backgroundColor?: string;
    textColor?: string;
  }): Promise<Story> {
    const media_url = await uploadStoryMedia(
      input.mediaUri,
      input.userId,
      input.mediaType,
    );

    const { data, error } = await supabase
      .from("stories")
      .insert({
        user_id: input.userId,
        media_url,
        media_type: input.mediaType,
        caption: input.caption,
        background_color: input.backgroundColor,
        text_color: input.textColor,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error creating story:", error);
      throw error;
    }

    return data as Story;
  },

  /**
   * Get the active (non-expired) stories for the home feed, grouped by user.
   * Includes own stories at the start.
   */
  async getActiveStoriesForFeed(): Promise<StoryRing[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    const { data, error } = await supabase
      .from("stories")
      .select(
        `
        *,
        profiles!inner (
          username,
          full_name,
          avatar_url
        )
      `,
      )
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching stories:", error);
      return [];
    }

    const stories = (data ?? []) as any[];

    // Build a set of stories the current user has viewed.
    let viewedStoryIds = new Set<string>();
    if (currentUserId && stories.length > 0) {
      const storyIds = stories.map((s) => s.id);
      const { data: views } = await supabase
        .from("story_views")
        .select("story_id")
        .eq("viewer_id", currentUserId)
        .in("story_id", storyIds);
      viewedStoryIds = new Set((views ?? []).map((v: any) => v.story_id));
    }

    // Group by user.
    const byUser = new Map<string, StoryRing>();
    for (const s of stories) {
      const existing = byUser.get(s.user_id);
      const story: Story = { ...(s as Story), has_viewed: viewedStoryIds.has(s.id) };
      if (existing) {
        existing.stories.push(story);
        if (!story.has_viewed && s.user_id !== currentUserId) {
          existing.has_unviewed = true;
        }
      } else {
        byUser.set(s.user_id, {
          user_id: s.user_id,
          username: s.profiles?.username ?? "user",
          full_name: s.profiles?.full_name,
          avatar_url: s.profiles?.avatar_url,
          stories: [story],
          has_unviewed: s.user_id !== currentUserId && !viewedStoryIds.has(s.id),
        });
      }
    }

    // Put own stories first, then the rest sorted by newest unviewed first.
    const rings = Array.from(byUser.values());
    rings.sort((a, b) => {
      if (a.user_id === currentUserId) return -1;
      if (b.user_id === currentUserId) return 1;
      if (a.has_unviewed !== b.has_unviewed) return a.has_unviewed ? -1 : 1;
      return 0;
    });

    return rings;
  },

  /**
   * Get all active stories by a specific user.
   */
  async getStoriesByUser(userId: string): Promise<Story[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching user stories:", error);
      return [];
    }

    const stories = (data ?? []) as Story[];

    if (currentUserId && currentUserId !== userId && stories.length > 0) {
      // Mark viewed.
      const { data: views } = await supabase
        .from("story_views")
        .select("story_id")
        .eq("viewer_id", currentUserId)
        .in(
          "story_id",
          stories.map((s) => s.id),
        );
      const viewed = new Set((views ?? []).map((v: any) => v.story_id));
      return stories.map((s) => ({ ...s, has_viewed: viewed.has(s.id) }));
    }

    // Own stories are always "seen".
    return stories.map((s) => ({ ...s, has_viewed: true }));
  },

  /**
   * Mark a single story as viewed by the current user.
   * Uses upsert semantics (no duplicate rows, no error if already viewed).
   */
  async markStoryViewed(storyId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("story_views")
      .upsert(
        { story_id: storyId, viewer_id: user.id },
        { onConflict: "story_id,viewer_id", ignoreDuplicates: true },
      );

    if (error) {
      console.error("Error marking story viewed:", error);
    }
    // Note: view_count on the stories row isn't incremented here because the
    // safe PostgREST client only accepts literal values in .update(). The
    // canonical "who has seen this story" source is `story_views`, so per-story
    // view counts should be derived from that table if/when needed.
  },

  /**
   * Delete one of my stories.
   */
  async deleteStory(storyId: string): Promise<void> {
    const { error } = await supabase
      .from("stories")
      .delete()
      .eq("id", storyId);
    if (error) throw error;
  },

  /**
   * Return the count of active stories for the given user.
   */
  async getActiveStoryCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from("stories")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString());
    if (error) return 0;
    return count ?? 0;
  },
};
