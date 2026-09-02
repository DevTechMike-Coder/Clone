-- ============================================================
-- FILTER INTENSITY + VIGNETTE SUPPORT
-- ============================================================
-- Filters were a single hardcoded tint per id, always rendered at the
-- same strength. The composer addds an intensity slider (0.2–1.0); the
-- value persists here so every viewer (story viewer, post feed, post
-- detail) renders the same strength the author picked. NULL/1.0 keeps
-- historical rows visually identical.
-- ============================================================

ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS filter_intensity real
        CHECK (filter_intensity IS NULL OR filter_intensity BETWEEN 0 AND 1.5);

ALTER TABLE public.stories
    ADD COLUMN IF NOT EXISTS filter_intensity real
        CHECK (filter_intensity IS NULL OR filter_intensity BETWEEN 0 AND 1.5);
