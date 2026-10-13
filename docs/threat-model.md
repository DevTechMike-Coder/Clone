# Clone: Threat Model

Scope: `main` branch. Status: ✅ implemented · ⚠️ partial / documented gap · 🔲 planned.

## 1. System overview

Expo / React Native social app (posts, stories, follows, chat, push notifications) on Supabase: Postgres with Row Level Security, Storage buckets, Auth, two Edge Functions (`send-push-notification`, `story-expiry-notifications`), and `pg_net`/`pg_cron` triggers. **The client talks to Supabase directly with the anon key, so RLS is the authorization layer.** There is no custom API server.

## 2. Assets

Private messages, private-account content, bookmarks, push tokens, user profiles, media in Storage. The service-role key and `PUSH_FUNCTION_TOKEN` are the highest-value secrets.

## 3. Actors

Any authenticated user trying to read/write other users' rows (primary adversary) · a follower vs a non-follower of a private account · a caller hitting the Edge Functions over HTTP · an attacker with a stolen device/storage.

## 4. Controls and status

| Threat | Control | Status | Evidence |
|---|---|---|---|
| Any user reading every DM | Conversation, participant, and message access gated by `is_conversation_participant()` (SECURITY DEFINER, `search_path = ''`) | ✅ | `supabase/migrations/20260828120000_security_hardening.sql` |
| Bookmarks visible to others | Owner-only policies | ✅ | same |
| Private accounts leaking posts/comments/likes | `can_view_post()` checks owner / public profile / follower | ✅ | same |
| Rewriting someone else's message | `protect_message_updates()` trigger: recipients may only mark read | ✅ | same |
| Chat media exposure | Chat media in a private bucket | ✅ | same |
| **A later migration silently re-opening a policy** (this happened once: `20260507000000_chat_policies.sql` widened chat access to any authenticated user until the hardening migration fixed it) | CI replays all migrations on a local Supabase stack and runs semantic RLS assertions plus a diff against a committed `pg_policies` snapshot; both are hard gates on push and PR | ✅ | `.github/workflows/check-rls.yml`, `scripts/check-rls.mjs`, `supabase/rls_snapshot.json` |
| Privilege escalation via SECURITY DEFINER functions | Functions pin `search_path = ''` and re-check `auth.uid()` internally | ✅ | migrations |
| Service-role key in the client bundle | Only `EXPO_PUBLIC_SUPABASE_KEY` (anon) is in the client; the service key is seed-script only and documented as never prefixed `EXPO_PUBLIC_` | ✅ | `.env.example`, `scripts/seed-music.mjs` |
| Token theft from device storage | Auth session stored via `expo-secure-store` (chunked adapter for Android size limits) | ✅ | `lib/supabase.ts` |
| Stale-token failures | `getAuthenticatedUserId()` refreshes the session before failing | ✅ | `lib/session.ts` |
| Unauthenticated calls to Edge Functions | `verify_jwt = false` (caller is a Postgres trigger/cron), so both functions authenticate with a shared bearer secret (`PUSH_FUNCTION_TOKEN`), and fail closed with 500 if it is unset | ⚠️ | `supabase/config.toml`, `supabase/functions/*/index.ts` |
| Timing attack on that token | Compared with `!==`, not a constant-time comparison | ⚠️ | `story-expiry-notifications/index.ts` |
| Push preference bypass | `send-push-notification` re-checks recipient preferences and read state (defence in depth) | ✅ | `send-push-notification/index.ts` |
| Public media of private accounts | `avatars` and `posts` buckets have public read policies, so media is reachable by anyone who knows the URL even when the post row is protected by RLS. Verify the current bucket state against later migrations | ⚠️ | `20260504160000_storage_setup.sql` |
| Input abuse (spam, oversized content) | Not rate limited at the app layer | 🔲 | n/a |

## 5. Assumptions / out of scope

Supabase platform security; a rooted device with the app already compromised; correct secret handling of the service-role key and `PUSH_FUNCTION_TOKEN` outside the repo.

## 6. Roadmap

1. Constant-time compare for `PUSH_FUNCTION_TOKEN`; rotate it on a schedule.
2. Move `posts` media to private buckets with signed URLs (or document the public-URL tradeoff in the app's privacy copy).
3. Add RLS assertions for each new table in `check-rls.mjs` as part of the PR template; run `get_advisors`-style linting in CI.
4. Per-user rate limits on write-heavy tables (posts, comments, messages) via triggers or edge functions.
5. Add CodeQL and Dependabot.
