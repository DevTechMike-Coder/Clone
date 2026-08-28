# Native Google Sign-In setup (Android + iOS only)

This project is **mobile-only** (`"platforms": ["android", "ios"]` in `app.json`).
Google Sign-In uses the native `@react-native-google-signin/google-signin` package
with Supabase's ID-token flow.

## 1. Dependencies (already installed)

`@react-native-google-signin/google-signin@16.1.4` (latest on npm) and
`expo-crypto` are in `package.json`. Do **not** try to upgrade to a "v21" —
it does not exist; 16.1.4 is the newest release.

> **Important:** 16.1.4 does **not** support custom nonces. `authService.ts`
> therefore deliberately does not send a nonce to Google or to Supabase.
> Supabase only accepts a nonce if the ID token *also* contains one, so
> sending one would break sign-in with
> "Passed nonce and nonce in id_token should either both exist or not."
> Keep it this way until the library ships nonce support.

> **Expo Go:** the package's native module (`RNGoogleSignin`) is not present in
> Expo Go, and *importing* the package there throws
> `TurboModuleRegistry.getEnforcing(...): 'RNGoogleSignin' could not be found`.
> `authService.ts` therefore imports it lazily (only when the user taps the
> Google button, wrapped in try/catch), so the rest of the app runs normally in
> Expo Go and the Google button shows a clear "not available in this build"
> error instead of crashing the app.

## 2. Google Cloud Console — create TWO OAuth clients

Console: https://console.cloud.google.com/apis/credentials

### A. "Web application" client — this one goes in app code + Supabase

- Create Credentials → OAuth client ID → **Web application**
- Authorized redirect URIs: `https://<your-project>.supabase.co/auth/v1/callback`
- No SHA-1 involved for this client.
- Copy the Client ID → it is `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.

### B. "Android" client — this is what the SHA-1 fingerprint is for

- Create Credentials → OAuth client ID → **Android**
- Package name: `com.clone.app` (must match `app.json` → `android.package` exactly)
- SHA-1 certificate fingerprints: add **one per keystore you build with**.
  You can add several fingerprints to the same Android client — Google checks
  package name + any registered SHA-1.

This Android client's ID is **never put in app code**. Google matches the app
to this client automatically via package name + SHA-1.

## 3. Getting the SHA-1 fingerprints right

This is where almost all Android Google Sign-In failures come from
(`ApiException: 10` / DEVELOPER_ERROR, "There was a problem with your request",
or the picker closing instantly). Rules:

1. **The fingerprint must come from the keystore that actually signed the build.**
   A debug build and a release build have different SHA-1s. If you added the
   debug SHA-1 but are testing a release/dev-client build, it fails.
2. **Add both:**

   - Debug keystore (after `npx expo prebuild`, file lives at `android/app/debug.keystore`):
     ```bash
     keytool -list -v -keystore android/app/debug.keystore \
       -alias androiddebugkey -storepass android -keypass android | grep SHA1
     ```
   - EAS-managed release keystore:
     ```bash
     eas credentials
     # Android → select your build profile → Keystore → "Keystore SHA-1 fingerprint"
     ```
     (If you use a locally generated keystore instead, run the same `keytool`
     command against it.)
3. **Play Store builds additionally need the Play App Signing key's SHA-1.**
   Once you publish, Google re-signs with its own key: Play Console → your app →
   Setup → App integrity → "App signing key certificate" → copy the SHA-1 and
   add it to the same Android OAuth client. Otherwise Play-downloaded builds
   fail sign-in even though your EAS build worked.
4. **Do not test Google Sign-In inside Expo Go.** In Expo Go the app runs with
   Expo Go's own signature, not your fingerprint, so it will never match your
   Android client. Use a development build:
   ```bash
   npx expo prebuild --clean
   npx expo run:android        # debug build, uses android/app/debug.keystore
   # or an EAS dev build: eas build --profile development --platform android
   ```
5. **After adding a fingerprint, Google takes a few minutes to propagate.**
   If it still fails, wait ~5–10 min, fully uninstall the app from the device,
   and rebuild/reinstall (Android caches Google credential state per install).

## 4. iOS (optional but recommended)

- Create an **iOS** OAuth client (bundle ID; no SHA-1 — iOS uses no fingerprint).
- Add the plugin config in `app.json`:
  ```json
  ["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.YOUR_IOS_CLIENT_ID" }]
  ```
  The iOS client ID (or its reversed form) comes from the `GoogleService-Info.plist`
  for your bundle ID.

## 5. Environment variable

Add to `.env.local` (gitignored):
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<the Web application client ID from step 2A>
```
Restart the dev server after changing env vars.

## 6. Supabase dashboard

Auth → Providers → Google:
- Client ID: the **Web** client's ID from step 2A
- Client Secret: its secret
- Redirect URL on the Google side: `https://<your-project>.supabase.co/auth/v1/callback`
- "Skip nonce checks": leave **off**. (Irrelevant for the native flow — no
  nonce is sent — but it's the safer default for any web flows you add later.)

## 7. Rebuild

Config plugins and native modules only take effect on a native rebuild, not
Fast Refresh:
```bash
npx expo prebuild --clean
npx expo run:android
# or eas build --profile development --platform android
```

## 8. Quick failure reference

| Error | Cause |
| --- | --- |
| `ApiException: 10` (DEVELOPER_ERROR) | SHA-1/package mismatch — re-check step 3 |
| Toast: "nonce in id_token should either both exist or not" | Someone re-added a nonce to `signInWithGoogle` — remove it (library can't produce nonces) |
| Picker opens then closes instantly | SHA-1 not registered, or testing in Expo Go |
| Works on one device, not another | Different install signing (debug vs release/Play) — add all fingerprints |
| `Unacceptable audience in id_token` | `webClientId` in `GoogleSignin.configure()` doesn't match the Google client ID configured in Supabase |
