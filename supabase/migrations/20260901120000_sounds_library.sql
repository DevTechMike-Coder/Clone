-- ============================================================
-- Self-hosted sound library
-- ------------------------------------------------------------
-- This completes the "replace static music" work that
-- 20260831120000_music_and_filters.sql started: the catalog
-- table and the per-post snapshot columns already existed, but
-- there was nowhere to host audio, nothing to seed, no rights
-- provenance beyond a bare `license` text, and posts could not
-- play their sound because only title/artist/cover were
-- snapshotted (not the audio URL).
--
--   1. `sounds` storage bucket  -> where the audio lives
--   2. provenance columns       -> attribution / license_url / storage_path
--   3. playable snapshot        -> posts.music_track_audio_url
--   4. usage counts as a VIEW   -> never a mutable counter column
-- ============================================================

-- ------------------------------------------------------------
-- 1) PUBLIC STORAGE BUCKET FOR TRACK AUDIO + COVER ART
-- ------------------------------------------------------------
-- Public because a sound attached to a post has to be
-- streamable by anyone who can see the post (the feed renders
-- for signed-out visitors too). It is deliberately NOT
-- writable from the app: the only write policy below is for
-- `service_role`, so seeding goes through
-- `scripts/seed-music.mjs` (or the SQL editor), never through
-- a user session. Same shape as the `chat` bucket in
-- 20260828120000_security_hardening.sql.
insert into storage.buckets (id, name, public)
values ('sounds', 'sounds', true)
on conflict (id) do update set public = true;

drop policy if exists "Sound files are publicly readable" on storage.objects;
drop policy if exists "Only the service role can upload sounds" on storage.objects;
drop policy if exists "Only the service role can replace sounds" on storage.objects;
drop policy if exists "Only the service role can delete sounds" on storage.objects;

create policy "Sound files are publicly readable"
    on storage.objects
    for select
    using (bucket_id = 'sounds');

-- service_role has BYPASSRLS, so these are belt-and-braces
-- documentation of intent: anon/authenticated have no policy at
-- all for this bucket and are therefore denied by default.
create policy "Only the service role can upload sounds"
    on storage.objects
    for insert
    to service_role
    with check (bucket_id = 'sounds');

create policy "Only the service role can replace sounds"
    on storage.objects
    for update
    to service_role
    using (bucket_id = 'sounds')
    with check (bucket_id = 'sounds');

create policy "Only the service role can delete sounds"
    on storage.objects
    for delete
    to service_role
    using (bucket_id = 'sounds');

-- ------------------------------------------------------------
-- 2) CATALOG PROVENANCE
-- ------------------------------------------------------------
-- `license` already existed. The three additions below are what
-- make the library defensible: `attribution` is what a CC-BY
-- track obliges you to display, `license_url` is the evidence,
-- and `storage_path` is the bucket key so a public URL can be
-- rebuilt if the project ref ever changes.
alter table public.music_tracks
    add column if not exists attribution text,
    add column if not exists license_url text,
    add column if not exists storage_path text,
    add column if not exists genre text,
    add column if not exists updated_at timestamptz default now();

comment on column public.music_tracks.license is
    'SPDX-ish tag for the terms the track was taken under, e.g. CC0-1.0, CC-BY-4.0, PIXABAY, LICENSED. ''UNVERIFIED'' (the default) means nobody recorded where it came from.';
comment on column public.music_tracks.attribution is
    'Credit string the license requires to be shown to end users. Required for CC-BY; NULL means no attribution obligation was recorded.';
comment on column public.music_tracks.storage_path is
    'Object key inside the `sounds` bucket, e.g. tracks/aurora-glow.mp3. audio_url is the derived public URL.';

-- A track whose audio is in the bucket is a complete record; keep
-- the pair consistent so a row cannot claim audio it does not have.
create index if not exists idx_music_tracks_storage_path
    on public.music_tracks (storage_path)
    where storage_path is not null;

-- ------------------------------------------------------------
-- 3) PLAYABLE POSTS
-- ------------------------------------------------------------
-- Snapshot columns (not a FK) for the same reason as before: a
-- post published against the bundled/demo catalog must keep
-- rendering even if that id is never inserted into music_tracks.
-- Adding the audio URL to the snapshot is what lets the feed and
-- the post detail screen play the sound without a second query.
alter table public.posts
    add column if not exists music_track_audio_url text,
    add column if not exists music_track_attribution text;

comment on column public.posts.music_track_audio_url is
    'Immutable snapshot of the track URL at publish time, so editing or removing a catalog row never silently changes the audio on an existing post.';

-- ------------------------------------------------------------
-- 4) USAGE COUNTS (real trending, not a hand-set boolean)
-- ------------------------------------------------------------
-- "usageCount" as an UPDATE-the-row counter would race and drift
-- (two inserts, one increment lost; a deleted post never
-- decremented). Deriving it is cheap at this scale and always
-- correct.
--
-- security_invoker matters: without it the view runs as its owner
-- and bypasses RLS on `posts`, leaking how many posts private
-- accounts have attached to a given sound.
create or replace view public.music_track_usage
    with (security_invoker = true) as
select mt.id                                   as music_track_id,
       mt.title,
       mt.artist,
       count(p.id)::int                        as usage_count,
       max(p.created_at)                       as last_used_at
from public.music_tracks mt
left join public.posts p
       on p.music_track_id = mt.id
group by mt.id, mt.title, mt.artist;

alter view public.music_track_usage owner to postgres;

grant select on public.music_track_usage to anon, authenticated, service_role;

-- Ranking helper the API can call directly when the catalog grows
-- past a few hundred rows and grouping in the app stops being free.
create or replace function public.trending_music_tracks(p_limit int default 20)
returns table (
    music_track_id text,
    title text,
    artist text,
    usage_count int
)
language sql
stable
security invoker
as $$
    select u.music_track_id,
           u.title,
           u.artist,
           u.usage_count
    from public.music_track_usage u
    where u.usage_count > 0
    order by u.usage_count desc, u.last_used_at desc nulls last
    limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

revoke all on function public.trending_music_tracks(int) from public;
grant execute on function public.trending_music_tracks(int) to anon, authenticated, service_role;
