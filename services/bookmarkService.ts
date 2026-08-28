import { supabase } from "@/lib/supabase";
import { Post } from "./postService";

export const bookmarkService = {
  toggleBookmark: async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in to bookmark posts");

    const { data: existingBookmark, error: fetchError } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError;
    }

    if (existingBookmark) {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("id", existingBookmark.id);
      if (error) throw error;
      return { bookmarked: false };
    } else {
      const { error } = await supabase
        .from("bookmarks")
        .insert([{ post_id: postId, user_id: user.id }]);
      if (error) throw error;
      return { bookmarked: true };
    }
  },

  getBookmarkedPosts: async (userId?: string): Promise<Post[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    const targetUserId = userId || user?.id;
    if (!targetUserId) return [];

    const { data, error } = await supabase
      .from("bookmarks")
      .select(
        `
        post_id,
        created_at,
        posts (
          *,
          profiles (
            username,
            full_name,
            avatar_url
          ),
          comments(count),
          likes(count),
          reposts(count),
          user_liked:likes(user_id),
          user_reposted:reposts(user_id),
          user_bookmarked:bookmarks(user_id)
        )
      `
      )
      .eq("user_id", targetUserId)
      .eq('posts.user_liked.user_id', user?.id ?? '00000000-0000-0000-0000-000000000000')
      .eq('posts.user_reposted.user_id', user?.id ?? '00000000-0000-0000-0000-000000000000')
      .eq('posts.user_bookmarked.user_id', user?.id ?? '00000000-0000-0000-0000-000000000000')
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching bookmarks:", error);
      throw error;
    }

    return (data || [])
      .filter((item: any) => item.posts)
      .map((item: any) => {
        const post = item.posts;
        return {
          ...post,
          comment_count: post.comments?.[0]?.count ?? 0,
          like_count: post.likes?.[0]?.count ?? 0,
          repost_count: post.reposts?.[0]?.count ?? 0,
          is_liked: (post.user_liked?.length ?? 0) > 0,
          is_reposted: (post.user_reposted?.length ?? 0) > 0,
          is_bookmarked: true,
        };
      }) as Post[];
  },
};
