-- ============================================================
-- FIX: MESSAGE PUSHES GO SILENT AFTER THE FIRST MESSAGE
-- ============================================================
-- WHY THIS FILE EXISTS
--   `notify_on_message()` coalesced a burst of messages into ONE
--   notification row: while the recipient had an UNREAD 'message'
--   notification from the sender, every new message only bumped that
--   row's created_at and skipped the INSERT entirely.
--
--   The push dispatch trigger (`notifications_dispatch_push`) fires on
--   INSERT into public.notifications only. No INSERT → no pg_net call
--   → no push. And because of two further bugs, the suppressing row
--   almost never cleared:
--
--     1. Nothing marked it read except opening the INBOX screen.
--        Reading a conversation sets messages.read_at, but the
--        notification row stayed is_read = false. People reply from
--        the conversation (or from the push deep-link), not from the
--        inbox — so in normal use the row stayed unread indefinitely
--        and every message after the first was silent, forever.
--     2. The coalescing matched on (recipient, sender) only, not on
--        conversation — an unread row from one conversation suppressed
--        pushes for every other conversation with the same sender.
--
--   Net effect, exactly as reported: "when I send a message the user
--   receiving it is not notified". The first message a pair ever
--   exchanged pushed once (if that); everything after was swallowed.
--
-- WHAT THIS DOES INSTEAD
--   a. Reading a conversation now clears its message notifications.
--      A new trigger on messages.read_at (NULL → set transition) marks
--      the reader's unread 'message' notifications for that
--      (conversation, sender) read, so the next message starts a fresh
--      row — and a fresh push. This is the same "derived in the
--      database" approach as every other notification event: whichever
--      client marks the messages read (initial load, realtime
--      callback, a future client), the notification follows.
--   b. Coalescing is scoped to the conversation, so a group chat or a
--      second conversation with the same sender no longer borrows
--      another conversation's unread row.
--   c. Coalescing is bounded by a short window: only an unread row
--      bumped within the last 5 minutes swallows the next message.
--      The window slides (the bump refreshes created_at), so a
--      rapid-fire burst is still one buzz — but once it expires the
--      next message INSERTs a fresh row no matter how old the unread
--      row is. This also self-heals every stale unread row left behind
--      by the old behaviour, without rewriting user data.
--
--   Companion change in supabase/functions/send-push-notification:
--   the function now skips notification rows that are already read by
--   the time it runs. Dispatch is asynchronous (pg_net → Edge
--   Function, ~a second later), so when the recipient is sitting in
--   the conversation and reads the message in that window, the push
--   is dropped instead of buzzing over a message they have seen.
-- ============================================================

-- ------------------------------------------------------------
-- 1. notify_on_message: scope coalescing to the conversation and
--    bound it to a short, sliding window
-- ------------------------------------------------------------
create or replace function public.notify_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    -- Bump the existing unread row so the inbox re-sorts, but only
    -- within the same conversation AND only if it was bumped recently.
    -- created_at is the "last activity" timestamp of the thread row:
    -- refreshing it here is what makes the window slide.
    update public.notifications n
       set created_at = now()
     where n.type = 'message'
       and n.is_read = false
       and n.conversation_id = new.conversation_id
       and n.from_user_id = new.sender_id
       and n.created_at > now() - interval '5 minutes'
       and n.user_id in (
           select cp.user_id
             from public.conversation_participants cp
            where cp.conversation_id = new.conversation_id
              and cp.user_id <> new.sender_id
       );

    -- Fresh row (→ fresh push) unless a recent unread row for this
    -- exact (recipient, sender, conversation) thread just absorbed it.
    -- The recency guard means a stale unread row — one the recipient
    -- never acted on — can no longer suppress pushes indefinitely.
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
              and n.conversation_id = new.conversation_id
              and n.from_user_id = new.sender_id
              and n.user_id = cp.user_id
              and n.created_at > now() - interval '5 minutes'
       )
    on conflict do nothing;

    return new;
end;
$$;

-- ------------------------------------------------------------
-- 2. Reading a conversation clears its message notifications
-- ------------------------------------------------------------
-- The app marks messages read on conversation open and on every
-- realtime arrival while the screen is open
-- (chatService.markMessagesAsRead). This trigger turns that into the
-- "read" signal the coalescing above was always waiting for: the
-- recipient has seen this thread, so the next message deserves a
-- fresh notification row — and a fresh push.
create or replace function public.mark_message_notifications_read()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_reader uuid := auth.uid();
begin
    -- Only the NULL → set transition of read_at means "someone just
    -- read this message". Any other update is not a read event.
    if new.read_at is null or old.read_at is not null then
        return new;
    end if;

    -- Outside an authenticated API call (SQL console, service role,
    -- cron) there is no user to credit with the read; leave the
    -- notification alone. The sender marking their own message read
    -- (not something the app does) is not a read either.
    if v_reader is null or v_reader = new.sender_id then
        return new;
    end if;

    update public.notifications n
       set is_read = true
     where n.type = 'message'
       and n.is_read = false
       and n.conversation_id = new.conversation_id
       and n.from_user_id = new.sender_id
       and n.user_id = v_reader;

    return new;
end;
$$;

drop trigger if exists messages_read_clears_notification on public.messages;
create trigger messages_read_clears_notification
    after update of read_at on public.messages
    for each row execute function public.mark_message_notifications_read();

-- ------------------------------------------------------------
-- 3. FUNCTION GRANTS
-- ------------------------------------------------------------
-- Internal only: invoked by triggers, never by the API. Same
-- convention as 20260907130000_notification_triggers.sql.
revoke all on function public.notify_on_message() from public, anon, authenticated;
revoke all on function public.mark_message_notifications_read() from public, anon, authenticated;
