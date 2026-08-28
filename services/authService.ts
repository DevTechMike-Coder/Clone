import { supabase } from "@/lib/supabase";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

// Complete any pending auth session in web browser
WebBrowser.maybeCompleteAuthSession();

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

  // Sign In with Google
  async signInWithGoogle() {
    return this.signInWithOAuthProvider("google");
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
