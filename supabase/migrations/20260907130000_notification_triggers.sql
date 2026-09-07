-- ============================================================
-- SERVER-SIDE NOTIFICATION CREATION + PUSH DISPATCH
-- ============================================================
-- WHY THIS FILE EXISTS
--   Notifications used to be written by the *actor's* phone: when A followed
--   B, A's device inserted the notification row for B. That has two failure
--   modes, both of which silently lose notifications:
--
--     1. A's app dies between the `follows` insert and the `notifications`
--        insert (crash, killed process, flaky network) and B is never told.
--     2. Nothing at all is written when the action happens outside the app
--        (SQL, another client, a future admin tool).
--
--   It also lets any authenticated client insert an arbitrary notification
--   for any user, since the only guard was `auth.uid() = from_user_id`.
--
-- WHAT THIS DOES INSTEAD
--   Notifications are derived in the database from the events that cause
--   them (follows / likes / comments / reposts / stories / messages), then a
--   single AFTER INSERT trigger on `notifications` decides whether to
--   dispatch a push. One place to add a new event type, and it cannot be
--   skipped by a client that goes offline at the wrong moment.
--
-- BREAKING CHANGE
--   `public.notifications` INSERT is revoked from `authenticated`. The
--   client-side `notificationService.createNotification()` calls are removed
--   in the same commit. Ship the app update and this migration together.
-- ============================================================

-- ------------------------------------------------------------
-- PG_NET (async HTTP from Postgres)
-- ------------------------------------------------------------
-- Pre-installed on Supabase; this only covers a bare local stack where it
-- may be absent. `create extension` cannot be IF NOT EXISTS'd away inside a
-- DO block without also swallowing real errors, so any failure is downgraded
-- to a notice: push dispatch degrades to a no-op, the app keeps working.
do $$
begin
    create extension if not exists pg_net;
exception when others then
    raise notice 'pg_net not created automatically (%). Enable it if you want push dispatch.', sqlerrm;
end $$;

