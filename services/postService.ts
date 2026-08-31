import { File } from "expo-file-system";
import { supabase } from "../lib/supabase";

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

    const fullPost = {
      user_id,
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

    try {
      const { data, error } = await supabase
        .from("posts")
        .insert([fullPost])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      // If the new columns haven't been migrated yet, fall back to the
      // original post shape so publishing continues to work.
      const message = String(error?.message || error);
      const isMissingColumn = /column|does not exist|unknown column/i.test(message);

      if (!isMissingColumn) throw error;

      const { data, error: fallbackError } = await supabase
        .from("posts")
        .insert([{ user_id, media_url, media_type, caption }])
        .select()
        .single();

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
