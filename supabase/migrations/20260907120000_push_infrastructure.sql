-- ============================================================
-- PUSH NOTIFICATION INFRASTRUCTURE
-- ============================================================
-- Adds the server-side pieces needed to reach a phone:
--
--   1. public.push_tokens            — Expo push tokens, one row per install
--   2. public.notification_preferences — per-user, per-event push opt-outs
--   3. public.notifications          — widened for the new story + chat types
--
-- Deliberately NOT here: anything that sends the push. Dispatch lives in
-- 20260907130000_notification_triggers.sql (trigger -> pg_net -> Edge
-- Function -> Expo Push API). Keep this file pure schema so it applies
-- cleanly on a bare local stack with no extensions configured.
-- ============================================================

-- ------------------------------------------------------------
-- SHARED HELPER: keep `updated_at` honest without client help
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- ------------------------------------------------------------
-- 1. PUSH TOKENS
-- ------------------------------------------------------------
-- An Expo push token identifies one app *installation*, not one user: the
-- same person on two phones produces two tokens, and reinstalling produces
-- a new token. Model it that way so sends can fan out per device.
create table if not exists public.push_tokens (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    token text not null,
    platform text not null check (platform in ('ios', 'android')),
    -- Stable per-install id from the app, and half of the upsert key so a
    -- re-login on the same device rewrites one row instead of appending.
    --
    -- NOT NULL on purpose. It identifies the row, so a NULL would mean "a
    -- device we cannot tell apart from any other" — and because NULLs are
    -- distinct in a Postgres unique index, allowing them here would let
    -- duplicate rows accumulate for the same user. The client always has one
    -- (generated once per install, see services/pushService.ts).
    device_id text not null,
    -- Soft-invalidated rather than deleted when Expo reports
    -- DeviceNotRegistered, so the failure stays auditable.
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now()
);

-- A token is globally unique; a device belongs to exactly one live row.
create unique index if not exists push_tokens_token_key
    on public.push_tokens (token);

-- Deliberately NOT a partial index.
--
-- The client upserts on (user_id, device_id) via PostgREST, and PostgreSQL
-- will not infer a *partial* unique index for an ON CONFLICT target unless the
-- statement repeats the index predicate — which PostgREST cannot express. A
-- partial index here compiles fine and then fails at runtime with
-- "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification" on the first token registration. `device_id` is NOT NULL, so
-- the unconditional index means exactly what the partial one meant.
create unique index if not exists push_tokens_user_device_key
    on public.push_tokens (user_id, device_id);

-- The hot path in the Edge Function: "active tokens for this user".
create index if not exists idx_push_tokens_user_active
    on public.push_tokens (user_id)
    where is_active;

alter table public.push_tokens enable row level security;

-- Tokens are delivery addresses, not public data: only the owner may read
-- or write their own. The Edge Function reads them with the service role.
drop policy if exists "Users can view own push tokens" on public.push_tokens;
create policy "Users can view own push tokens"
    on public.push_tokens
    for select
    using (auth.uid() = user_id);

drop policy if exists "Users can register own push tokens" on public.push_tokens;
create policy "Users can register own push tokens"
    on public.push_tokens
    for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update own push tokens" on public.push_tokens;
create policy "Users can update own push tokens"
    on public.push_tokens
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "Users can delete own push tokens" on public.push_tokens;
create policy "Users can delete own push tokens"
    on public.push_tokens
    for delete
    using (auth.uid() = user_id);

drop trigger if exists push_tokens_touch_updated_at on public.push_tokens;
create trigger push_tokens_touch_updated_at
    before update on public.push_tokens
    for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- 2. NOTIFICATION PREFERENCES
