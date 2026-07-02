import type { SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// When credentials are absent we run in "local mode": the app stays fully
// usable against localStorage + IndexedDB, and flips to the shared Supabase
// backend the moment these env vars are provided.
export const isSupabaseConfigured = Boolean(url && anon);

export const FILES_BUCKET = "project-files";

// The client library (~30 kB gz) is loaded on demand, so local-mode users
// never download it. The promise is memoized — one client per session.
let clientPromise: Promise<SupabaseClient | null> | null = null;

export function getSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(url as string, anon as string, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    );
  }
  return clientPromise;
}
