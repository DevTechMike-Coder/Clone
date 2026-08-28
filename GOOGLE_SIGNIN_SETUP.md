# Native Google Sign-In setup

## 1. Install
```
npx expo install @react-native-google-signin/google-signin expo-crypto
```
Get v21+ of google-signin — custom nonce support (what `nonce: nonceDigest` relies on) only landed in v21.

## 2. Google Cloud Console — two clients, not one

**Web application client** (for `webClientId` / `serverClientId`)
- Credentials → Create Credentials → OAuth client ID → Web application
- No redirect URI needed for this flow (that was only for the browser-based approach)
- Copy the Client ID → this is `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

**Android client** (this is what the SHA-1 screenshot was actually for)
- Application type: Android
- Package name: `com.clone.app` (matches `app.json` → `android.package`)
- SHA-1: you need one per keystore you build with. Get them via:
  ```
  # after `npx expo prebuild`, debug keystore:
  keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android

  # EAS-managed release keystore:
  eas credentials   # Android → your build profile → Keystore → view SHA-1
  ```
- You can add multiple SHA-1 fingerprints to the same Android client (debug + release both go here). This client's ID never goes in app code — Google matches requests by package name + fingerprint automatically.

## 3. If you're building for iOS too
- Create an **iOS** OAuth client in the same console (bundle ID, no SHA-1)
- Get the `REVERSED_CLIENT_ID` from the downloaded `GoogleService-Info.plist` (or the iOS client ID reversed manually)
- Add it to the plugin config in `app.json`:
```json
["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.YOUR_IOS_CLIENT_ID" }]
```

## 4. Env var
Add to `.env.local` (already gitignored):
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<the Web application client ID from step 2>
```

## 5. Supabase
Auth → Providers → Google → paste the **Web client's** ID + Secret into "Client IDs" / "Client Secret". Leave "Skip nonce checks" off — the native flow properly supplies a nonce, so there's no reason to disable verification.

## 6. Rebuild
Config plugins only take effect on a native rebuild, not Fast Refresh:
```
npx expo prebuild --clean
npx expo run:android   # or your EAS dev build
```
