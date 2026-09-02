import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * Multi-account switching.
 *
 * How it stays working despite refresh-token rotation:
 * Supabase rotates a refresh token when it is USED. We snapshot the current
 * token on every SIGNED_IN / TOKEN_REFRESHED event (AuthContext), so the
 * stored token is always the freshest for the account you're actively using.
 * While you're signed in as account B, account A's stored token simply sits
 * unused — and unused tokens are not rotated or invalidated, so switching
 * back via `setSession()` keeps working until the token's long expiry.
 *
 * Signing OUT of an account removes it from the switcher (explicit logout),
 * which is why `switchToAccount` swaps sessions without a global signOut
 * (a global signOut would revoke the token we just stored for switching).
 */

export type SavedAccount = {
  userId: string;
  email: string | null;
  /** Token snapshot; updated on every TOKEN_REFRESHED (rotation-safe). The
   *  access token may be expired by switch time — supabase-js refreshes it
   *  using the refresh token during setSession. */
  refreshToken: string;
  accessToken: string;
  savedAt: number;
};

export type SavedAccountProfile = SavedAccount & {
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

const STORAGE_KEY = "clone.savedAccounts";
const MAX_ACCOUNTS = 5;

async function readAccounts(): Promise<SavedAccount[]> {
  if (Platform.OS === "web") return [];
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAccounts(accounts: SavedAccount[]): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(accounts));
  } catch (error) {
    console.warn("[accounts] Failed to persist account list:", error);
  }
}

export const accountService = {
  /**
   * Snapshot the active session for the switcher. Called from AuthContext
   * on SIGNED_IN and TOKEN_REFRESHED so the stored token never goes stale.
   */
  async rememberSession(session: Session | null): Promise<void> {
    if (!session?.user?.id || !session.refresh_token || !session.access_token)
      return;
    const accounts = await readAccounts();
    const next: SavedAccount = {
      userId: session.user.id,
      email: session.user.email ?? null,
      refreshToken: session.refresh_token,
      accessToken: session.access_token,
      savedAt: Date.now(),
    };
    const rest = accounts.filter((a) => a.userId !== next.userId);
    // Most recently used first; cap the list so it can't grow forever.
    await writeAccounts([next, ...rest].slice(0, MAX_ACCOUNTS));
  },

  /** Drop an account from the switcher (e.g. explicit sign-out). */
  async removeAccount(userId: string): Promise<void> {
    const accounts = await readAccounts();
    await writeAccounts(accounts.filter((a) => a.userId !== userId));
  },

  /** Raw saved accounts, most-recently-used first. */
  async listAccounts(): Promise<SavedAccount[]> {
    return readAccounts();
  },

  /** Saved accounts merged with live public profile data for display. */
  async listAccountsWithProfiles(): Promise<SavedAccountProfile[]> {
    const accounts = await readAccounts();
    if (accounts.length === 0) return [];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in(
        "id",
        accounts.map((a) => a.userId)
      );

    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return accounts.map((a) => {
      const p = byId.get(a.userId) as any;
      return {
        ...a,
        username: p?.username ?? null,
        full_name: p?.full_name ?? null,
        avatar_url: p?.avatar_url ?? null,
      };
    });
  },

  /**
   * Swap the live session to a saved account. AuthContext's
   * onAuthStateChange drives the app-wide refresh afterwards.
   *
   * Throws (and drops the entry) when the stored token is no longer valid —
   * e.g. the credential was revoked or expired server-side.
   */
  async switchToAccount(userId: string): Promise<void> {
    const accounts = await readAccounts();
    const target = accounts.find((a) => a.userId === userId);
    if (!target) throw new Error("That account isn't saved on this device");

    const current = (await supabase.auth.getSession()).data.session;
    if (current?.user?.id === userId) return; // already active

    const { error } = await supabase.auth.setSession({
      access_token: target.accessToken,
      refresh_token: target.refreshToken,
    });

    if (error) {
      // Dead credential — stop offering it.
      await accountService.removeAccount(userId);
      throw new Error(
        "Couldn't switch to that account (session expired). Sign in again."
      );
    }
  },
};
