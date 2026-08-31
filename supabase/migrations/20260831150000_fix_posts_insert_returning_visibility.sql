-- ============================================================
-- FIX: INSERT+RETURNING (i.e. every real post publish) rejected
-- with 42501 even though the INSERT policy is correct
-- ============================================================
-- SYMPTOM
--   insert into posts ... fails with
--     'new row violates row-level security policy for table "posts"'
--   (SQLSTATE 42501) while:
--     * the user is signed in with a fresh, valid token,
--     * auth.uid() (verified via RPC) equals the row's user_id,
--     * pg_policies shows a permissive INSERT policy for
--       `authenticated` with `with check (auth.uid() = user_id)`.
--   The 20260831130000_fix_posts_insert_policy.sql migration does NOT
--   change anything, because the INSERT policy was never the problem.
--
-- ROOT CAUSE
--   supabase-js `.insert(row).select()` makes PostgREST run
--   `INSERT ... RETURNING ...`. For RETURNING, Postgres additionally
--   checks every returned row against the table's SELECT policy
--   (the row must be visible to be returned).
--
--   Since 20260828120000_security_hardening.sql, the posts SELECT
--   policy is `USING (public.can_view_post(id))`, and can_view_post()
--   decides via `EXISTS (SELECT 1 FROM posts WHERE id = <row>)`.
--   That query cannot see the row being inserted by the very same
--   command (a STABLE function uses the statement-start snapshot and
--   the new row is not in the table yet), so EXISTS(...) is false,
--   the SELECT policy rejects the new row, and Postgres reports the
--   misleading "new row violates row-level security policy" error.
--
--   Reproduced on the repo's full migration chain: a plain INSERT
--   (no RETURNING) succeeds; INSERT ... RETURNING fails with 42501.
--
-- FIX
--   Short-circuit the author's own rows inline in the SELECT policy:
--     using (auth.uid() = user_id or public.can_view_post(id))
--   `auth.uid() = user_id` is evaluated first and true for the author
--   (the only person who can be INSERTing), so no can_view_post call
--   is reached during INSERT ... RETURNING.
--
--   Visibility is UNCHANGED for everyone: can_view_post() already
--   returns true for the author (`p.user_id = auth.uid()` branch),
--   and non-authors still go through it exactly as before.
--
-- Idempotent and safe to re-run.
-- ============================================================

drop policy if exists "Users can view visible posts" on public.posts;

create policy "Users can view visible posts"
    on public.posts
    for select
    using (
        auth.uid() = user_id
        or public.can_view_post(id)
    );
