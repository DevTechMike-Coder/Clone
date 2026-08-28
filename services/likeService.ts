import { supabase } from "@/lib/supabase";
import { notificationService } from "./notificationService";

export const likeService = {
  toggleLike: async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in to like posts");

    // Check if like exists
    const { data: existingLike, error: fetchError } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw fetchError;
    }

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from("likes")
        .delete()
        .eq("id", existingLike.id);
      if (error) throw error;
      return { liked: false };
    } else {
      // Like
      const { error } = await supabase
        .from("likes")
        .insert([{ post_id: postId, user_id: user.id }]);
      if (error) throw error;

      // Find post author and notify
      const { data: postData } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single();

      if (postData?.user_id) {
        await notificationService.createNotification({
          userId: postData.user_id,
          type: "like",
          postId,
        });
      }

      return { liked: true };
    }
  },
};
