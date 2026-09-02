# Push Notifications Setup

End-to-end remote push (delivery while the app is backgrounded/closed) via
`expo-notifications` + Expo's push service + a Supabase edge function.

## What was added

| Piece | Location |
|---|---|
| Client service (permission, token, handler, tap → deep-link) | `services/pushNotificationService.ts` |
| Boot wiring (handler + tap listener) | `app/_layout.tsx` |
| Register on sign-in | `context/AuthContext.tsx` |
| Unregister before sign-out | `app/(tabs)/profile.tsx` |
| Plugin + `POST_NOTIFICATIONS` permission | `app.json` |
| `push_tokens` table + RLS | `supabase/migrations/20260902120000_push_tokens.sql` |
| Delivery fan-out (webhook → Expo push API) | `supabase/functions/send-push/index.ts` |

Expo push tokens work with **no FCM/APNs keys in the repo**; credentials are
configured on Expo's servers (step 4).

## Steps

1. **Rebuild the dev client** (the native module must be compiled in):

   ```sh
   eas build --profile development
   ```

   Expo Go cannot do remote push (removed in SDK 53) — the code detects that
   and no-ops there, same as Google Sign-In.

2. **Apply the migration:**

   ```sh
   supabase db push        # or paste the SQL in the dashboard SQL editor
   ```

3. **Deploy the edge function and set the secret:**

   ```sh
   supabase secrets set PUSH_WEBHOOK_SECRET=<random-string>
   supabase functions deploy send-push
   ```

   (`verify_jwt = false` is already set in `supabase/config.toml` — database
   webhooks aren't Supabase-auth users, so the function checks the shared
   secret header instead.)

4. **Wire the database webhook:** Supabase Dashboard → Database → Webhooks →
   *Create webhook*:
   - Table: `notifications`, Events: **Insert**
   - Type: `HTTP Request` → `POST`
   - URL: `https://<project-ref>.supabase.co/functions/v1/send-push`
   - Headers: `x-push-webhook-secret: <random-string>` (must match step 3)

5. **Android production/preview:** add FCM credentials to Expo:
   Firebase console → project → *Cloud Messaging* → service account key →
   Expo dashboard (`Credentials` → Android → *FCM V1 service account key*).
   The dev build works for local/e2e testing without this on most emulators,
   but Play-signed builds need it.

## Testing

- In-app: sign in on a dev build → permission prompt appears → a row lands
  in `push_tokens`.
- From another account, like/comment/follow → the `notifications` insert
  triggers the webhook → push arrives even with the app closed.
- Debug delivery with the push token at
  [expo.dev/notifications](https://expo.dev/notifications).

## Behavior notes

- Foreground notifications show a banner + sound (handler in
  `pushNotificationService.configure()`).
- Tapping a push deep-links: `message` → conversation, `postId` → post view,
  `follow` → the follower's profile.
- Sign-out deletes only *this* device's token; other devices keep receiving
  pushes.
