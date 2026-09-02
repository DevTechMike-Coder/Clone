import { postService, Post } from "./postService";
import { followService } from "./followService";

/**
 * Creator insights ("analytics dashboard" gap from the audit).
 *
 * No new tables: posts already carry `view_count`, and like/comment/repost
 * counts come back with every postService read. We aggregate the author's
 * own posts client-side — bounded by that user's post count, which is the
 * honest ceiling of what the schema supports without a metrics warehouse.
 */

export type CreatorInsights = {
  postsCount: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalReposts: number;
  followersCount: number;
  followingCount: number;
  /** Author's posts ranked by engagement, best first. */
  topPosts: Post[];
};

export function engagementScore(post: Post): number {
  return (
    (post.view_count ?? 0) +
    (post.like_count ?? 0) * 3 +
    (post.comment_count ?? 0) * 2 +
    (post.repost_count ?? 0) * 2
  );
}

export const insightsService = {
  async getCreatorInsights(userId: string): Promise<CreatorInsights> {
    const [posts, stats] = await Promise.all([
      postService.getPostsByUser(userId),
      followService.getUserStats(userId),
    ]);

    return {
      postsCount: posts.length,
      totalViews: posts.reduce((sum, p) => sum + (p.view_count ?? 0), 0),
      totalLikes: posts.reduce((sum, p) => sum + (p.like_count ?? 0), 0),
      totalComments: posts.reduce(
        (sum, p) => sum + (p.comment_count ?? 0),
        0
      ),
      totalReposts: posts.reduce((sum, p) => sum + (p.repost_count ?? 0), 0),
      followersCount: stats.followersCount,
      followingCount: stats.followingCount,
      topPosts: [...posts]
        .sort((a, b) => engagementScore(b) - engagementScore(a))
        .slice(0, 10),
    };
  },
};
