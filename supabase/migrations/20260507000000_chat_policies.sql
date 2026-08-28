-- ============================================================
-- CHAT & CONVERSATION RLS FIXES (COMPLETE & IDEMPOTENT)
-- ============================================================

-- 1. CONVERSATIONS
DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can view conversations" ON public.conversations;

CREATE POLICY "Authenticated users can create conversations" ON public.conversations
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Authenticated users can view conversations" ON public.conversations
    FOR SELECT USING (
        auth.uid() IS NOT NULL
    );

-- 2. CONVERSATION PARTICIPANTS
DROP POLICY IF EXISTS "Participants can view conversation members" ON public.conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can join conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can add conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can view conversation participants" ON public.conversation_participants;

CREATE POLICY "Authenticated users can add conversation participants" ON public.conversation_participants
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

CREATE POLICY "Authenticated users can view conversation participants" ON public.conversation_participants
    FOR SELECT USING (
        auth.uid() IS NOT NULL
    );

-- 3. MESSAGES (Read Receipts)
DROP POLICY IF EXISTS "Participants can update messages" ON public.messages;

CREATE POLICY "Participants can update messages" ON public.messages
    FOR UPDATE USING (
        auth.uid() IS NOT NULL
    );