-- ------------------------------------------------------------
-- HELPER: call pg_net's http_post without guessing its schema
-- ------------------------------------------------------------
-- pg_net lands in different schemas depending on how the project was
-- provisioned (`net` on hosted Supabase, sometimes `extensions` or `public`
-- elsewhere). Hard-coding one turns "push is broken" into a silent no-op on
-- whichever environment guessed wrong, so resolve it from the catalog once
-- and raise loudly if it is genuinely missing.
create or replace function public.push_dispatch_http_post(
    p_url text,
    p_body jsonb,
    p_headers jsonb
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
    v_schema text;
begin
    select n.nspname
      into v_schema
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where p.proname = 'http_post'
     order by (n.nspname = 'net') desc, (n.nspname = 'extensions') desc
     limit 1;

    if v_schema is null then
        raise exception 'pg_net is not installed: no http_post() function found in any schema';
    end if;

    execute format('select %I.http_post(url := $1, body := $2, headers := $3)', v_schema)
      using p_url, p_body, p_headers;
end;
$$;

-- ------------------------------------------------------------
-- 1. FOLLOW
-- ------------------------------------------------------------
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    -- The app blocks self-follows, but the trigger is the last line of
    -- defence: without this guard a direct insert would produce a
    -- "you started following you" notification.
    if new.following_id = new.follower_id then
        return new;
    end if;

    insert into public.notifications (user_id, from_user_id, type)
    values (new.following_id, new.follower_id, 'follow')
    on conflict do nothing;

    return new;
end;
$$;

-- ------------------------------------------------------------
-- 2. LIKE / COMMENT / REPOST (post-owner notifications)
-- ------------------------------------------------------------
-- Author is resolved here rather than passed in, so a like created from
-- anywhere still notifies the right person.
create or replace function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_author uuid;
begin
    select p.user_id into v_author
      from public.posts p
     where p.id = new.post_id;

    if v_author is null or v_author = new.user_id then
        return new;
    end if;

    insert into public.notifications (user_id, from_user_id, type, post_id)
    values (v_author, new.user_id, 'like', new.post_id)
    on conflict do nothing;

    return new;
end;
$$;

create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_author uuid;
begin
    select p.user_id into v_author
      from public.posts p
     where p.id = new.post_id;

    if v_author is null or v_author = new.user_id then
        return new;
    end if;

    insert into public.notifications (user_id, from_user_id, type, post_id)
    values (v_author, new.user_id, 'comment', new.post_id)
    on conflict do nothing;

    return new;
end;
$$;

create or replace function public.notify_on_repost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_author uuid;
begin
    select p.user_id into v_author
      from public.posts p
     where p.id = new.post_id;

    if v_author is null or v_author = new.user_id then
        return new;
    end if;

    insert into public.notifications (user_id, from_user_id, type, post_id)
    values (v_author, new.user_id, 'repost', new.post_id)
    on conflict do nothing;

    return new;
end;
$$;

-- ------------------------------------------------------------
-- 3. STORY (fan-out to followers)
-- ------------------------------------------------------------
-- One row per follower, which is what makes the story show up in each
-- follower's inbox. The dedicated `notifications_story_dedupe` index keeps a
-- re-post of the same story id from double-notifying.
create or replace function public.notify_on_story()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.notifications (user_id, from_user_id, type, story_id)
    select f.follower_id, new.user_id, 'story', new.id
      from public.follows f
     where f.following_id = new.user_id
       and f.follower_id <> new.user_id
    on conflict do nothing;

    return new;
end;
$$;

-- ------------------------------------------------------------
-- 4. MESSAGE (coalesced, so a burst is one buzz)
-- ------------------------------------------------------------
-- Push fires on INSERT only. Bumping an existing unread row therefore re-sorts
-- the inbox to the top without firing another push, which is what keeps a
-- five-message burst from producing five notifications. Once the recipient
-- reads it, the next message starts a fresh row.
create or replace function public.notify_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.notifications n
       set created_at = now()
     where n.type = 'message'
       and n.is_read = false
       and n.from_user_id = new.sender_id
       and n.user_id in (
           select cp.user_id
             from public.conversation_participants cp
            where cp.conversation_id = new.conversation_id
              and cp.user_id <> new.sender_id
       );

    insert into public.notifications (user_id, from_user_id, type, conversation_id)
    select cp.user_id, new.sender_id, 'message', new.conversation_id
      from public.conversation_participants cp
     where cp.conversation_id = new.conversation_id
       and cp.user_id <> new.sender_id
       and not exists (
           select 1
             from public.notifications n
            where n.type = 'message'
              and n.is_read = false
              and n.from_user_id = new.sender_id
              and n.user_id = cp.user_id
       )
    on conflict do nothing;

    return new;
end;
$$;

-- ------------------------------------------------------------
-- 5. ATTACH THE EVENT TRIGGERS
-- ------------------------------------------------------------
drop trigger if exists follows_notify on public.follows;
create trigger follows_notify
    after insert on public.follows
    for each row execute function public.notify_on_follow();

drop trigger if exists likes_notify on public.likes;
create trigger likes_notify
    after insert on public.likes
    for each row execute function public.notify_on_like();

drop trigger if exists comments_notify on public.comments;
create trigger comments_notify
    after insert on public.comments
    for each row execute function public.notify_on_comment();

drop trigger if exists reposts_notify on public.reposts;
create trigger reposts_notify
    after insert on public.reposts
    for each row execute function public.notify_on_repost();

drop trigger if exists stories_notify on public.stories;
create trigger stories_notify
    after insert on public.stories
    for each row execute function public.notify_on_story();

drop trigger if exists messages_notify on public.messages;
create trigger messages_notify
    after insert on public.messages
    for each row execute function public.notify_on_message();

-- ------------------------------------------------------------
-- 6. PUSH DISPATCH
-- ------------------------------------------------------------
-- STATEMENT-level on purpose. A story fans out to every follower, so a
-- row-level trigger would queue one HTTP request per follower for a single
-- post. Statement level + a transition table collects the whole fan-out into
-- one call with one array of ids, and the Edge Function batches the sends to
-- Expo. Per-row filtering (preferences, token presence) happens in the query
-- over `new_table` below rather than in plpgsql variables.
create or replace function public.dispatch_push_for_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_url text;
    v_token text;
    v_ids uuid[];
begin
    -- Everything below is best-effort. A missing vault secret, an absent
    -- pg_net, or a dead Edge Function must degrade to "no push" — never to
    -- "the follow / like / comment that produced this row failed".
    begin
        -- (a) Keep only notifications whose recipient wants them and has a
        --     device to receive them on.
        --
        --     Preferences gate the PUSH only; the in-app inbox deliberately
        --     keeps everything, so this filter must not stop the row from
        --     existing — only from being announced.
        --
        --     The `coalesce(..., n.type not in ('like','repost'))` fallback
        --     mirrors the column defaults in push_infrastructure for the
        --     (unexpected) case of a missing preferences row, rather than
        --     defaulting to "notify for everything".
        select array_agg(n.id)
          into v_ids
          from new_table n
          left join public.notification_preferences p on p.user_id = n.user_id
         where exists (
                   select 1
                     from public.push_tokens pt
                    where pt.user_id = n.user_id
                      and pt.is_active
               )
           and coalesce(p.push_enabled, true)
           and coalesce(
                   case n.type
                       when 'follow'         then p.push_follows
                       when 'comment'        then p.push_comments
                       when 'message'        then p.push_messages
                       when 'story'          then p.push_stories
                       when 'story_expiring' then p.push_story_expiry
                       when 'like'           then p.push_likes
                       when 'repost'         then p.push_reposts
                       else null
                   end,
                   n.type not in ('like', 'repost')
               );

        -- Nothing to send — the common case, since most users never grant
        -- push permission. Bail before touching pg_net or the vault.
        if v_ids is null or array_length(v_ids, 1) is null then
            return null;
        end if;

        -- (b) Endpoint + shared secret. Both live in the vault so neither the
        --     project URL nor the token is ever committed; see
        --     PUSH_NOTIFICATIONS_SETUP.md. One base URL + one token covers
        --     every push Edge Function, so there is a single place to rotate.
        select decrypted_secret into v_url
          from vault.decrypted_secrets
         where name = 'supabase_functions_url'
         limit 1;

        select decrypted_secret into v_token
          from vault.decrypted_secrets
         where name = 'push_edge_function_token'
         limit 1;

        if v_url is null or v_token is null then
            raise warning
                'push dispatch skipped for % notification(s): vault secrets "supabase_functions_url" / "push_edge_function_token" not configured',
                array_length(v_ids, 1);
            return null;
        end if;

        perform public.push_dispatch_http_post(
            p_url := v_url || '/send-push-notification',
            p_body := jsonb_build_object('notification_ids', to_jsonb(v_ids)),
            p_headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_token
            )
        );
    exception when others then
        raise warning 'push dispatch failed: %', sqlerrm;
    end;

    return null;
