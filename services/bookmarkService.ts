import { supabase } from "@/lib/supabase";
import { Post } from "./postService";
import { fetchPostInteractions } from "@/lib/postInteractions";

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
    if (!user) return [];
    // Bookmarks are private — never fetch another user's saved posts.
    if (userId && userId !== user.id) return [];
    const targetUserId = user.id;

    // Step 1: list the bookmarks the caller owns and pull each
    // bookmarked post with the data the feed needs.
    //
    // The previous query embedded the current user's like / repost /
    // bookmark state as to-many joins on `posts` and then filtered
    // with `.eq('posts.user_liked.user_id', ...)`. PostgREST turns
    // a to-many embed into an INNER JOIN, so posts the viewer has
    // not personally liked / reposted / bookmarked were silently
    // dropped — which, combined with the owner-only SELECT policy
    // on `bookmarks` introduced in
    // supabase/migrations/20260828120000_security_hardening.sql,
    // meant the bookmarks tab frequently showed nothing at all for
    // the signed-in user. We now fetch the post data without those
    // per-user joins and look up the flags in step 2.
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
          reposts(count)
        )
      `,
      )
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching bookmarks:", error);
      throw error;
    }

    // Step 2: collect the post ids and pull the current user's
    // like / repost / bookmark state for them in one round-trip.
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
          // The post is in the bookmarks list by construction, so
          // is_bookmarked is always true here.
          is_bookmarked: true,
        }) as Post,
    );
  },
};