-- ------------------------------------------------------------
-- These gate the PUSH only — never the in-app inbox. Turning "likes" off
-- stops the phone buzzing; the inbox keeps the full history. Defaults are
-- deliberately conservative: high-signal events on, high-volume
-- (likes/reposts) off, because a follow is worth interrupting someone for
-- and a twelfth like on the same post is not.
create table if not exists public.notification_preferences (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    push_enabled boolean not null default true,
    push_follows boolean not null default true,
    push_comments boolean not null default true,
    push_messages boolean not null default true,
    push_stories boolean not null default true,
    push_story_expiry boolean not null default true,
    push_likes boolean not null default false,
    push_reposts boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

drop policy if exists "Users can view own notification preferences" on public.notification_preferences;
create policy "Users can view own notification preferences"
    on public.notification_preferences
    for select
    using (auth.uid() = user_id);

drop policy if exists "Users can create own notification preferences" on public.notification_preferences;
create policy "Users can create own notification preferences"
    on public.notification_preferences
    for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update own notification preferences" on public.notification_preferences;
create policy "Users can update own notification preferences"
    on public.notification_preferences
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop trigger if exists notification_preferences_touch_updated_at on public.notification_preferences;
create trigger notification_preferences_touch_updated_at
    before update on public.notification_preferences
    for each row execute function public.touch_updated_at();

-- Seed a preferences row for every profile, including existing ones, so the
-- Edge Function can rely on a row existing (and users on their defaults
-- rather than silently getting everything).
insert into public.notification_preferences (user_id)
select p.id from public.profiles p
on conflict (user_id) do nothing;

create or replace function public.handle_new_profile_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.notification_preferences (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_profile_created_notification_preferences on public.profiles;
create trigger on_profile_created_notification_preferences
    after insert on public.profiles
    for each row execute function public.handle_new_profile_notification_preferences();

-- ------------------------------------------------------------
-- 3. NOTIFICATIONS: NEW TYPES + DEEP-LINK TARGETS
-- ------------------------------------------------------------
-- The old constraint allowed 'story_like' / 'story_reply' as placeholders.
-- Those were never produced by anything; the two types actually shipped here
-- are 'story' (someone you follow posted) and 'story_expiring' (a story you
-- never opened is about to vanish). Dropping the unused placeholders keeps
-- the enum honest rather than growing it speculatively.
alter table public.notifications
    drop constraint if exists notifications_type_check;

alter table public.notifications
    add constraint notifications_type_check
    check (
        type in (
            'like',
            'comment',
            'follow',
            'repost',
            'message',
            'story',
            'story_expiring'
        )
    );

-- Deep-link targets so tapping a push lands on the right screen. Mirrors the
-- existing post_id column rather than overloading it: a story is not a post,
-- and a conversation is neither.
alter table public.notifications
    add column if not exists story_id uuid references public.stories(id) on delete cascade;

alter table public.notifications
    add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;

create index if not exists idx_notifications_story_id
    on public.notifications (story_id)
    where story_id is not null;

create index if not exists idx_notifications_conversation_id
    on public.notifications (conversation_id)
    where conversation_id is not null;

-- ------------------------------------------------------------
-- 4. DE-DUPE INDEXES
-- ------------------------------------------------------------
-- Every one of these is partial and paired with `on conflict do nothing` in
-- the trigger, so a repeat action can never raise and roll back the caller's
-- transaction (a follow that throws because of a notification row would be a
-- far worse bug than a missing notification).
--
--   follow  — one per (recipient, actor), forever. Re-following after an
--             unfollow does not re-notify.
--   like /
--   repost  — one per (recipient, actor, post). Kills the like/unlike/like
--             loop that previously stacked a notification per cycle.
--   story /
--   story_expiring — one per (recipient, story). The expiry job re-runs on a
--             schedule and must not re-notify on every pass.
--
-- Comments are intentionally NOT de-duped: each comment is a distinct thing
-- worth reading. Messages are coalesced in the trigger instead (see below)
-- because rate-limiting them needs a time window, not a unique key.
create unique index if not exists notifications_follow_dedupe
    on public.notifications (user_id, from_user_id)
    where type = 'follow';

create unique index if not exists notifications_like_dedupe
    on public.notifications (user_id, from_user_id, post_id)
    where type = 'like' and post_id is not null;

create unique index if not exists notifications_repost_dedupe
    on public.notifications (user_id, from_user_id, post_id)
    where type = 'repost' and post_id is not null;

create unique index if not exists notifications_story_dedupe
    on public.notifications (user_id, story_id)
    where type = 'story' and story_id is not null;

create unique index if not exists notifications_story_expiring_dedupe
    on public.notifications (user_id, story_id)
    where type = 'story_expiring' and story_id is not null;

-- ------------------------------------------------------------
-- 5. FUNCTION GRANTS
-- ------------------------------------------------------------
-- Same hardening the repo applies to its other helpers: these are internal
-- (invoked by triggers, never by the API), so anon and authenticated get
-- nothing. See 20260906193000_fix_function_grants_after_base_default_privileges.sql
-- for why REVOKE ... FROM PUBLIC alone is not sufficient on Supabase.
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_profile_notification_preferences() from public, anon, authenticated;
