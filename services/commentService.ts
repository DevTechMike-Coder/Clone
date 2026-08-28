import { supabase } from "@/lib/supabase";
import { notificationService } from "./notificationService";

export type Comment = {
  id: string;
  content: string;
  post_id: string;
  user_id: string;
  parent_id?: string | null;
  created_at: string;
  profiles?: { username: string; full_name?: string; avatar_url?: string };
  replies?: Comment[];
};

export const commentService = {
  getComments: async (postId: string): Promise<Comment[]> => {
    const { data, error } = await supabase
      .from("comments")
      .select(`
        *,
        profiles (
          username,
          full_name,
          avatar_url
        )
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      throw error;
    }

    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    (data || []).forEach((c: any) => {
      commentMap.set(c.id, { ...c, replies: [] });
    });

    (data || []).forEach((c: any) => {
      const commentObj = commentMap.get(c.id)!;
      if (c.parent_id && commentMap.has(c.parent_id)) {
        commentMap.get(c.parent_id)!.replies!.push(commentObj);
      } else {
        rootComments.push(commentObj);
      }
    });

    // Return with newest top-level comments first
    return rootComments.reverse();
  },

  addComment: async (
    postId: string,
    content: string,
    parentId?: string | null
  ): Promise<Comment> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("You must be logged in to comment");
    }

    const payload: any = {
      post_id: postId,
      content,
      user_id: user.id,
    };

    if (parentId) {
      payload.parent_id = parentId;
    }

    const { data, error } = await supabase
      .from("comments")
      .insert([payload])
      .select(`
        *,
        profiles (
          username,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error("Error adding comment:", error);
      throw error;
    }

    // Find post author and notify
    try {
      const { data: postData } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single();

      if (postData?.user_id) {
        await notificationService.createNotification({
          userId: postData.user_id,
          type: "comment",
          postId,
        });
      }
    } catch (notifErr) {
      console.warn("Could not notify post author of comment:", notifErr);
    }

    return { ...data, replies: [] } as Comment;
  },
};