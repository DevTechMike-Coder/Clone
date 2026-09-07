import { supabase } from "@/lib/supabase";

/**
 * Notification types. Mirrors the `notifications_type_check` constraint in
 * Postgres — keep the two in sync.
 *
 * `story` fires when someone you follow posts a story; `story_expiring` is the
 * scheduled "watch it before it's gone" reminder, produced by a cron job
 * rather than by a user action.
 */
export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "repost"
  | "message"
  | "story"
  | "story_expiring";

export type NotificationItem = {
  id: string;
  user_id: string;
  from_user_id: string;
  type: NotificationType;
  post_id?: string | null;
  story_id?: string | null;
  conversation_id?: string | null;
  is_read: boolean;
  created_at: string;
  profiles?: {
    username: string;
    full_name?: string;
    avatar_url?: string;
  } | null;
  posts?: {
    id: string;
    media_url: string;
    media_type: "video" | "image";
    caption?: string;
  } | null;
};

/**
 * Per-user push preferences.
 *
 * These gate the PUSH only — never the in-app inbox. Turning "Likes" off stops
 * the phone buzzing; the row still appears here. Defaults match the column
 * defaults in the migration: high-signal events on, high-volume ones off.
 */
export type NotificationPreferences = {
  push_enabled: boolean;
  push_follows: boolean;
  push_comments: boolean;
  push_messages: boolean;
  push_stories: boolean;
  push_story_expiry: boolean;
  push_likes: boolean;
  push_reposts: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  push_enabled: true,
  push_follows: true,
  push_comments: true,
  push_messages: true,
  push_stories: true,
  push_story_expiry: true,
  push_likes: false,
  push_reposts: false,
};

export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("notifications")
      .select(
        `
        id,
        user_id,
        from_user_id,
        type,
        post_id,
        is_read,
        created_at,
        profiles:from_user_id (
          username,
          full_name,
          avatar_url
        ),
        posts:post_id (
          id,
          media_url,
          media_type,
          caption
        )
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      // Bound the list to the most recent notifications so the response body
      // read over HTTP/2 stays small. The unread badge count is tracked
      // separately via `getUnreadCount()`, so this does not affect the badge.
      .limit(50);

    if (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }

    return (data || []).map((item: any) => {
      const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
      const post = Array.isArray(item.posts) ? item.posts[0] : item.posts;
      return {
        ...item,
        profiles: profile || null,
        posts: post || null,
      };
    }) as NotificationItem[];
  },

  async markAsRead(notificationId?: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id);

    if (notificationId) {
      query = query.eq("id", notificationId);
    }

    const { error } = await query;
    if (error) throw error;
  },

  async getUnreadCount(): Promise<number> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("Error fetching unread notification count:", error);
      return 0;
    }

    return count || 0;
  },

  /**
   * Load the current user's push preferences.
   *
   * Falls back to the defaults when no row exists yet. The row is created by a
   * trigger on `profiles` insert and backfilled for existing accounts, so a
   * miss here means the migration has not run rather than a data problem —
   * returning defaults keeps the settings screen usable either way.
   */
  async getPreferences(): Promise<NotificationPreferences> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return DEFAULT_NOTIFICATION_PREFERENCES;

    const { data, error } = await supabase
      .from("notification_preferences")
      .select(
        "push_enabled, push_follows, push_comments, push_messages, push_stories, push_story_expiry, push_likes, push_reposts",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching notification preferences:", error);
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }

    if (!data) return DEFAULT_NOTIFICATION_PREFERENCES;

    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(data as NotificationPreferences) };
  },

  /**
   * Persist push preferences.
   *
   * Upsert rather than update: the row is normally created by the profile
   * trigger, but upserting means the settings screen still works if it is
   * missing (or if an account predates the backfill).
   */
  async updatePreferences(
    prefs: Partial<NotificationPreferences>,
  ): Promise<NotificationPreferences | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("notification_preferences")
      .upsert(
        { user_id: user.id, ...prefs },
        { onConflict: "user_id" },
      )
      .select(
        "push_enabled, push_follows, push_comments, push_messages, push_stories, push_story_expiry, push_likes, push_reposts",
      )
      .maybeSingle();

    if (error) {
      console.error("Error updating notification preferences:", error);
      throw error;
    }

    if (!data) return null;

    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(data as NotificationPreferences) };
  },
};
