import { supabase } from "@/lib/supabase";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

// Complete any pending auth session in web browser (still used for Apple)
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// The web client ID is the only ID that belongs in app code. The Android
// OAuth client in Google Cloud Console is matched automatically by package
// name + SHA-1 fingerprint, so it never appears in code.
if (!GOOGLE_WEB_CLIENT_ID) {
  console.warn(
    "[authService] EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set. " +
      "Google Sign-In will fail. Create a 'Web application' OAuth client in " +
      "Google Cloud Console and put its Client ID in .env.local."
  );
}

type GoogleSigninModule = typeof import("@react-native-google-signin/google-signin");

// The `@react-native-google-signin/google-signin` package is backed by a
// native module (`RNGoogleSignin`) and throws at *import time* when that
// module is not present in the running binary:
//
//   TurboModuleRegistry.getEnforcing(...): 'RNGoogleSignin' could not be found
//
// That happens in Expo Go, which only ships the native modules Expo itself
// provides. Importing the package at the top of this file used to crash every
// screen that imports `authService` (signIn, signUp, profile) — expo-router
// even reported those routes as "missing the required default export" because
// their module evaluation threw. We therefore load the package lazily, only
// when the user actually taps "Google", so the rest of the app works in Expo
// Go and Google Sign-In fails with a clear message instead. (Metro memoizes
// `require`, so this stays a single module instance per app run.)
function loadGoogleSignin(): GoogleSigninModule {
  if (Platform.OS === "web") {
    throw new Error(
      "Google Sign-In is only available in the mobile app (Android/iOS)."
    );
  }

  try {
    return require("@react-native-google-signin/google-signin");
  } catch {
    throw new Error(
      "Google Sign-In is not available in this build. It requires a " +
        "development or production build with the native module — it does " +
        "not work in Expo Go. See GOOGLE_SIGNIN_SETUP.md."
    );
  }
}

function extractParamsFromUrl(url: string): Record<string, string> {
  const hashIndex = url.indexOf("#");
  const queryIndex = url.indexOf("?");

  let paramsString = "";
  if (hashIndex !== -1) {
    paramsString = url.substring(hashIndex + 1);
  } else if (queryIndex !== -1) {
    paramsString = url.substring(queryIndex + 1);
  }

  const params: Record<string, string> = {};
  if (paramsString) {
    paramsString.split("&").forEach((pair) => {
      const [k, v] = pair.split("=");
      if (k && v) {
        params[decodeURIComponent(k)] = decodeURIComponent(v);
      }
    });
  }
  return params;
}

export const authService = {
  // Sign Up with Email and Password
  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
    return data;
  },

  // Sign In with Email and Password
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  // OAuth Sign In Helper (Apple)
  async signInWithOAuthProvider(provider: "apple") {
    const redirectUrl = Linking.createURL("auth/callback");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      if (result.type === "success" && result.url) {
        const params = extractParamsFromUrl(result.url);

        // PKCE Code Exchange flow
        if (params.code) {
          const { data: sessionData, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(params.code);
          if (exchangeError) throw exchangeError;
          return sessionData;
        }

        // Implicit Access Token flow
        if (params.access_token && params.refresh_token) {
          const { data: sessionData, error: sessionError } =
            await supabase.auth.setSession({
              access_token: params.access_token,
              refresh_token: params.refresh_token,
            });
          if (sessionError) throw sessionError;
          return sessionData;
        }
      }
    }

    return null;
  },

  // Sign In with Google (native, Android + iOS only)
  async signInWithGoogle() {
    const { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } =
      loadGoogleSignin();

    if (!GOOGLE_WEB_CLIENT_ID) {
      throw new Error(
        "Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID. See GOOGLE_SIGNIN_SETUP.md."
      );
    }

    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    try {
      // NOTE: no `nonce` is passed here. The installed version of
      // @react-native-google-signin/google-signin (16.1.4, the latest) does
      // NOT support custom nonces, so the Google ID token contains no nonce
      // claim. Supabase (GoTrue) only accepts a token with a nonce if you also
      // send one — sending a nonce here would make it reject the token with
      // "Passed nonce and nonce in id_token should either both exist or not."
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        // User cancelled the picker
        return null;
      }

      const idToken = response.data.idToken;
      if (!idToken) {
        throw new Error("Google did not return an idToken");
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      if (error) throw error;
      return data;
    } catch (err) {
      if (isErrorWithCode(err)) {
        switch (err.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            return null;
          case statusCodes.IN_PROGRESS:
            throw new Error("Sign-in already in progress");
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            throw new Error(
              "Google Play Services not available on this device"
            );
          default:
            throw err;
        }
      }
      throw err;
    }
  },

  // Sign In with Apple
  async signInWithApple() {
    return this.signInWithOAuthProvider("apple");
  },

  // Sign Out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
};
