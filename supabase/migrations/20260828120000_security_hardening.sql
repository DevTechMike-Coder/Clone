-- ============================================================
-- SECURITY HARDENING
-- 1. Chat is participant-only (no more reading every DM)
-- 2. Bookmarks are owner-only
-- 3. Private profiles actually hide posts / comments / likes
-- 4. Message updates cannot rewrite someone else's content
-- 5. Chat media lives in a private bucket
-- ============================================================

-- ------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid RLS recursion)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.conversation_id = conv_id
        AND cp.user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.can_view_post(p_post_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.posts p
      JOIN public.profiles pr ON pr.id = p.user_id
      WHERE p.id = p_post_id
        AND (
          p.user_id = auth.uid()
          OR COALESCE(pr.is_private, false) = false
          OR EXISTS (
            SELECT 1
            FROM public.follows f
            WHERE f.following_id = p.user_id
              AND f.follower_id = auth.uid()
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.create_direct_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  conv_id uuid;
  me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF me = other_user_id THEN
    RAISE EXCEPTION 'Cannot chat with yourself';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = other_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  SELECT c.id INTO conv_id
  FROM public.conversations c
  WHERE c.is_group = false
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants p
      WHERE p.conversation_id = c.id AND p.user_id = me
    )
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants p
      WHERE p.conversation_id = c.id AND p.user_id = other_user_id
    )
    AND (
      SELECT count(*) FROM public.conversation_participants p
      WHERE p.conversation_id = c.id
    ) = 2
  LIMIT 1;

  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  INSERT INTO public.conversations (is_group)
  VALUES (false)
  RETURNING id INTO conv_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (conv_id, me), (conv_id, other_user_id);

  RETURN conv_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_message_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Recipients may only mark messages as read. Senders may not
  -- rewrite another participant's message body via the open UPDATE policy.
  IF auth.uid() IS DISTINCT FROM OLD.sender_id THEN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
       OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
       OR NEW.content IS DISTINCT FROM OLD.content
       OR NEW.media_url IS DISTINCT FROM OLD.media_url
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Only read_at can be updated on messages you did not send';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.is_conversation_participant(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_post(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_direct_conversation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_message_updates() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_post(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.protect_message_updates() TO service_role;

-- ------------------------------------------------------------
-- Indexes used by the new policies
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user
  ON public.conversation_participants (user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv
  ON public.conversation_participants (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON public.messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id
  ON public.posts (user_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id
  ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id
  ON public.follows (following_id);

-- ------------------------------------------------------------
-- CONVERSATIONS: participants only
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can view conversations" ON public.conversations;

CREATE POLICY "Participants can view conversations"
  ON public.conversations
  FOR SELECT
  USING (public.is_conversation_participant(id));

CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ------------------------------------------------------------
-- CONVERSATION PARTICIPANTS: members of that thread only
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Participants can view conversation members" ON public.conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can join conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can add conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can view conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can leave conversations" ON public.conversation_participants;

CREATE POLICY "Participants can view conversation members"
  ON public.conversation_participants
  FOR SELECT
  USING (public.is_conversation_participant(conversation_id));

CREATE POLICY "Users can add conversation participants"
  ON public.conversation_participants
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      user_id = auth.uid()
      OR public.is_conversation_participant(conversation_id)
    )
  );

CREATE POLICY "Users can leave conversations"
  ON public.conversation_participants
  FOR DELETE
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- MESSAGES: participants only + read-receipt-safe updates
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can update messages" ON public.messages;

CREATE POLICY "Participants can view messages"
  ON public.messages
  FOR SELECT
  USING (public.is_conversation_participant(conversation_id));

CREATE POLICY "Participants can send messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_conversation_participant(conversation_id)
  );

CREATE POLICY "Participants can update messages"
  ON public.messages
  FOR UPDATE
  USING (public.is_conversation_participant(conversation_id))
  WITH CHECK (public.is_conversation_participant(conversation_id));

DROP TRIGGER IF EXISTS protect_message_updates ON public.messages;
CREATE TRIGGER protect_message_updates
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE PROCEDURE public.protect_message_updates();

-- ------------------------------------------------------------
-- BOOKMARKS: owner-only reads
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can view bookmarks" ON public.bookmarks;

CREATE POLICY "Users can view own bookmarks"
  ON public.bookmarks
  FOR SELECT
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- POSTS / COMMENTS / LIKES / REPOSTS: honor private profiles
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
CREATE POLICY "Users can view visible posts"
  ON public.posts
  FOR SELECT
  USING (public.can_view_post(id));

DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;

CREATE POLICY "Users can view comments on visible posts"
  ON public.comments
  FOR SELECT
  USING (public.can_view_post(post_id));

CREATE POLICY "Users can comment on visible posts"
  ON public.comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_view_post(post_id)
  );

DROP POLICY IF EXISTS "Anyone can view likes" ON public.likes;
DROP POLICY IF EXISTS "Authenticated users can insert likes" ON public.likes;

CREATE POLICY "Users can view likes on visible posts"
  ON public.likes
  FOR SELECT
  USING (public.can_view_post(post_id));

CREATE POLICY "Users can like visible posts"
  ON public.likes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_view_post(post_id)
  );

DROP POLICY IF EXISTS "Anyone can view reposts" ON public.reposts;
DROP POLICY IF EXISTS "Authenticated users can insert reposts" ON public.reposts;

CREATE POLICY "Users can view reposts on visible posts"
  ON public.reposts
  FOR SELECT
  USING (public.can_view_post(post_id));

CREATE POLICY "Users can repost visible posts"
  ON public.reposts
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_view_post(post_id)
  );

-- ------------------------------------------------------------
-- PRIVATE CHAT MEDIA BUCKET
-- ------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat', 'chat', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Chat media is readable by participants" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own chat media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat media" ON storage.objects;

CREATE POLICY "Chat media is readable by participants"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat'
  AND auth.uid() IS NOT NULL
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.conversation_participants cp
        ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = auth.uid()
        AND m.media_url = name
    )
  )
);

CREATE POLICY "Users can upload their own chat media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own chat media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'chat'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'chat'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own chat media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
