-- ============================================================
-- Add location and tagged_users to posts
-- ============================================================

alter table public.posts
    add column if not exists location text,
    add column if not exists tagged_users jsonb;

create index if not exists idx_posts_location on public.posts (location);
