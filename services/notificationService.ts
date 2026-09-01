import { supabase } from "@/lib/supabase";

export type NotificationItem = {
  id: string;
  user_id: string;
  from_user_id: string;
  type: "like" | "comment" | "follow" | "repost" | "message";
  post_id?: string | null;
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

  async createNotification(params: {
    userId: string;
    type: "like" | "comment" | "follow" | "repost" | "message";
    postId?: string;
  }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Do not notify self
    if (user.id === params.userId) return;

    const { error } = await supabase.from("notifications").insert([
      {
        user_id: params.userId,
        from_user_id: user.id,
        type: params.type,
        post_id: params.postId || null,
      },
    ]);

    if (error) {
      // Non-critical, log warning only
      console.warn("Failed to create notification:", error);
    }
  },
};
