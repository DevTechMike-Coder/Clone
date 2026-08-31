-- ============================================================
-- Music catalog + music/filter metadata on posts
-- ============================================================

-- Music catalog (id is text so the bundled demo catalog ids work too).
create table if not exists public.music_tracks (
    id text primary key,
    title text not null,
    artist text not null,
    cover_url text,
    audio_url text,
    duration_seconds int default 0,
    license text,
    is_trending boolean default false,
    created_at timestamptz default now()
);

-- Post metadata for sounds and applied filters.
-- Kept as snapshot columns (rather than a hard FK) so old/demo catalog ids
-- that are not present in music_tracks still work without breaking posting.
alter table public.posts
    add column if not exists filter_id text,
    add column if not exists music_track_id text,
    add column if not exists music_track_title text,
    add column if not exists music_track_artist text,
    add column if not exists music_track_cover_url text,
    add column if not exists duration_seconds int,
    add column if not exists has_sound boolean default false;

alter table public.music_tracks enable row level security;

drop policy if exists "Anyone can read music tracks" on public.music_tracks;
create policy "Anyone can read music tracks"
    on public.music_tracks
    for select
    using (true);

drop policy if exists "Authenticated users can read music tracks" on public.music_tracks;
create policy "Authenticated users can read music tracks"
    on public.music_tracks
    for select
    to authenticated
    using (true);

-- Admin/service-role writers can manage the catalog. App users cannot mutate it.
drop policy if exists "Service role can write music tracks" on public.music_tracks;
create policy "Service role can write music tracks"
    on public.music_tracks
    for all
    to service_role
    using (true)
    with check (true);

create index if not exists idx_posts_music_track_id on public.posts (music_track_id);
create index if not exists idx_posts_filter_id on public.posts (filter_id);
create index if not exists idx_music_tracks_trending on public.music_tracks (is_trending);