end;
$$;

drop trigger if exists notifications_dispatch_push on public.notifications;
create trigger notifications_dispatch_push
    after insert on public.notifications
    referencing new table as new_table
    for each statement execute function public.dispatch_push_for_notifications();

-- ------------------------------------------------------------
-- 7. CLOSE THE CLIENT-SIDE INSERT HOLE
-- ------------------------------------------------------------
-- With notifications derived server-side, the only remaining reason for
-- clients to insert was the old flow. Leaving the policy in place would keep
-- a "notify any user with any content" primitive available to every
-- authenticated caller. Service role is unaffected (it bypasses RLS), which
-- is what the story-expiry job uses.
drop policy if exists "Authenticated users can insert notifications" on public.notifications;

-- ------------------------------------------------------------
-- 8. FUNCTION GRANTS
-- ------------------------------------------------------------
-- Internal only: invoked by triggers, never by the API. See
-- 20260906193000_fix_function_grants_after_base_default_privileges.sql for
-- why revoking from PUBLIC alone does not suffice on Supabase.
revoke all on function public.push_dispatch_http_post(text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.notify_on_follow() from public, anon, authenticated;
revoke all on function public.notify_on_like() from public, anon, authenticated;
revoke all on function public.notify_on_comment() from public, anon, authenticated;
revoke all on function public.notify_on_repost() from public, anon, authenticated;
revoke all on function public.notify_on_story() from public, anon, authenticated;
revoke all on function public.notify_on_message() from public, anon, authenticated;
revoke all on function public.dispatch_push_for_notifications() from public, anon, authenticated;
