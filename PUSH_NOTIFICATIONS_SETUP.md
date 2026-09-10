# Push Notifications

Follow, message, story and story-expiry events now reach the phone as real
push notifications, not just rows in the in-app inbox.

```
 someone follows you
         │
         ▼
 INSERT into public.follows
         │
         ▼  trigger: follows_notify
 INSERT into public.notifications          ← the inbox row, written in the DB
         │
         ▼  trigger: notifications_dispatch_push  (statement level)
         │  · skips recipients with no registered device
         │  · skips types the recipient has switched off
         ▼  pg_net (async HTTP, one call per statement)
 Edge Function: send-push-notification
         │  · loads batch + actors + tokens + preferences
         ▼
 Expo Push API  ──►  APNs / FCM  ──►  the phone
```

The story-expiry reminder is the one event with no insert to hang off, so it
runs on a clock instead:

```
 pg_cron (every 30 min)
   └─► Edge Function: story-expiry-notifications
         └─► public.enqueue_story_expiry_notifications()
               └─► INSERT into public.notifications  ──► same dispatch path
```

---

## What already exists in the repo

| Piece | Where |
| --- | --- |
| `push_tokens`, `notification_preferences` tables | `supabase/migrations/20260907120000_push_infrastructure.sql` |
| Notification triggers + dispatch trigger | `supabase/migrations/20260907130000_notification_triggers.sql` |
| Story-expiry cron job | `supabase/migrations/20260907140000_story_expiry_schedule.sql` |
| Push sender | `supabase/functions/send-push-notification/index.ts` |
| Story-expiry finder | `supabase/functions/story-expiry-notifications/index.ts` |
| Token registration + tap routing | `services/pushService.ts`, `lib/usePushNotifications.ts` |
| User-facing switches | `app/(pages)/pushNotifications.tsx` (linked from Accounts Center) |

`expo-notifications` and `expo-device` are installed, the config plugin is in
`app.json`, and `android.permission.POST_NOTIFICATIONS` is declared (the
plugin does **not** add that one itself — without it Android 13+ silently
never grants permission).

---

## One-time setup

### 0. Firebase / FCM credentials (Android — required before any Android build)

On Android, `expo-notifications` mints its token through Firebase Cloud
Messaging. If the native build has no Firebase config, token registration
fails on-device with:

> `Unable to get Firebase Messaging instance. Did you configure`
> `` `googleServicesFile` `path in app config? … Default FirebaseApp is not`
> `initialized in this process.`

The app catches this and keeps working without pushes, but no Android
device will ever register a token until you do the following once:

1. Create a Firebase project at <https://console.firebase.google.com>,
   then **Add app → Android** with package name `com.clone.app`
   (must match `android.package` in `app.json`).
2. Download the resulting **`google-services.json`** into the project
   root (next to `app.json`). It is gitignored — never commit the real
   file.
3. Point `app.json` at it:
   ```json
   "android": {
     "package": "com.clone.app",
     "googleServicesFile": "./google-services.json"
   }
   ```
   Do not add this line before the file exists — prebuild fails when the
   referenced file is missing.
