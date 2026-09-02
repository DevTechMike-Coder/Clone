-- ============================================================
-- GROUP CHATS
-- ============================================================
-- The `conversations` table already carries `is_group`/`name` from the
-- initial schema, but nothing could create a multi-participant
-- conversation (the only creation path was the 2-person
-- `create_direct_conversation` RPC). This adds the group equivalent,
-- following the same SECURITY DEFINER + revoke/grant pattern from
-- 20260828120000_security_hardening.sql so RLS stays untouched.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_group_conversation(
    group_name text,
    member_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  conv_id uuid;
  me uuid := auth.uid();
  member uuid;
  clean_members uuid[];
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- De-dupe and drop the caller (added separately) and any bogus ids.
  SELECT array_agg(DISTINCT m)
  INTO clean_members
  FROM unnest(member_ids) AS m
  WHERE m <> me
    AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = m);

  -- A group needs at least 2 other people; 2-person chats belong to
  -- create_direct_conversation so DMs stay reusable.
  IF clean_members IS NULL OR array_length(clean_members, 1) < 2 THEN
    RAISE EXCEPTION 'A group needs at least 2 other members';
  END IF;

  IF group_name IS NOT NULL AND char_length(group_name) > 80 THEN
    RAISE EXCEPTION 'Group name too long';
  END IF;

  INSERT INTO public.conversations (is_group, name)
  VALUES (true, nullif(btrim(COALESCE(group_name, '')), ''))
  RETURNING id INTO conv_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES (conv_id, me);

  FOREACH member IN ARRAY clean_members LOOP
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (conv_id, member)
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END LOOP;

  RETURN conv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_group_conversation(text, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_group_conversation(text, uuid[]) TO authenticated, service_role;
