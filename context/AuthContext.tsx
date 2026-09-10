import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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
    // Guards the async init below: without this, a slow getSession/getUser
    // resolving after unmount (or after a fast sign-out) would set state on
    // an unmounted provider and cause a visible loading flicker.
    let mounted = true;

    const init = async () => {
      try {
        // Check for initial session
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        // A session restored from storage can be stale/invalid (expired
        // token, or leftover from a different Supabase project). The client
        // would keep sending it, and RLS would reject every authenticated
        // request with 42501 ("new row violates row-level security policy")
        // while the UI still looks signed in. Verify the token server-side
        // and drop it if it is no longer valid. Only sign out when there
        // actually was a session — a signed-out user has no user either.
        if (initialSession) {
          const {
            data: { user: verifiedUser },
          } = await supabase.auth.getUser();
          if (!mounted) return;
          if (!verifiedUser) {
            await supabase.auth.signOut();
            if (!mounted) return;
            setSession(null);
            setUser(null);
          }
        }
      } catch {
        // Network/storage failure during init: leave the user signed out
        // rather than stuck on the splash screen. onAuthStateChange below
        // will correct us if a session actually exists.
        if (!mounted) return;
        setSession(null);
        setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void init();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
