-- ============================================================
-- FIX: PUSH TOKEN REASSIGNMENT ON REINSTALL / ACCOUNT SWITCH
-- ============================================================
-- WHY THIS FILE EXISTS
--   `push_tokens_token_key` made `token` unique across *all* rows, active or
--   not. But an Expo push token identifies an app *install*, not a user:
--
--     · switching accounts on one phone mints the same token for a new user_id,
--     · reinstalling keeps the FCM token while the app's persisted device_id
--       is regenerated,
--
--   so the client's upsert keyed on (user_id, device_id) tried to INSERT a
--   brand-new row carrying a token that already exists on the previous owner's
--   row, and registration failed with:
--
--       duplicate key value violates unique constraint "push_tokens_token_key"
--
--   A failed insert leaves the new account with no active token row at all,
--   so the dispatch trigger silently skips them and they never get a push.
--
-- WHAT THIS DOES INSTEAD
--   The real invariant is "a token is ACTIVE in at most one row". Deactivated
--   rows are history (the schema deliberately soft-invalidates instead of
--   deleting, so DeviceNotRegistered failures stay auditable). Therefore:
--
--     1. Replace the all-rows unique index with a partial one on
--        (token) WHERE is_active.
--     2. Add public.register_push_token(...), the single place tokens are
--        written. It deactivates any other account still holding this token
--        active, then upserts the caller's own (user, device) row. The client
--        cannot do that reassignment itself — RLS forbids writing another
--        user's row, which is exactly why the raw upsert hit the constraint.
-- ============================================================

drop index if exists public.push_tokens_token_key;

create unique index if not exists push_tokens_token_active_key
    on public.push_tokens (token)
    where is_active;

-- ------------------------------------------------------------
-- REGISTER / REASSIGN A PUSH TOKEN
-- ------------------------------------------------------------
-- SECURITY DEFINER on purpose: reassigning ownership of a token means touching
-- a row that may belong to a different user, which the open UPDATE policy
-- cannot express. The function still validates auth.uid() against p_user_id,
-- so it cannot be used to register a token for someone else.
create or replace function public.register_push_token(
    p_user_id uuid,
    p_token text,
    p_device_id text,
    p_platform text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := auth.uid();
begin
    if v_uid is null then
        raise exception 'Not authenticated';
    end if;

    if p_user_id is distinct from v_uid then
        raise exception 'Cannot register a push token for another user';
    end if;

    if p_platform not in ('ios', 'android') then
        raise exception 'platform must be ''ios'' or ''android''';
    end if;

    -- A token belongs to one install. If a previous account still holds it
    -- active (account switch on this phone, or a reinstall that kept the FCM
    -- token but minted a fresh device_id), that account no longer owns this
    -- device. Deactivate rather than delete: dead rows stay auditable.
    update public.push_tokens
       set is_active = false
     where token = p_token
       and user_id is distinct from p_user_id;

    -- Refresh this (user, device) row, or create it if it does not exist yet.
    insert into public.push_tokens
        (user_id, token, device_id, platform, is_active, last_seen_at)
    values
        (p_user_id, p_token, p_device_id, p_platform, true, now())
    on conflict (user_id, device_id) do update
       set token = excluded.token,
           platform = excluded.platform,
           is_active = true,
           last_seen_at = now();
end;
$$;

-- Internal helper invoked by the app through RPC. anon gets nothing; the
-- function validates the caller against auth.uid() itself.
revoke all on function public.register_push_token(uuid, text, text, text)
    from public, anon, authenticated;

grant execute on function public.register_push_token(uuid, text, text, text)
    to authenticated, service_role;
