-- ============================================================================
-- Fix function-level EXECUTE grants for policy/trigger helpers
-- ============================================================================
-- WHY THIS EXISTS
--   20260906192829_lock_down_function_grants.sql revoked these helpers from
--   PUBLIC, but on Supabase that is not enough. The platform bootstrap sets
--   default privileges that grant EXECUTE on every new public routine to the
--   API roles at creation time:
--
--     ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--       GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
--
--   So when a migration does `CREATE OR REPLACE FUNCTION`, the resulting ACL
--   already contains explicit entries for anon/authenticated/service_role and
--   REVOKE ... FROM PUBLIC never touches them. The helpers stayed callable by
--   anonymous requests (and, for the trigger function, by authenticated
--   users), which is what scripts/check-rls.mjs flagged.
--
-- FIX
--   Explicitly revoke from the concrete roles the base grants materialised:
--   - anon must never EXECUTE any of these helpers,
--   - authenticated must not EXECUTE protect_message_updates() (it is invoked
--     by the trigger on public.messages, which runs with the invoker's
--     privileges already gated by the RLS UPDATE policy).
--   Then re-grant the intended matrix: authenticated + service_role for the
--   four RPC/policy helpers, service_role only for the trigger function.
--
-- Idempotent: revoking an absent grant is a no-op; re-granting is idempotent.
-- ============================================================================

REVOKE ALL ON FUNCTION public.can_view_post(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_conversation_participant(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_post_interactions(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_direct_conversation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.protect_message_updates() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.can_view_post(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_post_interactions(uuid[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.protect_message_updates() TO service_role;
