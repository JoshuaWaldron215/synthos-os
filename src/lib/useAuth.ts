import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "./supabase";

export interface Session {
  email: string;
}

const LOCAL_KEY = "synthos-auth";

function readLocal(): Session | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export interface AuthApi {
  session: Session | null;
  loading: boolean;
  /** true when no real backend is wired (auth is simulated locally) */
  local: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthApi {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!supabase) {
      setSession(readLocal());
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session ? { email: data.session.user.email ?? "" } : null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s ? { email: s.user.email ?? "" } : null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    const trimmed = email.trim();
    if (!trimmed || !password) return { error: "enter your email and password" };

    if (!supabase) {
      const s = { email: trimmed };
      localStorage.setItem(LOCAL_KEY, JSON.stringify(s));
      setSession(s);
      return {};
    }
    const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
    if (error) return { error: error.message };
    return {};
  };

  const signOut = async () => {
    if (!supabase) {
      localStorage.removeItem(LOCAL_KEY);
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
    setSession(null);
  };

  return { session, loading, local: !isSupabaseConfigured, signIn, signOut };
}
