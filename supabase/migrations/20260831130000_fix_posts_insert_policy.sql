-- ============================================================
-- FIX: "new row violates row-level security policy for table posts"
-- (SQLSTATE 42501 on INSERT)
-- ============================================================
-- The initial schema (20260428192604_initial_schema.sql) created the posts
-- INSERT policy "Authenticated users can insert their own posts" with
-- `with check (auth.uid() = user_id)`. The later security_hardening
-- migration only replaces the SELECT policy, so the INSERT policy should
-- still exist. If it does NOT (database set up from a partial migration,
-- or the policy dropped manually), publishing a post fails with 42501 even
-- though the user is signed in.
--
-- DIAGNOSTIC — run in the Supabase SQL editor to confirm:
--   select policyname, roles, cmd, permissive, with_check
--   from pg_policies
--   where schemaname = 'public' and tablename = 'posts'
--   order by cmd;
-- The INSERT row must show roles = {authenticated} (or {public}) and
-- permissive = PERMISSIVE. An INSERT policy scoped to another role, or any
-- RESTRICTIVE policy that fails, rejects the insert with the same 42501.
-- If the "for INSERT" row is missing (or mis-scoped), run this migration.
-- It is idempotent and safe to re-run.
-- ============================================================

drop policy if exists "Authenticated users can insert their own posts" on public.posts;

create policy "Authenticated users can insert their own posts"
    on public.posts
    for insert
    to authenticated
    with check (auth.uid() = user_id);
