-- ============================================================
-- DECISION: public.profiles SELECT visibility model
-- ============================================================
-- The initial schema (20260428192604_initial_schema.sql) created
--   "Anyone can view public profiles" ... for select using (true);
-- with no comment. When private accounts were later introduced
-- (20260828120000_security_hardening.sql), the private flag was
-- enforced only at the *content* layer (posts / comments / likes /
-- reposts / stories via can_view_post / follower checks) and this
-- profile-shell policy was deliberately left untouched.
--
-- This migration documents that decision explicitly so it is not
-- mistaken for an oversight, and makes the intent testable by the
-- RLS drift guard (scripts/check-rls.mjs).
--
-- THREAT MODEL (intentional, matches Instagram/TikTok)
--   * The profile SHELL is public: username, full_name, avatar_url,
--     bio, and the is_private flag itself are readable by anyone,
--     including anonymous requests. This is what makes search,
--     @mentions, following, and share sheets work before the viewer
--     is signed in, and it mirrors how private accounts on IG/TikTok
--     still expose an avatar + name + bio.
--   * Private-account CONTENT is gated separately: posts, comments,
--     likes, reposts, and stories produced by a private profile are
--     only visible to the author and to approved followers. That
--     gate lives in can_view_post() and the stories SELECT policy,
--     NOT in the profile row.
--   * The is_private flag being readable is required, not a leak:
--     a client has to know whether a profile is private to render
--     the correct "request to follow" affordance.
--   * Writes are NOT open: INSERT is scoped to auth.uid() = id and
--     UPDATE to auth.uid() = id, so a profile's own fields (name,
--     bio, avatar, website, is_private) can only be changed by the
--     owner.
--
-- If a future migration ever needs to restrict the profile shell
-- (e.g. hide is_private from anon), do it HERE by editing the
-- `using` clause and updating the RLS snapshot + guard in the same
-- change. Do not silently swap the expression.
-- ============================================================

drop policy if exists "Anyone can view public profiles" on public.profiles;
drop policy if exists "Public profile shells are readable" on public.profiles;

create policy "Public profile shells are readable"
    on public.profiles
    for select
    to anon, authenticated
    using (true);

comment on policy "Public profile shells are readable" on public.profiles is
    'Profile SHELL (username, full_name, avatar_url, bio, is_private) is intentionally public so search, mentions, follow and share work for anonymous and signed-in viewers alike. Private-account content is NOT exposed here; it is gated by can_view_post() and the stories SELECT policy. Writes stay owner-only (INSERT/UPDATE with auth.uid() = id). See 20260906000000_document_profiles_visibility.sql for the full threat model.';

comment on column public.profiles.is_private is
    'Whether the account is private. Publicly readable so clients can render the correct follow/request affordance; private accounts gate only their content (posts/comments/likes/reposts/stories), not this flag.';
