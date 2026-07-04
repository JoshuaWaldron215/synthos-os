// Shared helpers for the Vercel serverless push API.
// Auth model: callers forward their Supabase JWT; we build a client bound to
// that token so every DB call runs under the team RLS policies — no service
// role key needed anywhere.

import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export function vapidConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function setupWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_CONTACT || "mailto:team@runsynthos.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  return webpush;
}

/**
 * Verify the caller's Supabase session and return a client acting as them.
 * Returns { sb, user } or writes a 401/500 to `res` and returns null.
 */
export async function requireUser(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const anon = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    res.status(500).json({ error: "backend not configured" });
    return null;
  }
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "sign in required" });
    return null;
  }
  const sb = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getUser(auth.slice(7));
  if (error || !data?.user) {
    res.status(401).json({ error: "invalid session" });
    return null;
  }
  return { sb, user: data.user };
}
