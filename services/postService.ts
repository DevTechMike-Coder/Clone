import { File } from "expo-file-system";
import { supabase } from "../lib/supabase";
import { getAuthenticatedUserId } from "../lib/session";
import { fetchPostInteractions } from "../lib/postInteractions";

export type Post = {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "video" | "image";
  thumbnail_url?: string;
  caption?: string;
  view_count: number;
  created_at: string;
  filter_id?: string;
  music_track_id?: string;
  music_track_title?: string;
  music_track_artist?: string;
  music_track_cover_url?: string;
  /** Present once 20260901120000_sounds_library.sql is applied + the sound was self-hosted. */
  music_track_audio_url?: string | null;
  music_track_attribution?: string | null;
  duration_seconds?: number;
  has_sound?: boolean;
  profiles: {
    username: string;
    full_name?: string;
    avatar_url?: string;
  };
  comment_count?: number;
  like_count?: number;
  is_liked?: boolean;
  repost_count?: number;
  is_reposted?: boolean;
  is_bookmarked?: boolean;
};

/**
 * SQLSTATE 42501 = insufficient_privilege. Postgres raises it for two very
 * different situations that used to be reported identically:
 *
 *   1. "new row violates row-level security policy for table \"posts\"" —
 *      RLS rejected the row (no session, or a missing/unmatched INSERT
 *      policy).
 *   2. "permission denied for table posts" — the `authenticated` role was
 *      never granted INSERT on the table at all.
 *
 * Only case 1 with no recoverable session is actually "please sign in again".
 * Everything else is a database-side problem the user cannot fix by signing
 * in, so the message has to say which one it is and keep the server's own
 * wording instead of replacing it with a guess.
 */
const isRlsOrPermissionDenied = (error: any) => String(error?.code) === "42501";

const isPermissionDenied = (error: any) =>
  isRlsOrPermissionDenied(error) && /permission denied/i.test(String(error?.message ?? ""));

const describePostgresError = (error: any) => {
  const message = String(error?.message ?? error ?? "unknown database error");
  const details = error?.details ? ` Details: ${error.details}` : "";
  const hint = error?.hint ? ` Hint: ${error.hint}` : "";
  return `${message}${details}${hint}`;
};

/** Thrown when there is genuinely no usable session left. */
const notSignedInError = (cause: any) =>
  new Error(
    "Your sign-in has expired. Sign in again, then post once more.",
    { cause }
  );

/**
 * Thrown when the session IS valid but the database still refused the INSERT.
 * Signing in again cannot fix this, so say so and name the actual check.
 */
const databaseRejectedInsertError = (error: any, userId: string) =>
  new Error(
    isPermissionDenied(error)
      ? "Signed in, but Supabase refused the insert: the `authenticated` role " +
          `has no INSERT permission on public.posts. ${describePostgresError(error)} ` +
          "Grant it in the Supabase SQL editor: " +
          "`grant insert on table public.posts to authenticated;`"
      : "Signed in, but Supabase's row-level security refused the post insert. " +
          `${describePostgresError(error)} ` +
          "This is a database problem, not a sign-in problem — signing in again " +
          "will not help. Known causes, in order of likelihood: (1) the posts " +
          "SELECT policy uses can_view_post(id), which cannot see the row during " +
          "INSERT ... RETURNING — apply supabase/migrations/" +
          "20260831150000_fix_posts_insert_returning_visibility.sql; " +
          "(2) the INSERT policy on public.posts is missing or mis-scoped — run " +
          "`select policyname, roles, cmd, permissive, with_check from pg_policies " +
          "where schemaname = 'public' and tablename = 'posts' order by cmd;` — you " +
          "need a row with cmd = INSERT, roles = {authenticated}, and permissive = " +
          "PERMISSIVE; if there is no \"for INSERT\" row, apply " +
          "supabase/migrations/20260831130000_fix_posts_insert_policy.sql. " +
          `The insert was attempted as user ${userId}.`,
    { cause: error }
  );

/**
 * Merge the current user's like / repost / bookmark state onto a
 * raw post list returned by PostgREST.
 *
 * The previous feed query used three to-many embeds
 * (`user_liked:likes(user_id)`, `user_reposted:reposts(user_id)`,
 * `user_bookmarked:bookmarks(user_id)`) and filtered the result
 * with `.eq('<embed>.user_id', currentUserId)`. That makes the
 * post list shrink to only posts the current user has personally
 * liked/reposted/bookmarked, and combined with the tighter RLS
 * on those tables it made every post disappear from the home
 * feed for users who had not interacted with it. See
 * supabase/migrations/20260831160000_user_post_interactions.sql.
 *
 * This helper keeps the original post shape (with `comment_count`,
 * `like_count`, `repost_count` and the `is_liked` / `is_reposted`
 * / `is_bookmarked` flags the UI reads) but builds the flags
 * from a separate per-user lookup, so the post list itself is
 * never filtered out.
 */
