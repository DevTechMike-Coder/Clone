import { File } from "expo-file-system";
import { supabase } from "../lib/supabase";
import { getAuthenticatedUserId } from "../lib/session";

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
          "will not help. In the Supabase SQL editor run " +
          "`select policyname, roles, cmd, permissive, with_check from pg_policies " +
          "where schemaname = 'public' and tablename = 'posts' order by cmd;`. " +
          "You need a row with cmd = INSERT, roles = {authenticated}, and " +
          "permissive = PERMISSIVE. " +
          `If there is no "for INSERT" row, apply ` +
          "supabase/migrations/20260831130000_fix_posts_insert_policy.sql. " +
          `The insert was attempted as user ${userId}.`,
    { cause: error }
  );

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
    const { data: { user } } = await supabase.auth.getUser();

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
        reposts(count),
        user_liked:likes(user_id),
        user_reposted:reposts(user_id),
        user_bookmarked:bookmarks(user_id)
      `,
      )
      .eq('user_liked.user_id', user?.id ?? '00000000-0000-0000-0000-000000000000')
      .eq('user_reposted.user_id', user?.id ?? '00000000-0000-0000-0000-000000000000')
      .eq('user_bookmarked.user_id', user?.id ?? '00000000-0000-0000-0000-000000000000')
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
      throw error;
    }

    return data.map((post: any) => ({
      ...post,
      comment_count: post.comments?.[0]?.count ?? 0,
      like_count: post.likes?.[0]?.count ?? 0,
      repost_count: post.reposts?.[0]?.count ?? 0,
      is_liked: (post.user_liked?.length ?? 0) > 0,
      is_reposted: (post.user_reposted?.length ?? 0) > 0,
      is_bookmarked: (post.user_bookmarked?.length ?? 0) > 0,
    })) as Post[];
  },

  async getPostsByUser(userId: string) {
    const { data: { user } } = await supabase.auth.getUser();

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
        reposts(count),
        user_liked:likes(user_id),
        user_reposted:reposts(user_id),
        user_bookmarked:bookmarks(user_id)
      `,
      )
      .eq("user_id", userId)
      .eq('user_liked.user_id', user?.id ?? '00000000-0000-0000-0000-000000000000')
      .eq('user_reposted.user_id', user?.id ?? '00000000-0000-0000-0000-000000000000')
      .eq('user_bookmarked.user_id', user?.id ?? '00000000-0000-0000-0000-000000000000')
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
      throw error;
    }

    return data.map((post: any) => ({
      ...post,
      comment_count: post.comments?.[0]?.count ?? 0,
      like_count: post.likes?.[0]?.count ?? 0,
      repost_count: post.reposts?.[0]?.count ?? 0,
      is_liked: (post.user_liked?.length ?? 0) > 0,
      is_reposted: (post.user_reposted?.length ?? 0) > 0,
      is_bookmarked: (post.user_bookmarked?.length ?? 0) > 0,
    })) as Post[];
  },

  async getPostById(postId: string): Promise<Post | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
        reposts(count),
        user_liked:likes(user_id),
        user_reposted:reposts(user_id),
        user_bookmarked:bookmarks(user_id)
      `
      )
      .eq("id", postId)
      .eq("user_liked.user_id", user?.id ?? "00000000-0000-0000-0000-000000000000")
      .eq("user_reposted.user_id", user?.id ?? "00000000-0000-0000-0000-000000000000")
      .eq("user_bookmarked.user_id", user?.id ?? "00000000-0000-0000-0000-000000000000")
      .single();

    if (error) {
      console.error("Error fetching post by id:", error);
      return null;
    }

    return {
      ...data,
      comment_count: data.comments?.[0]?.count ?? 0,
      like_count: data.likes?.[0]?.count ?? 0,
      repost_count: data.reposts?.[0]?.count ?? 0,
      is_liked: (data.user_liked?.length ?? 0) > 0,
      is_reposted: (data.user_reposted?.length ?? 0) > 0,
      is_bookmarked: (data.user_bookmarked?.length ?? 0) > 0,
    } as Post;
  },

  async searchPosts(query: string): Promise<Post[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const {
      data: { user },
    } = await supabase.auth.getUser();

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
        reposts(count),
        user_liked:likes(user_id),
        user_reposted:reposts(user_id),
        user_bookmarked:bookmarks(user_id)
      `
      )
      .ilike("caption", `%${escapedQuery}%`)
      .eq("user_liked.user_id", user?.id ?? "00000000-0000-0000-0000-000000000000")
      .eq("user_reposted.user_id", user?.id ?? "00000000-0000-0000-0000-000000000000")
      .eq("user_bookmarked.user_id", user?.id ?? "00000000-0000-0000-0000-000000000000")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Error searching posts:", error);
      return [];
    }

    return (data || []).map((post: any) => ({
      ...post,
      comment_count: post.comments?.[0]?.count ?? 0,
      like_count: post.likes?.[0]?.count ?? 0,
      repost_count: post.reposts?.[0]?.count ?? 0,
      is_liked: (post.user_liked?.length ?? 0) > 0,
      is_reposted: (post.user_reposted?.length ?? 0) > 0,
      is_bookmarked: (post.user_bookmarked?.length ?? 0) > 0,
    })) as Post[];
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
