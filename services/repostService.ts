import { supabase } from "@/lib/supabase";
import { Post } from "./postService";
import { notificationService } from "./notificationService";
import { fetchPostInteractions } from "@/lib/postInteractions";

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
    // Step 1: pull every post that `userId` reposted, without
    // embedding the current user's like / repost / bookmark joins.
    //
    // The previous query embedded those as to-many joins and then
    // filtered with `.eq('posts.user_liked.user_id', currentUser)`.
    // That made posts the viewer has not personally liked / reposted
    // / bookmarked disappear from the result, and combined with the
    // tighter RLS on `likes` / `reposts` / `bookmarks` from
    // supabase/migrations/20260828120000_security_hardening.sql
    // it left the "repeat" tab on a user profile empty for viewers
    // who had not personally interacted with every repost. Step 2
    // fetches the per-user flags with the SECURITY DEFINER RPC
    // `public.user_post_interactions` so the post list itself is
    // never filtered by the current user's interaction state.
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
          reposts(count)
        )
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reposts:", error);
      throw error;
    }

    const postRows = (data ?? [])
      .filter((item: any) => item?.posts)
      .map((item: any) => item.posts);

    const flags = await fetchPostInteractions(
      postRows
        .map((post: any) => post?.id)
        .filter((id: unknown): id is string =>
          typeof id === "string" && id.length > 0,
        ),
    );

    return postRows.map(
      (post: any) =>
        ({
          ...post,
          comment_count: post.comments?.[0]?.count ?? 0,
          like_count: post.likes?.[0]?.count ?? 0,
          repost_count: post.reposts?.[0]?.count ?? 0,
          is_liked: flags.liked.has(post.id),
          is_reposted: flags.reposted.has(post.id),
          is_bookmarked: flags.bookmarked.has(post.id),
        }) as Post,
    );
  },
};
