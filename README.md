# Clone

A TikTok/Instagram-style short-video social app built with **Expo (React Native)** and **Supabase**. File-based routing, native camera capture, a video feed, stories, chat, push notifications, and a music/sound library sit on top of a Postgres backend with row-level security.

## Tech stack

- **App**: Expo (SDK 57) + Expo Router (typed routes), React 19, React Native 0.86, React Native Reanimated / Worklets
- **Styling**: NativeWind (Tailwind for React Native)
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions, RLS)
- **Auth**: Email/password + Google Sign-In (native), sessions in `expo-secure-store` (chunked to work around Android's SecureStore size limit)
- **Media**: `expo-camera`, `expo-video`, `expo-audio`, `expo-image`
- **Push**: `expo-notifications` + Supabase Edge Functions

## Features

- 👤 **Auth & profiles** — sign up/in, Google Sign-In, editable bio/avatar, follow/unfollow
- 📱 **Feed** — vertical video/image feed, likes, comments, bookmarks, reposts
- 🎵 **Stories & music** — 24h stories, sound/music catalog for posts (see [MUSIC_SOUNDS_SETUP.md](./MUSIC_SOUNDS_SETUP.md))
- 💬 **Chat** — direct messaging (see `services/chatService.ts`)
- 🔔 **Push notifications** — follows, comments, messages, stories, story-expiry reminders (see [PUSH_NOTIFICATIONS_SETUP.md](./PUSH_NOTIFICATIONS_SETUP.md))
- 📸 **Camera** — native capture flow with filters (see [FILTERS_MUSIC_AUDIT.md](./FILTERS_MUSIC_AUDIT.md) for current gaps/roadmap)

See [feature_roadmap.md](./feature_roadmap.md) for the full feature backlog and status.

## Project structure

```
app/
  (auth)/       # Sign-in / sign-up routes
  (tabs)/       # Main tab navigator (feed, explore, chat, profile, ...)
  (pages)/      # Modals & stacked screens
components/     # UI components (feed, camera, modals, stories, ...)
services/       # Supabase-backed data layer (posts, auth, chat, follows, ...)
lib/            # Supabase client, hooks, utilities
context/        # React context providers
store/          # Local app state (e.g. pending post drafts)
supabase/
  migrations/   # SQL schema migrations
  functions/    # Edge Functions (push notifications, story expiry)
  seed/         # Seed data
scripts/        # RLS audit (check-rls.mjs) and music-catalog seeding
```

## Getting started

### 1. Prerequisites

- Node.js (LTS) and npm
- A Supabase project (URL + anon key)
- Expo Go **or** a development build (native modules — Google Sign-In, camera, audio — require a dev client; Expo Go alone won't cover everything)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=your-supabase-project-url
EXPO_PUBLIC_SUPABASE_KEY=your-supabase-anon-key
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-oauth-web-client-id   # only needed for Google Sign-In
```

For native Google Sign-In (Android/iOS), follow [GOOGLE_SIGNIN_SETUP.md](./GOOGLE_SIGNIN_SETUP.md) — it covers the OAuth client setup and SHA-1 fingerprints.

### 4. Apply the database schema

Run the SQL files in `supabase/migrations/` against your Supabase project (via the Supabase CLI or dashboard SQL editor), in order.

### 5. Run the app

```bash
npx expo start
```

Native modules in this project (camera, Google Sign-In, notifications) mean a **development build** is recommended over plain Expo Go:

```bash
npx expo run:android
# or
npx expo run:ios
```

## Useful scripts

| Command | Purpose |
|---|---|
| `npm run lint` | Lint with `expo lint` |
| `npm run typecheck` | TypeScript check with no emit |
| `npm run check:rls` | Audit Supabase Row-Level Security policies |
| `npm run check:rls:self-test` | Self-test the RLS checker |
| `npm run check:rls:compare-snapshot` | Diff current RLS state against the committed snapshot |
| `npm run check:rls:update-snapshot` | Regenerate the committed RLS snapshot |
| `npm run seed:music` | Seed the music/sound catalog into Supabase |
| `npm run reset-project` | Reset to a blank Expo starter (moves current app to `app-example`) |

## Security notes

- Row-level security is enforced on all Supabase tables; `scripts/check-rls.mjs` audits policies against a committed snapshot (`supabase/rls_snapshot.json`) so drift is caught in CI/local checks rather than in production.
- Sessions are stored via `expo-secure-store` with chunking for values that exceed Android's ~2KB per-entry limit — see `lib/supabase.ts` for details.
- Never commit `.env` or `google-services.json` with real credentials to a public fork.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, ...)
4. Open a pull request

## License

No license specified — all rights reserved by default until one is added.
