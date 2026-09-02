-- ============================================================
-- CONTENT MODERATION: REPORTS + USER BLOCKS
-- ============================================================
-- The app had no report/flag/block logic at all (see audit). This adds:
--
--   reports — a user flags a post OR another user, with a reason.
--             Write-only for reporters; nobody else can read them
--             (admins review from the dashboard with the service role).
--
--   blocks  — blocker hides blocked (and vice versa) across the app.
--             Rows are private to the blocker: the blocked user must
--             never learn who blocked them, so SELECT is owner-only and
--             the bidirectional resolution the feed needs goes through
--             the SECURITY DEFINER `blocked_user_ids()` below (returns
--             ids only, never direction).
--
-- Feed filtering is applied client-side in postService via that RPC.
-- ============================================================

-- ------------------------------------------------------------
-- REPORTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    post_id     uuid REFERENCES public.posts (id) ON DELETE CASCADE,
    user_id     uuid REFERENCES public.profiles (id) ON DELETE CASCADE,
    reason      text NOT NULL CHECK (reason IN (
                    'spam', 'harassment', 'hate_speech', 'nudity',
                    'violence', 'misinformation', 'other'
                )),
    details     text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    -- exactly one target per report
    CHECK (((post_id IS NOT NULL)::int + (user_id IS NOT NULL)::int) = 1),
    -- cannot report yourself
    CHECK (reporter_id IS DISTINCT FROM user_id)
);

-- One report per (reporter, target); NULLs can't dedupe, hence partial indexes.
CREATE UNIQUE INDEX IF NOT EXISTS reports_unique_post
    ON public.reports (reporter_id, post_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS reports_unique_user
    ON public.reports (reporter_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS reports_created_at_idx
    ON public.reports (created_at DESC);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;

CREATE POLICY "Users can create reports" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Reporters can see (and track) only their own filings.
CREATE POLICY "Users can view own reports" ON public.reports
    FOR SELECT USING (auth.uid() = reporter_id);

-- ------------------------------------------------------------
-- BLOCKS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocks (
    blocker_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    blocked_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own blocks" ON public.blocks;
DROP POLICY IF EXISTS "Users can block others" ON public.blocks;
DROP POLICY IF EXISTS "Users can unblock" ON public.blocks;

CREATE POLICY "Users can view own blocks" ON public.blocks
    FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others" ON public.blocks
    FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock" ON public.blocks
    FOR DELETE USING (auth.uid() = blocker_id);

-- All user ids the current viewer must not see content from (or be seen
-- by), in both directions. SECURITY DEFINER so the "blocked" side can be
-- resolved without exposing who blocked whom.
CREATE OR REPLACE FUNCTION public.blocked_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT blocked_id FROM public.blocks WHERE blocker_id = auth.uid()
  UNION
  SELECT blocker_id FROM public.blocks WHERE blocked_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.blocked_user_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.blocked_user_ids() TO authenticated, service_role;
