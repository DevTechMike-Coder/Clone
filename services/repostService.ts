import { supabase } from "@/lib/supabase";
import { Post } from "./postService";
import { notificationService } from "./notificationService";

export const repostService = {
  toggleRepost: async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in to repost");

    const { data: existingRepost, error: fetchError } = await supabase
      .from("reposts")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError;
    }

    if (existingRepost) {
      const { error } = await supabase
        .from("reposts")
        .delete()
        .eq("id", existingRepost.id);
      if (error) throw error;
      return { reposted: false };
    } else {
      const { error } = await supabase
        .from("reposts")
        .insert([{ post_id: postId, user_id: user.id }]);
      if (error) throw error;

      // Notify post author
      try {
        const { data: postData } = await supabase
          .from("posts")
          .select("user_id")
          .eq("id", postId)
          .single();

        if (postData?.user_id) {
          await notificationService.createNotification({
            userId: postData.user_id,
            type: "repost",
            postId,
          });
        }
      } catch (notifErr) {
        console.warn("Could not notify post author of repost:", notifErr);
      }

      return { reposted: true };
    }
  },

  getRepostedPosts: async (userId: string): Promise<Post[]> => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("reposts")
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
      .eq("user_id", userId)
      .eq('posts.user_liked.user_id', user?.id ?? '00000000-0000-0000-0000-000000000000')
      .eq('posts.user_reposted.user_id', user?.id ?? '00000000-0000-0000-0000-000000000000')
      .eq('posts.user_bookmarked.user_id', user?.id ?? '00000000-0000-0000-0000-000000000000')
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reposts:", error);
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
          is_bookmarked: (post.user_bookmarked?.length ?? 0) > 0,
        };
      }) as Post[];
  },
};
