import { supabase } from "@/lib/supabase";
import { getAuthenticatedUserId } from "@/lib/session";

/**
 * Per-post flags describing how the currently signed-in user has
 * interacted with each post in `postIds`. Returned as three Sets so
 * callers can flip them on/off in O(1) while rendering.
 *
 * Why this exists:
 *
 *   The feed used to fetch these flags by embedding the like /
 *   repost / bookmark tables as to-many joins on `posts` and then
 *   filtering the result with `.eq('<join>.user_id', currentUser)`.
 *   PostgREST treats a to-many embed as an INNER JOIN: if the
 *   current user has not liked / reposted / bookmarked the post,
 *   the child table contributes zero rows and the parent post is
 *   dropped from the result set entirely. Combined with the
 *   RLS-tightening in supabase/migrations/20260828120000_security_hardening.sql
 *   (which restricts SELECT on `likes`, `reposts`, and `bookmarks`
 *   so a viewer only sees their own rows), this made every post
 *   disappear from the home feed for users who had not personally
 *   interacted with it.
 *
 *   The fix calls the SECURITY DEFINER RPC
 *   `public.user_post_interactions(p_post_ids uuid[])` (defined in
 *   supabase/migrations/20260831160000_user_post_interactions.sql),
 *   which returns one row per requested post id with `liked`,
 *   `reposted`, and `bookmarked` booleans. Because the function
 *   runs as the table owner and only consults rows where
 *   user_id = auth.uid(), it returns the caller's own interaction
 *   state regardless of any RLS on the underlying tables.
 */
export type PostInteractionFlags = {
  liked: Set<string>;
  reposted: Set<string>;
  bookmarked: Set<string>;
};

const EMPTY_FLAGS: PostInteractionFlags = {
  liked: new Set(),
  reposted: new Set(),
  bookmarked: new Set(),
};

/**
 * Look up the current user's like / repost / bookmark state for the
 * supplied post ids. Returns three empty Sets if the caller is not
 * signed in, if there are no post ids, or if the RPC call fails for
 * any reason — the feed is allowed to render with all flags false
 * rather than to fail closed.
 */
export async function fetchPostInteractions(
  postIds: readonly string[],
): Promise<PostInteractionFlags> {
  if (postIds.length === 0) return EMPTY_FLAGS;

  // If there is no signed-in user, the RPC would just return all
  // false for every post, but we can save the round-trip.
  const currentUserId = await getAuthenticatedUserId();
  if (!currentUserId) return EMPTY_FLAGS;

  try {
    const { data, error } = await supabase.rpc(
      "user_post_interactions",
      { p_post_ids: postIds as string[] },
    );

    if (error) {
      // The migration that creates the RPC may not have been
      // applied yet (fresh dev DB, partial restore, etc.). Fall
      // back to three explicit owner-scoped queries so the feed
      // still works.
      console.warn(
        "user_post_interactions RPC failed; falling back to direct lookups:",
        error,
      );
      return await fetchPostInteractionsFallback(postIds);
    }

    const liked = new Set<string>();
    const reposted = new Set<string>();
    const bookmarked = new Set<string>();

    for (const row of (data ?? []) as {
      post_id: string;
      liked: boolean;
      reposted: boolean;
      bookmarked: boolean;
    }[]) {
      if (row.liked) liked.add(row.post_id);
      if (row.reposted) reposted.add(row.post_id);
      if (row.bookmarked) bookmarked.add(row.post_id);
    }

    return { liked, reposted, bookmarked };
  } catch (error) {
    console.warn(
      "user_post_interactions threw; falling back to direct lookups:",
      error,
    );
    return await fetchPostInteractionsFallback(postIds);
  }
}

async function fetchPostInteractionsFallback(
  postIds: readonly string[],
): Promise<PostInteractionFlags> {
  const liked = new Set<string>();
  const reposted = new Set<string>();
  const bookmarked = new Set<string>();

  // Run the three lookups in parallel — they hit three different
  // tables and there is no data dependency between them.
  const [likesRes, repostsRes, bookmarksRes] = await Promise.all([
    supabase
      .from("likes")
      .select("post_id")
      .in("post_id", postIds as string[]),
    supabase
      .from("reposts")
      .select("post_id")
      .in("post_id", postIds as string[]),
    supabase
      .from("bookmarks")
      .select("post_id")
      .in("post_id", postIds as string[]),
  ]);

  // If the SELECT policy on one of these tables has been tightened
  // to owner-only, each query naturally returns only the caller's
  // own rows, which is exactly what we want here.
  for (const row of likesRes.data ?? []) liked.add(row.post_id as string);
  for (const row of repostsRes.data ?? []) reposted.add(row.post_id as string);
  for (const row of bookmarksRes.data ?? []) bookmarked.add(row.post_id as string);

  // Swallow errors: an empty Set is a safe default and lets the
  // feed render even if one of the tables is unreachable.
  if (likesRes.error) console.warn("likes lookup failed:", likesRes.error);
  if (repostsRes.error) console.warn("reposts lookup failed:", repostsRes.error);
  if (bookmarksRes.error) console.warn("bookmarks lookup failed:", bookmarksRes.error);

  return { liked, reposted, bookmarked };
}
