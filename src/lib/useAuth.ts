import { useEffect, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { isKnownTeammate } from "./profile";

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
    let unsubscribe: (() => void) | undefined;
    if (!isSupabaseConfigured) {
      // Local simulated auth is a dev convenience only. A production build with
      // no Supabase env vars must not fall back to "any email works".
      setSession(import.meta.env.DEV ? readLocal() : null);
      setLoading(false);
      return;
    }
    getSupabase().then((sb) => {
      if (!sb || !active) return;
      sb.auth.getSession().then(({ data }) => {
        if (!active) return;
        const email = data.session?.user.email ?? "";
        // Reject a restored session that isn't a known teammate (e.g. a stray
        // auth user) instead of silently operating as builder 0.
        if (data.session && !isKnownTeammate(email)) {
          sb.auth.signOut();
          setSession(null);
        } else {
          setSession(data.session ? { email } : null);
        }
        setLoading(false);
      });
      const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
        const email = s?.user.email ?? "";
        if (s && !isKnownTeammate(email)) return;
        setSession(s ? { email } : null);
      });
      unsubscribe = () => sub.subscription.unsubscribe();
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    const trimmed = email.trim();
    if (!trimmed || !password) return { error: "enter your email and password" };

    const sb = await getSupabase();
    if (!sb) {
      if (!import.meta.env.DEV) {
        return { error: "sign-in is unavailable — this build has no backend configured" };
      }
      const s = { email: trimmed };
      localStorage.setItem(LOCAL_KEY, JSON.stringify(s));
      setSession(s);
      return {};
    }
    const { error } = await sb.auth.signInWithPassword({ email: trimmed, password });
    if (error) return { error: error.message };
    // Real backend: only recognised teammates may hold a session.
    if (!isKnownTeammate(trimmed)) {
      await sb.auth.signOut();
      setSession(null);
      return { error: "this email isn’t a Synthos teammate" };
    }
    return {};
  };

  const signOut = async () => {
    const sb = await getSupabase();
    if (!sb) {
      localStorage.removeItem(LOCAL_KEY);
      setSession(null);
      return;
    }
    await sb.auth.signOut();
    setSession(null);
  };

  return { session, loading, local: !isSupabaseConfigured, signIn, signOut };
}