4. In the Firebase console go to **Project settings → Service accounts →
   Generate new private key**, then upload that JSON to Expo so the Expo
   Push API can send via FCM on your behalf:
   ```bash
   eas credentials
   # Android → Push Notifications → Manage your FCM push key → Upload a service account JSON
   ```
   (Full walkthrough:
   <https://docs.expo.dev/push-notifications/fcm-credentials>.)
5. **Rebuild** the dev client — this is a native change, so a JS-only
   reload is not enough:
   ```bash
   eas build --profile development --platform android
   # or, for a local bare build:
   npx expo run:android
   ```

iOS does not need this step (it uses APNs; see “Before you ship” below).

### 1. Apply the migrations

```bash
supabase db push
```

This also registers the `story-expiry-notifications` cron job. If `pg_cron`
is not enabled on your project, the migration prints a notice and skips the
schedule — enable **Database → Extensions → pg_cron**, re-run, then confirm:

```sql
select jobid, jobname, schedule from cron.job;
```

### 2. Create the vault secrets

The dispatch trigger reads these directly out of the vault, so neither the
project URL nor the shared token is ever committed.

```sql
-- No trailing slash.
insert into vault.secrets (name, secret)
values ('supabase_functions_url', 'https://YOUR-PROJECT.supabase.co/functions/v1')
on conflict (name) do update set secret = excluded.secret;
```

Then generate a token and store it **twice** — once for the database to send
with, once for the Edge Function to check against:

```bash
openssl rand -hex 32
```

```sql
insert into vault.secrets (name, secret)
values ('push_edge_function_token', 'PASTE_THE_TOKEN_HERE')
on conflict (name) do update set secret = excluded.secret;
```

### 3. Set the Edge Function secret

```bash
supabase secrets set PUSH_FUNCTION_TOKEN=PASTE_THE_SAME_TOKEN_HERE
```

Optional but recommended — a higher Expo rate limit and delivery receipts:

```bash
supabase secrets set EXPO_ACCESS_TOKEN=your-expo-access-token
```

### 4. Deploy the functions

```bash
supabase functions deploy send-push-notification
supabase functions deploy story-expiry-notifications
```

`verify_jwt` is already disabled for both in `supabase/config.toml`, because
their callers are Postgres and pg_cron rather than a signed-in user. They
authenticate with the shared token instead.

### 5. Build onto a real device

Push notifications do not work in Expo Go or in a simulator — `expo-device`
reports `isDevice: false` and registration is skipped by design.

```bash
eas build --profile development --platform android   # or ios
```

Install it, sign in, and the token registration runs automatically.

---

## Testing

**Check the token landed:**

```sql
select user_id, platform, device_id, is_active, last_seen_at
from public.push_tokens
order by last_seen_at desc;
```

**Send yourself a real push** without needing anyone to follow you — insert a
notification row and let the normal pipeline do the rest:

```sql
insert into public.notifications (user_id, from_user_id, type)
values ('RECIPIENT_UUID', 'SOMEONE_ELSES_UUID', 'follow');
```

**Trigger the whole thing for real:** follow someone from a second account.

**Watch it go out:**

```bash
supabase functions logs send-push-notification --follow
```

**Check the cron job** (it returns 0 when no story is inside the window,
which is most of the time):

```bash
supabase functions logs story-expiry-notifications --follow
```

To exercise it without waiting two hours, insert a story that is already
inside the reminder window and call the function directly:

```sql
insert into public.stories (user_id, media_url, media_type, expires_at)
values ('YOUR_UUID', 'https://example.com/a.jpg', 'image', now() + interval '2 hours');

select public.enqueue_story_expiry_notifications();  -- expect 1 per unwatched follower
```

### If nothing arrives

| Symptom | Likely cause |
| --- | --- |
| No row in `push_tokens` | Simulator/Expo Go, or permission not granted. Check **Settings → Push Notifications** in the app. |
| `Unable to get Firebase Messaging instance` / `Default FirebaseApp is not initialized` | Step 0 not done: no `google-services.json` / `googleServicesFile` in the Android build. Complete Step 0 and **rebuild** (native change). |
| Row exists, no push | Vault secrets missing or the token is wrong. The trigger logs `push dispatch skipped …`. |
| `401 unauthorized` in function logs | `PUSH_FUNCTION_TOKEN` ≠ the vault secret. They must be byte-identical. |
| Push arrives, tap does nothing | Check `handleNotificationNavigation` in `services/pushService.ts` against the `data` payload. |
| Android silent, iOS fine | Missing `POST_NOTIFICATIONS` permission, or the app was built before the plugin was added — rebuild. |

---

## Defaults

Preferences gate the **push only** — the in-app inbox always keeps everything.

| Event | Default | Why |
| --- | --- | --- |
| New followers | on | High signal |
| Messages | on | High signal |
| Comments | on | High signal |
| New stories | on | High signal |
| Stories expiring | on | Requested |
| Likes | **off** | High volume, low signal |
| Reposts | **off** | High volume, low signal |

Change the defaults in `public.notification_preferences` (the column
defaults) and `DEFAULT_NOTIFICATION_PREFERENCES` in
`services/notificationService.ts` — keep the two in sync.

---

## Adding a new notification type

1. Add the value to the `notifications_type_check` constraint (migration).
2. Add a trigger that inserts the row, or insert it from a job.
3. Add the `when '<type>' then p.push_<type>` arm to the dispatch trigger and
   a matching column in `notification_preferences`.
4. Add the copy to `renderNotification()` in the Edge Function.
5. Add a case to `handleNotificationNavigation()` for tap routing.
6. Add the type to `NotificationType` in `services/notificationService.ts`.

Nothing else changes — dispatch, batching, preference checks and dead-token
cleanup are all driven off the row.

---

## Before you ship to TestFlight / App Store

The `expo-notifications` config plugin writes the iOS `aps-environment`
entitlement with `mode` defaulting to `"development"`. That is correct for the
development build you are testing with today, but a production distribution
needs:

```json
["expo-notifications", { "mode": "production" }]
```

Since `app.json` is static, flip it (or move to `app.config.js`) as part of
the release. iOS also needs a paid Apple Developer account with the Push
Notifications capability; EAS syncs the capability when you run the build.

Two smaller things worth knowing:

- **Message bodies are not previews.** A push payload traverses Expo, APNs
  and FCM, so chat content is deliberately kept out of it.
- **Push receipts are not processed.** Tickets are — a `DeviceNotRegistered`
  response deactivates the token immediately. Receipts only catch delayed
  failures; add a job if you need that.
