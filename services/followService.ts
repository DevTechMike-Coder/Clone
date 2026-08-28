import { supabase } from "@/lib/supabase";
import { notificationService } from "./notificationService";

export type SuggestedUser = {
  id: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  followers_count: number;
  is_following: boolean;
};

export type UserStats = {
  followersCount: number;
  followingCount: number;
  likesCount: number;
};

export const followService = {
  async toggleFollow(targetUserId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in to follow users");
    if (user.id === targetUserId) throw new Error("You cannot follow yourself");

    const { data: existingFollow, error: fetchError } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError;
    }

    if (existingFollow) {
      // Unfollow
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("id", existingFollow.id);
      if (error) throw error;
      return { following: false };
    } else {
      // Follow
      const { error } = await supabase
        .from("follows")
        .insert([{ follower_id: user.id, following_id: targetUserId }]);
      if (error) throw error;

      // Send notification to followed user
      await notificationService.createNotification({
        userId: targetUserId,
        type: "follow",
      });

      return { following: true };
    }
  },

  async checkIsFollowing(targetUserId: string): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id === targetUserId) return false;

    const { data, error } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error checking follow status:", error);
      return false;
    }

    return !!data;
  },

  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const [followersRes, followingRes, postsRes] = await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", userId),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", userId),
        supabase
          .from("posts")
          .select("id, likes(count)")
          .eq("user_id", userId),
      ]);

      const followersCount = followersRes.count || 0;
      const followingCount = followingRes.count || 0;

      let likesCount = 0;
      if (postsRes.data) {
        likesCount = postsRes.data.reduce(
          (acc: number, post: any) => acc + (post.likes?.[0]?.count || 0),
          0
        );
      }

      return {
        followersCount,
        followingCount,
        likesCount,
      };
    } catch (error) {
      console.error("Error getting user stats:", error);
      return {
        followersCount: 0,
        followingCount: 0,
        likesCount: 0,
      };
    }
  },

  async getSuggestedUsers(limit = 20): Promise<SuggestedUser[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const currentUserId = user?.id;

    // Fetch profiles
    let query = supabase
      .from("profiles")
      .select(
        `
        id,
        username,
        full_name,
        avatar_url,
        bio,
        followers:follows!following_id(count),
        is_following:follows!following_id(follower_id)
      `
      )
      .limit(limit);

    if (currentUserId) {
      query = query
        .neq("id", currentUserId)
        .eq("is_following.follower_id", currentUserId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching suggested users:", error);
      throw error;
    }

    return (data || []).map((profile: any) => ({
      id: profile.id,
      username: profile.username,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      bio: profile.bio,
      followers_count: profile.followers?.[0]?.count || 0,
      is_following: (profile.is_following?.length || 0) > 0,
    }));
  },

  async getFollowers(userId: string): Promise<SuggestedUser[]> {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("follows")
      .select(
        `
        follower:follower_id (
          id,
          username,
          full_name,
          avatar_url,
          bio,
          followers:follows!following_id(count)
        )
      `
      )
      .eq("following_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching followers:", error);
      throw error;
    }

    const followers = (data || [])
      .map((item: any) => item.follower)
      .filter(Boolean);

    // Check which ones current user follows
    let followingSet = new Set<string>();
    if (currentUser && followers.length > 0) {
      const { data: myFollows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUser.id)
        .in(
          "following_id",
          followers.map((f: any) => f.id)
        );

      if (myFollows) {
        myFollows.forEach((f: any) => followingSet.add(f.following_id));
      }
    }

    return followers.map((f: any) => ({
      id: f.id,
      username: f.username,
      full_name: f.full_name,
      avatar_url: f.avatar_url,
      bio: f.bio,
      followers_count: f.followers?.[0]?.count || 0,
      is_following: followingSet.has(f.id),
    }));
  },

  async getFollowing(userId: string): Promise<SuggestedUser[]> {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("follows")
      .select(
        `
        following:following_id (
          id,
          username,
          full_name,
          avatar_url,
          bio,
          followers:follows!following_id(count)
        )
      `
      )
      .eq("follower_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching following:", error);
      throw error;
    }

    const following = (data || [])
      .map((item: any) => item.following)
      .filter(Boolean);

    // Check which ones current user follows
    let followingSet = new Set<string>();
    if (currentUser && following.length > 0) {
      const { data: myFollows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUser.id)
        .in(
          "following_id",
          following.map((f: any) => f.id)
        );

      if (myFollows) {
        myFollows.forEach((f: any) => followingSet.add(f.following_id));
      }
    }

    return following.map((f: any) => ({
      id: f.id,
      username: f.username,
      full_name: f.full_name,
      avatar_url: f.avatar_url,
      bio: f.bio,
      followers_count: f.followers?.[0]?.count || 0,
      is_following: followingSet.has(f.id),
    }));
  },
};
