-- ============================================================
-- STORY EXPIRY REMINDERS (SCHEDULED)
-- ============================================================
-- The four event-driven types (follow / comment / message / story) fire the
-- moment the row is written. "Your story is about to disappear" is different:
-- nothing happens in the database at T-2h, so there is no event to hang a
-- trigger on. It needs a clock.
--
--   pg_cron  ->  public.dispatch_story_expiry_job()
--            ->  pg_net (async)  ->  Edge Function story-expiry-notifications
--            ->  inserts `story_expiring` notification rows
--            ->  the standard dispatch trigger pushes them
--
-- The job only *finds* work; it does not decide who gets a push. Routing the
-- result through `public.notifications` means the reminder respects each
-- user's push preferences and shows up in their inbox exactly like any other
-- event, instead of needing a second, parallel preference system.
-- ============================================================

-- ------------------------------------------------------------
-- PG_CRON
-- ------------------------------------------------------------
-- Present on hosted Supabase and in the local CLI stack, but it needs
-- shared_preload_libraries, so on a bare Postgres this fails. Downgrade to a
-- notice: scheduling is optional, the rest of push notification delivery is
-- not.
do $$
begin
    create extension if not exists pg_cron;
exception when others then
    raise notice 'pg_cron not created automatically (%). Story-expiry reminders will need another scheduler.', sqlerrm;
end $$;

-- ------------------------------------------------------------
-- ENQUEUE: find the stories worth reminding people about
-- ------------------------------------------------------------
-- The SQL lives here rather than in the Edge Function so it is reviewable,
-- indexed and testable like the rest of the schema; the function stays a thin
-- authenticated shell.
--
-- Window: 1h45m – 2h30m of life remaining. The job runs every 30 minutes, so
-- this is wide enough to catch every story (and to survive one missed run)
-- while staying close enough to "about 2 hours" for the push copy to be
-- honest. `notifications_story_expiring_dedupe` makes the width free: each
-- (recipient, story) pair notifies at most once no matter how many passes it
-- falls inside.
--
-- Only followers who have NOT opened the story are notified — reminding
-- someone to watch something they already watched is pure noise.
create or replace function public.enqueue_story_expiry_notifications()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_count bigint;
begin
    with inserted as (
        insert into public.notifications (user_id, from_user_id, type, story_id)
        select f.follower_id, s.user_id, 'story_expiring', s.id
          from public.stories s
          join public.follows f on f.following_id = s.user_id
         where s.expires_at > now() + interval '1 hour 45 minutes'
           and s.expires_at <= now() + interval '2 hours 30 minutes'
           and f.follower_id <> s.user_id
           and not exists (
               select 1
                 from public.story_views sv
                where sv.story_id = s.id
                  and sv.viewer_id = f.follower_id
           )
        on conflict do nothing
        returning 1
    )
    select count(*) into v_count from inserted;

    return v_count::int;
end;
$$;

-- ------------------------------------------------------------
-- JOB BODY
-- ------------------------------------------------------------
-- Reuses push_dispatch_http_post() from 20260907130000 so pg_net's schema is
-- still resolved from the catalog rather than hard-coded.
create or replace function public.dispatch_story_expiry_job()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_url text;
    v_token text;
begin
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
            'story expiry job skipped: vault secrets "supabase_functions_url" / "push_edge_function_token" not configured';
        return;
    end if;

    perform public.push_dispatch_http_post(
        p_url := v_url || '/story-expiry-notifications',
        p_body := jsonb_build_object('source', 'pg_cron'),
        p_headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_token
        )
    );
end;
$$;

-- ------------------------------------------------------------
-- SCHEDULE
-- ------------------------------------------------------------
-- Every 30 minutes, which is the coarsest cadence that still guarantees a
-- reminder lands inside the 2-hour window below. The Edge Function is
-- idempotent regardless of cadence: notifications_story_expiring_dedupe makes
-- each (recipient, story) pair notify at most once, ever.
do $$
begin
    if not exists (
        select 1
          from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
         where p.proname = 'schedule'
           and n.nspname = 'cron'
    ) then
        raise notice 'cron.schedule() unavailable: story-expiry job not registered';
        return;
    end if;

    -- Re-registering on a re-run would create a duplicate job.
    if exists (select 1 from cron.job where jobname = 'story-expiry-notifications') then
        perform cron.unschedule('story-expiry-notifications');
    end if;

    perform cron.schedule(
        'story-expiry-notifications',
        '*/30 * * * *',
        'select public.dispatch_story_expiry_job()'
    );
end $$;

-- ------------------------------------------------------------
-- FUNCTION GRANTS
-- ------------------------------------------------------------
-- Both are internal: invoked by pg_cron / the Edge Function's service-role
-- client. `enqueue_story_expiry_notifications` is deliberately NOT callable
-- by an authenticated user — it writes notification rows on behalf of other
-- people, which is exactly what the revoked client-side INSERT policy in
-- 20260907130000 was closed to prevent.
revoke all on function public.dispatch_story_expiry_job() from public, anon, authenticated;
revoke all on function public.enqueue_story_expiry_notifications() from public, anon, authenticated;
grant execute on function public.enqueue_story_expiry_notifications() to service_role;
