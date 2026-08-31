-- ============================================================
-- FIX: home/profile/search feeds hide other users' posts
-- ============================================================
-- SYMPTOM
--   After signing in as user B, the home feed (and user profile,
--   search, bookmarks, and reposts tabs) is empty even when user A
--   has published posts that user B is allowed to see.
--
--   The post is in the database and `select * from posts` returns
--   it just fine, but the application code that builds the feed
--   sees zero rows.
--
-- ROOT CAUSE
--   The feed query embeds the current user's like/repost/bookmark
--   state via PostgREST to-many joins like:
--
--     user_liked:likes(user_id),
--     user_reposted:reposts(user_id),
--     user_bookmarked:bookmarks(user_id)
--
--   and then filters the result set with:
--
--     .eq('user_liked.user_id', currentUserId)
--     .eq('user_reposted.user_id', currentUserId)
--     .eq('user_bookmarked.user_id', currentUserId)
--
--   Two layers of filtering combine to delete posts the viewer
--   hasn't personally interacted with:
--
--   1. PostgREST treats a to-many embed as an INNER JOIN. If the
--      current user has not liked/reposted/bookmarked the post,
--      the child table contributes zero rows and the parent post
--      is dropped from the result set, even though the post itself
--      is visible to the viewer.
--
--   2. The 20260828120000_security_hardening migration replaced
--      the open SELECT policies on `likes`, `reposts`, and (for
--      bookmarks) the open SELECT policy on `bookmarks` with
--      owner-only or `can_view_post(post_id)` checks. That is the
--      correct policy for those tables, but it makes the join
--      return only rows the viewer is allowed to see — which for
--      a post the viewer has not liked is the empty set, and so
--      the parent post is dropped for the same reason.
--
--   The 20260831150000 migration already fixed the SELECT policy
--   on `posts` so the parent post is visible. The remaining hole
--   is in the way the application discovers the per-user flags:
--   it asks PostgREST to join and filter, and PostgREST drops the
--   parent when the join is empty.
--
-- FIX
--   Stop relying on a to-many join + filter for the current user's
--   like/repost/bookmark state. Use a SECURITY DEFINER RPC that
--   returns one row per requested post id with three booleans,
--   scoped to auth.uid() so it sees the caller's own rows in
--   `likes`, `reposts`, and `bookmarks` regardless of any future
--   RLS tightening on those tables.
--
--   The function is `stable` and `security definer`, takes an
--   array of post ids, and returns a set of
--   (post_id, liked, reposted, bookmarked). The application calls
--   it once per page of posts and merges the flags in JS, so the
--   post list itself is never filtered out by the current user's
--   interaction state.
--
--   Only the caller's own rows are consulted, and `auth.uid()` is
--   enforced server-side, so the function does not leak any other
--   user's interaction state.
--
--   Idempotent and safe to re-run.
-- ============================================================

create or replace function public.user_post_interactions(p_post_ids uuid[])
returns table (
    post_id uuid,
    liked boolean,
    reposted boolean,
    bookmarked boolean
)
language sql
stable
security definer
set search_path = ''
as $$
    with me as (
        select auth.uid() as uid
    )
    select
        p.post_id,
        exists (
            select 1
            from public.likes l
            where l.post_id = p.post_id
              and l.user_id = (select uid from me)
        ) as liked,
        exists (
            select 1
            from public.reposts r
            where r.post_id = p.post_id
              and r.user_id = (select uid from me)
        ) as reposted,
        exists (
            select 1
            from public.bookmarks b
            where b.post_id = p.post_id
              and b.user_id = (select uid from me)
        ) as bookmarked
    from unnest(p_post_ids) as p(post_id);
$$;

revoke all on function public.user_post_interactions(uuid[]) from public;

grant execute on function public.user_post_interactions(uuid[]) to authenticated, service_role;
