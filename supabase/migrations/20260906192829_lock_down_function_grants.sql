-- supabase/migrations/xxxx_lock_down_function_grants.sql

REVOKE EXECUTE ON FUNCTION public.can_view_post FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_post_interactions FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_direct_conversation FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_message_updates FROM PUBLIC;

-- Re-grant only to authenticated (adjust per-function based on actual access model)
GRANT EXECUTE ON FUNCTION public.can_view_post TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_post_interactions TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_direct_conversation TO authenticated;