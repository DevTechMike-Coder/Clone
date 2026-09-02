import { supabase } from "@/lib/supabase";

/**
 * Content moderation: reports (flag a post/user for review) and blocks
 * (hide each other across feeds/search). Schema lives in
 * supabase/migrations/20260902140000_moderation.sql.
 */

export const REPORT_REASONS = [
  { id: "spam", label: "Spam" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "hate_speech", label: "Hate speech" },
  { id: "nudity", label: "Nudity or sexual content" },
  { id: "violence", label: "Violence" },
  { id: "misinformation", label: "False information" },
  { id: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["id"];

/** Postgres unique-violation code — raised when the same report is re-filed. */
const PG_UNIQUE_VIOLATION = "23505";

export const moderationService = {
  async reportPost(
    postId: string,
    reason: ReportReason,
    details?: string
  ): Promise<"created" | "duplicate"> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in to report");

    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      post_id: postId,
      reason,
      details: details?.trim() || null,
    });

    if (error?.code === PG_UNIQUE_VIOLATION) return "duplicate";
    if (error) throw error;
    return "created";
  },

  async reportUser(
    userId: string,
    reason: ReportReason,
    details?: string
  ): Promise<"created" | "duplicate"> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in to report");

    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      user_id: userId,
      reason,
      details: details?.trim() || null,
    });

    if (error?.code === PG_UNIQUE_VIOLATION) return "duplicate";
    if (error) throw error;
    return "created";
  },

  async blockUser(userId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in");
    if (user.id === userId) throw new Error("You cannot block yourself");

    const { error } = await supabase
      .from("blocks")
      .insert({ blocker_id: user.id, blocked_id: userId });
    if (error && error.code !== PG_UNIQUE_VIOLATION) throw error;
  },

  async unblockUser(userId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("You must be logged in");

    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", userId);
    if (error) throw error;
  },

  /** Have I blocked this user? (direction chosen by me — safe to ask) */
  async isBlocked(userId: string): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { count, error } = await supabase
      .from("blocks")
      .select("*", { count: "exact", head: true })
      .eq("blocker_id", user.id)
      .eq("blocked_id", userId);
    if (error) return false;
    return (count ?? 0) > 0;
  },

  /**
   * Ids of every user the viewer must not see (and not be seen by), in
   * both block directions. Resolved server-side so the blocked party can
   * never read who blocked them.
   */
  async getBlockedUserIds(): Promise<string[]> {
    const { data, error } = await supabase.rpc("blocked_user_ids");
    if (error) {
      console.warn("blocked_user_ids failed:", error.message);
      return [];
    }
    return (data ?? []).map((row: any) =>
      typeof row === "string" ? row : row.blocked_user_ids ?? row.blocked_id
    );
  },
};
