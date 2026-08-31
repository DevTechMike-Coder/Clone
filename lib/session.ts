import { supabase } from "./supabase";

/**
 * Resolve the id of the currently authenticated user, refreshing the access
 * token first if it has expired.
 *
 * `supabase.auth.getUser()` throws when the stored access token is invalid or
 * expired — which happens when a session restored from storage goes stale.
 * Before giving up, we try `refreshSession()`, which exchanges a still-valid
 * refresh token for a fresh access token without any user interaction, so the
 * common "session expired" case recovers automatically.
 *
 * Returns null only when there is no recoverable session (the user never
 * signed in, or the refresh token itself is invalid/revoked). Callers should
 * then fall back to a clear "please sign in again" error.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      return user.id;
    }
  } catch {
    // Access token invalid/expired — fall through and try to refresh it.
  }

  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.user) {
      return data.user.id;
    }
  } catch {
    // No session to refresh, or the refresh token was rejected.
  }

  return null;
}
