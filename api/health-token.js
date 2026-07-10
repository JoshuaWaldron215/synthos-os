import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "./_lib.js";

// Return (creating on first ask) the signed-in teammate's Apple Health sync
// token — the bearer their iOS Shortcut sends to /api/health-sync. Tokens
// live in health_tokens, which has RLS with no policies: only this endpoint
// (service role) can touch it, so teammates can't read each other's tokens.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  res.setHeader("Cache-Control", "no-store");
  const ctx = await requireUser(req, res);
  if (!ctx) return;

  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(503).json({ error: "service key not configured" });

  // owner comes from the verified login, same rule as /api/subscribe
  const { data: prof } = await ctx.sb.from("profiles").select("builder_id").eq("id", ctx.user.id).single();
  if (!Number.isInteger(prof?.builder_id)) return res.status(403).json({ error: "no builder profile" });
  const who = prof.builder_id;

  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: existing } = await sb.from("health_tokens").select("token").eq("who", who).single();
  if (existing?.token) return res.json({ token: existing.token });

  const token = randomBytes(24).toString("hex");
  const { error } = await sb.from("health_tokens").insert({ who, token });
  if (error) {
    // lost a create race — read whatever won
    const { data: raced } = await sb.from("health_tokens").select("token").eq("who", who).single();
    if (raced?.token) return res.json({ token: raced.token });
    return res.status(500).json({ error: "could not create token" });
  }
  res.json({ token });
}
