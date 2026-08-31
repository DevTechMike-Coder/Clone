-- ============================================================
-- FIX: posts disappear when the author's profile row is missing
-- ============================================================
-- The security_hardening migration defined public.can_view_post()
-- using an INNER JOIN to public.profiles. Because posts.user_id
-- normally references profiles(id), a post is expected to always
-- have an author profile. When that profile row is missing (e.g. a
-- user created outside the handle_new_user trigger, or a test seed
-- without profiles), the INNER JOIN drops the row entirely and
-- EXISTS(...) returns false -- so the post becomes invisible to
-- everyone, including its own author.
--
-- Switching to a LEFT JOIN keeps the row when the profile is absent.
-- In that case pr.is_private is NULL and COALESCE(pr.is_private,
-- false) treats the author as public, matching the app's default
-- (profiles.is_private default false) and the frontend, which already
-- renders posts with a missing profile as "Anonymous".
--
-- Idempotent and safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_view_post(p_post_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.posts p
      LEFT JOIN public.profiles pr ON pr.id = p.user_id
      WHERE p.id = p_post_id
        AND (
          p.user_id = auth.uid()
          OR COALESCE(pr.is_private, false) = false
          OR EXISTS (
            SELECT 1
            FROM public.follows f
            WHERE f.following_id = p.user_id
              AND f.follower_id = auth.uid()
          )
        )
    );
$$;

REVOKE ALL ON FUNCTION public.can_view_post(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_post(uuid) TO authenticated, service_role;
