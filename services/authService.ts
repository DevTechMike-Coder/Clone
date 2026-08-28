import { supabase } from "@/lib/supabase";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import * as Crypto from "expo-crypto";
import { encode as encodeBase64 } from "base64-arraybuffer";
import { Platform } from "react-native";
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";

// Complete any pending auth session in web browser (still used for Apple)
WebBrowser.maybeCompleteAuthSession();

GoogleSignin.configure({
  // Web client, NOT the Android client. This is what lets Google issue a
  // verifiable idToken — the Android client only identifies the app via
  // package name + SHA-1, it never goes in app code.
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
});

// url-safe nonce, per https://github.com/react-native-google-signin/docs (Custom nonce)
function getUrlSafeNonce(byteLength = 32): string {
  const bytes = Crypto.getRandomBytes(byteLength);
  return encodeBase64(bytes.buffer)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getNonce() {
  const rawNonce = getUrlSafeNonce();
  // Supabase verifies this hash against the nonce baked into the idToken.
  const nonceDigest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );
  return { rawNonce, nonceDigest };
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

  // OAuth Sign In Helper (Google / Apple)
  async signInWithOAuthProvider(provider: "google" | "apple") {
    const redirectUrl = Linking.createURL("auth/callback");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: Platform.OS !== "web",
      },
    });

    if (error) throw error;

    if (Platform.OS === "web") {
      return data;
    }

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

  // Sign In with Google (native)
  async signInWithGoogle() {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const { rawNonce, nonceDigest } = await getNonce();

    try {
      const response = await GoogleSignin.signIn({ nonce: nonceDigest });

      if (!isSuccessResponse(response)) {
        // user cancelled the picker
        return null;
      }

      const idToken = response.data.idToken;
      if (!idToken) {
        throw new Error("Google did not return an idToken");
      }

      // rawNonce here, never nonceDigest — Supabase hashes it itself to
      // compare against the digest embedded in the idToken.
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
        nonce: rawNonce,
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
            throw new Error("Google Play Services not available on this device");
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
