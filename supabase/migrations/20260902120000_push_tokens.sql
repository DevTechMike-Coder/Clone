-- ============================================================
-- PUSH NOTIFICATION DEVICE TOKENS
-- ============================================================
-- One row per (user, device) holding the Expo push token that the
-- `send-push` edge function fans out to when a row is inserted into
-- `public.notifications` (see PUSH_NOTIFICATIONS_SETUP.md).
--
-- Tokens are sensitive: they let Expo's push service deliver to a
-- specific device. Only the owner may read/write their rows; the edge
-- function uses the service role key, which bypasses RLS.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_tokens (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    token       text NOT NULL,
    platform    text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx
    ON public.push_tokens (user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own push tokens" ON public.push_tokens;
DROP POLICY IF EXISTS "Users can insert own push tokens" ON public.push_tokens;
DROP POLICY IF EXISTS "Users can update own push tokens" ON public.push_tokens;
DROP POLICY IF EXISTS "Users can delete own push tokens" ON public.push_tokens;

-- Owners manage only their own device tokens.
CREATE POLICY "Users can view own push tokens" ON public.push_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens" ON public.push_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens" ON public.push_tokens
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens" ON public.push_tokens
    FOR DELETE USING (auth.uid() = user_id);