async function mergeInteractionFlags(
  rows: Record<string, any>[],
): Promise<Post[]> {
  if (rows.length === 0) return [];

  const postIds = rows
    .map((row) => row?.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  const flags = await fetchPostInteractions(postIds);

  return rows.map((post: any) => ({
    ...post,
    comment_count: post.comments?.[0]?.count ?? 0,
    like_count: post.likes?.[0]?.count ?? 0,
    repost_count: post.reposts?.[0]?.count ?? 0,
    is_liked: flags.liked.has(post.id),
    is_reposted: flags.reposted.has(post.id),
    is_bookmarked: flags.bookmarked.has(post.id),
  })) as Post[];
}

export const postService = {
  async createPost(post: {
    user_id: string;
    media_url: string;
    media_type: "video" | "image";
    caption?: string;
    filter_id?: string;
    music_track_id?: string;
    music_track_title?: string;
    music_track_artist?: string;
    music_track_cover_url?: string;
    music_track_audio_url?: string;
    music_track_attribution?: string;
    duration_seconds?: number;
    has_sound?: boolean;
  }) {
    const { user_id, media_url, media_type, caption, ...optionalMeta } = post;

    // Use the user id from the token the Supabase client actually holds,
    // not just the React context. A stale/expired (or orphaned) session
    // makes auth.uid() NULL in the database, and RLS then rejects the
    // insert with 42501 ("new row violates row-level security policy")
    // even though the UI thinks you are signed in. getAuthenticatedUserId()
    // refreshes an expired token first, so a stale-but-recoverable session
    // keeps working instead of failing.
    const currentUserId = (await getAuthenticatedUserId()) ?? user_id;

    const fullPost = {
      user_id: currentUserId,
      media_url,
      media_type,
      caption,
      filter_id: optionalMeta.filter_id,
      music_track_id: optionalMeta.music_track_id,
      music_track_title: optionalMeta.music_track_title,
      music_track_artist: optionalMeta.music_track_artist,
      music_track_cover_url: optionalMeta.music_track_cover_url,
      music_track_audio_url: optionalMeta.music_track_audio_url,
      music_track_attribution: optionalMeta.music_track_attribution,
      duration_seconds: optionalMeta.duration_seconds,
      has_sound: optionalMeta.has_sound,
    };

    const insertRow = (row: Record<string, unknown>) =>
      supabase.from("posts").insert([row]).select().single();

    try {
      const { data, error } = await insertRow(fullPost);

      if (error) throw error;
      return data;
    } catch (error: any) {
      // The session may have expired between the lookup above and this
      // insert, so refresh once and retry before declaring failure. What we
      // say afterwards depends on whether that refresh produced a user.
      if (isRlsOrPermissionDenied(error)) {
        const refreshedUserId = await getAuthenticatedUserId();

        if (!refreshedUserId) throw notSignedInError(error);

        const { data, error: retryError } = await insertRow({
          ...fullPost,
          user_id: refreshedUserId,
        });

        if (!retryError) return data;
        // Still refused with a valid session: the database is at fault.
        if (isRlsOrPermissionDenied(retryError)) {
          throw databaseRejectedInsertError(retryError, refreshedUserId);
        }

        // Anything else (e.g. the retry hit a not-yet-migrated column) falls
        // through to the shared handling below.
        error = retryError;
      }

      // If the new columns haven't been migrated yet, fall back to the
      // original post shape so publishing continues to work.
      const message = String(error?.message || error);
      const isMissingColumn = /column|does not exist|unknown column/i.test(message);

      if (!isMissingColumn) throw error;

      const { data, error: fallbackError } = await insertRow({
        user_id: currentUserId,
        media_url,
        media_type,
        caption,
      });

      if (fallbackError) throw fallbackError;
      return data;
    }
  },

  async getPosts() {
    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        *,
        profiles (
          username,
          full_name,
          avatar_url
        ),
        comments(count),
        likes(count),
        reposts(count)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
      throw error;
    }

    return mergeInteractionFlags(data ?? []);
  },

  async getPostsByUser(userId: string) {
    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        *,
        profiles (
          username,
          full_name,
          avatar_url
        ),
        comments(count),
        likes(count),
        reposts(count)
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
      throw error;
    }

    return mergeInteractionFlags(data ?? []);
  },

  async getPostById(postId: string): Promise<Post | null> {
    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        *,
        profiles (
          username,
          full_name,
          avatar_url
        ),
        comments(count),
        likes(count),
        reposts(count)
      `
      )
      .eq("id", postId)
      .single();

    if (error) {
      console.error("Error fetching post by id:", error);
      return null;
    }

    const [merged] = await mergeInteractionFlags([data]);
    return merged ?? null;
  },

  async searchPosts(query: string): Promise<Post[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const escapedQuery = trimmedQuery.replace(/[\%_]/g, (char) => `\${char}`);

    const { data, error } = await supabase
      .from("posts")
      .select(
        `
        *,
        profiles (
          username,
          full_name,
          avatar_url
        ),
        comments(count),
        likes(count),
        reposts(count)
      `
      )
      .ilike("caption", `%${escapedQuery}%`)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Error searching posts:", error);
      return [];
    }

    return mergeInteractionFlags(data ?? []);
  },

  async uploadMedia(uri: string, userId: string, mediaType: "video" | "image" = "image") {
    const ext = mediaType === "video" ? "mp4" : "jpg";
    const contentType = mediaType === "video" ? "video/mp4" : "image/jpeg";
    const fileName = `${userId}/${Date.now()}.${ext}`;

    // Modern Expo File API reads real binary directly into ArrayBuffer
    const file = new File(uri);
    const arrayBuffer = await file.arrayBuffer();

    const { data, error } = await supabase.storage
      .from("posts")
      .upload(fileName, arrayBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error("Supabase post upload error:", error);
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("posts").getPublicUrl(fileName);

    return publicUrl;
  },
};
