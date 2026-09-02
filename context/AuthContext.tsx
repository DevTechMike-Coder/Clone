import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { pushNotificationService } from "@/services/pushNotificationService";
import { accountService } from "@/services/accountService";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // A session restored from storage can be stale/invalid (expired token,
    // or leftover from a different Supabase project). The client would keep
    // sending it, and RLS would reject every authenticated request with
    // 42501 ("new row violates row-level security policy") while the UI
    // still looks signed in. Verify the token server-side and drop it if
    // it is no longer valid.
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        supabase.auth.signOut();
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Keep the multi-account switcher's token snapshot fresh — see
        // services/accountService.ts for the rotation-safe design.
        if (_event === "SIGNED_IN" || _event === "TOKEN_REFRESHED") {
          accountService.rememberSession(session).catch(() => {});
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Once a session exists, register this device for push notifications.
  // Fire-and-forget: permission prompts / token storage must never block
  // auth, and the call is a guarded no-op in Expo Go / web.
  useEffect(() => {
    if (!user) return;
    pushNotificationService
      .registerDevice()
      .catch((error) => console.warn("[push] registration failed:", error));
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ session, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
