-- ============================================================
-- STRUCTURED LOCATION + HASHTAGS ON POSTS
-- ============================================================
-- Location used to exist only as a "📍 ..." line inside the caption,
-- and hashtags only as inline "#tag" text — neither was searchable.
-- This adds first-class columns:
--
--   posts.location  text      — place picked in the post composer
--   posts.hashtags  text[]    — lowercase tags, maintained by trigger
--
-- A trigger keeps `hashtags` in sync with the caption on every
-- insert/update (client sends caption only), and existing posts are
-- backfilled once. GIN index makes tag lookups (`hashtags @> '{tag}'`)
-- fast. Location is searched with plain ILIKE — no extension needed.
-- ============================================================

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS hashtags text[] NOT NULL DEFAULT '{}';

-- Extract lowercase hashtags from a caption: #tag, #Tag24, #blessed_2x
CREATE OR REPLACE FUNCTION public.extract_hashtags(caption text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT COALESCE(array_agg(DISTINCT lower(m[1])), '{}')
  FROM regexp_matches(COALESCE(caption, ''), '#([A-Za-z0-9_]+)', 'g') AS m;
$$;

CREATE OR REPLACE FUNCTION public.sync_post_hashtags()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.hashtags := public.extract_hashtags(NEW.caption);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_sync_hashtags ON public.posts;
CREATE TRIGGER posts_sync_hashtags
    BEFORE INSERT OR UPDATE OF caption ON public.posts
    FOR EACH ROW EXECUTE FUNCTION public.sync_post_hashtags();

-- Backfill tags on everything already posted.
UPDATE public.posts
SET hashtags = public.extract_hashtags(caption)
WHERE caption LIKE '%#%';

CREATE INDEX IF NOT EXISTS posts_hashtags_gin_idx
    ON public.posts USING gin (hashtags);

CREATE INDEX IF NOT EXISTS posts_location_idx
    ON public.posts (location) WHERE location IS NOT NULL;
