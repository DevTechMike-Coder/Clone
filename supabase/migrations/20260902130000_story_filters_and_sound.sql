-- ============================================================
-- STORY FILTERS + SOUNDS
-- The camera studio lets users pick a colour filter and attach
-- a sound before sharing a story, but neither was persisted, so
-- stories played back plain and silent. Mirror the metadata
-- columns posts already have (20260831120000_music_and_filters,
-- 20260901120000_sounds_library) so the story viewer can apply
-- the filter tint and play the attached track.
-- ============================================================

alter table public.stories
    add column if not exists filter_id text,
    add column if not exists music_track_id text,
    add column if not exists music_track_title text,
    add column if not exists music_track_artist text,
    add column if not exists music_track_cover_url text,
    add column if not exists music_track_audio_url text,
    add column if not exists music_track_attribution text,
    add column if not exists has_sound boolean not null default false;

comment on column public.stories.filter_id is
    'Camera filter applied in the studio (id in CAMERA_FILTERS); the viewer renders it as a tint overlay.';
comment on column public.stories.music_track_audio_url is
    'Playably-resolved sound URL snapshot at publish time, like posts.music_track_audio_url.';

create index if not exists idx_stories_music_track_id on public.stories (music_track_id);
