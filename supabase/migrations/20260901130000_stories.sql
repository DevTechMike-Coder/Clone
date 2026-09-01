-- ============================================================
-- INSTAGRAM-STYLE STORIES
-- Ephemeral posts that expire 24 hours after creation.
-- ============================================================

create table if not exists public.stories (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    media_url text not null,
    media_type text not null check (media_type in ('image', 'video')),
    background_color text default '#000000',
    caption text,
    text_color text default '#FFFFFF',
    -- Instagram-style story expiry: 24 hours
    expires_at timestamptz not null default (now() + interval '24 hours'),
    created_at timestamptz not null default now(),
    view_count int not null default 0
);

create index if not exists idx_stories_user_id on public.stories (user_id);
create index if not exists idx_stories_expires_at on public.stories (expires_at);

alter table public.stories enable row level security;

-- Anyone can view a non-expired story whose author they are allowed to see.
-- Private accounts: only followers (and the author) can see their stories.
drop policy if exists "Stories are visible to followers and public users" on public.stories;
create policy "Stories are visible to followers and public users"
    on public.stories
    for select
    using (
        expires_at > now()
        and (
            auth.uid() = user_id
            or exists (
                select 1 from public.profiles p
                where p.id = user_id and p.is_private = false
            )
            or exists (
                select 1 from public.follows f
                where f.following_id = user_id and f.follower_id = auth.uid()
            )
        )
    );

-- Authenticated users can only insert their own stories.
drop policy if exists "Users can insert own stories" on public.stories;
create policy "Users can insert own stories"
    on public.stories
    for insert
    with check (auth.uid() = user_id);

-- A user can only update/delete their own story (used for early deletion or bumping view count).
drop policy if exists "Users can update own stories" on public.stories;
create policy "Users can update own stories"
    on public.stories
    for update
    using (auth.uid() = user_id);

drop policy if exists "Users can delete own stories" on public.stories;
create policy "Users can delete own stories"
    on public.stories
    for delete
    using (auth.uid() = user_id);

-- ============================================================
-- STORY VIEWS
-- Track which users watched a given story (for "seen" marks).
-- ============================================================

create table if not exists public.story_views (
    id uuid primary key default gen_random_uuid(),
    story_id uuid not null references public.stories(id) on delete cascade,
    viewer_id uuid not null references public.profiles(id) on delete cascade,
    viewed_at timestamptz not null default now(),
    unique(story_id, viewer_id)
);

create index if not exists idx_story_views_story_id on public.story_views (story_id);
create index if not exists idx_story_views_viewer_id on public.story_views (viewer_id);

alter table public.story_views enable row level security;

drop policy if exists "Story views are visible to story owner and viewer" on public.story_views;
create policy "Story views are visible to story owner and viewer"
    on public.story_views
    for select
    using (
        viewer_id = auth.uid()
        or exists (
            select 1 from public.stories s
            where s.id = story_id and s.user_id = auth.uid()
        )
    );

drop policy if exists "Authenticated users can insert story views" on public.story_views;
create policy "Authenticated users can insert story views"
    on public.story_views
    for insert
    with check (auth.uid() = viewer_id);

-- ============================================================
-- STORAGE BUCKET FOR STORY MEDIA
-- ============================================================

insert into storage.buckets (id, name, public)
values ('stories', 'stories', true)
on conflict (id) do update set public = true;

drop policy if exists "Story media is publicly accessible" on storage.objects;
drop policy if exists "Users can upload their own story media" on storage.objects;
drop policy if exists "Users can update their own story media" on storage.objects;
drop policy if exists "Users can delete their own story media" on storage.objects;

create policy "Story media is publicly accessible"
    on storage.objects
    for select
    using (bucket_id = 'stories');

create policy "Users can upload their own story media"
    on storage.objects
    for insert
    with check (
        bucket_id = 'stories'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "Users can update their own story media"
    on storage.objects
    for update
    using (
        bucket_id = 'stories'
        and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
        bucket_id = 'stories'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "Users can delete their own story media"
    on storage.objects
    for delete
    using (
        bucket_id = 'stories'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================
-- NOTIFICATION TYPES: story_like / story_reply (future)
-- Add 'story_view' to keep forward-compat. We just extend the check.
-- ============================================================

-- We won't add notifications for every view (too noisy), but we
-- extend the notification enum for future story replies/reactions.
alter table public.notifications
    drop constraint if exists notifications_type_check;

alter table public.notifications
    add constraint notifications_type_check
    check (
        type in ('like', 'comment', 'follow', 'repost', 'message', 'story_like', 'story_reply')
    );
