import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Outreach console API — the ONLY thing an outreach contractor can reach.
//
// Security model: these users never get a Supabase session, so no anon-key
// request they could make from the browser satisfies any RLS policy. This
// endpoint runs the service role and exposes exactly four actions, all scoped
// to leads. The vault, projects, chat and everything else are unreachable by
// construction — not merely hidden in the UI.
//
// POST /api/outreach  { action, ...payload }
//   login  { username, password }            -> { token, name }
//   list   { token }                         -> { leads, stats }
//   save   { token, lead }                   -> { lead }
//   check  { token, company, website, email }-> { match | null }

const SESSION_DAYS = 30;
const SOURCES = ["outbound", "inbound", "referral", "other"];
const QUALITIES = ["cold", "warm", "hot"];
const STATUSES = ["new", "contacted", "call booked", "proposal", "won", "lost"];

const str = (v, max) => String(v ?? "").trim().slice(0, max);

/** normalized key for duplicate matching — bare domain / handle / lowercased name */
function normalize(v) {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "")
    .replace(/^@/, "");
}

function db() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** resolve a session token -> the outreach user, or null */
async function userFor(sb, token) {
  if (!token || typeof token !== "string" || token.length < 20) return null;
  const { data } = await sb
    .from("outreach_sessions")
    .select("user_id, expires_at, outreach_users!inner(id, username, display_name, owner_builder_id, active)")
    .eq("token", token)
    .single();
  if (!data || new Date(data.expires_at).getTime() < Date.now()) return null;
  const u = data.outreach_users;
  return u?.active ? u : null;
}

const toLead = (r) => ({
  id: r.id,
  name: r.name,
  company: r.company ?? "",
  website: r.website ?? "",
  social: r.social ?? "",
  email: r.email ?? "",
  contact: r.contact ?? "",
  from: r.source,
  quality: r.quality,
  status: r.status,
  notes: r.notes ?? "",
  nextFollowUp: r.next_follow_up,
  createdAt: r.created_at,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  res.setHeader("Cache-Control", "no-store");

  const sb = db();
  if (!sb) return res.status(503).json({ error: "not configured" });

  const action = req.body?.action;

  // ---- login ---------------------------------------------------------------
  if (action === "login") {
    const username = str(req.body?.username, 40).toLowerCase();
    const password = String(req.body?.password ?? "");
    if (!username || !password) return res.status(400).json({ error: "username and password required" });

    // bcrypt compare happens in Postgres (pgcrypto) — the hash never leaves the DB
    const { data: ok } = await sb.rpc("outreach_check_login", { p_username: username, p_password: password });
    if (!ok) return res.status(401).json({ error: "wrong username or password" });

    const { data: user } = await sb
      .from("outreach_users")
      .select("id, display_name, active")
      .eq("username", username)
      .single();
    if (!user?.active) return res.status(401).json({ error: "wrong username or password" });

    const token = randomBytes(24).toString("hex");
    await sb.from("outreach_sessions").insert({
      token,
      user_id: user.id,
      expires_at: new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString(),
    });
    // opportunistic cleanup of this user's expired sessions
    await sb.from("outreach_sessions").delete().eq("user_id", user.id).lt("expires_at", new Date().toISOString());
    return res.json({ token, name: user.display_name || username });
  }

  // everything below needs a valid session
  const user = await userFor(sb, req.body?.token);
  if (!user) return res.status(401).json({ error: "signed out" });

  // ---- list: only the leads THIS console submitted --------------------------
  if (action === "list") {
    const { data } = await sb
      .from("leads")
      .select("*")
      .eq("via", user.username)
      .order("created_at", { ascending: false })
      .limit(500);
    const leads = (data ?? []).map(toLead);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const weekAgo = Date.now() - 7 * 86_400_000;
    return res.json({
      name: user.display_name || user.username,
      leads,
      stats: {
        total: leads.length,
        today: leads.filter((l) => l.createdAt >= startOfDay.getTime()).length,
        week: leads.filter((l) => l.createdAt >= weekAgo).length,
        replied: leads.filter((l) => ["call booked", "proposal", "won"].includes(l.status)).length,
      },
    });
  }

  // ---- check: is this business already in the pipeline? --------------------
  if (action === "check") {
    const site = normalize(req.body?.website);
    const mail = normalize(req.body?.email);
    const comp = normalize(req.body?.company);
    if (!site && !mail && !comp) return res.json({ match: null });

    // whole pipeline, not just this user's — the point is to avoid the team
    // double-touching a business someone already contacted
    const { data } = await sb.from("leads").select("name, company, website, email, status, via, who, created_at").limit(2000);
    const hit = (data ?? []).find((l) => {
      if (site && normalize(l.website) && normalize(l.website) === site) return true;
      if (mail && normalize(l.email) && normalize(l.email) === mail) return true;
      if (comp && normalize(l.company) && normalize(l.company) === comp) return true;
      if (comp && normalize(l.name) === comp) return true;
      return false;
    });
    return res.json({
      match: hit
        ? { company: hit.company || hit.name, status: hit.status, via: hit.via, createdAt: hit.created_at }
        : null,
    });
  }

  // ---- save: create or update one of THIS user's leads ---------------------
  if (action === "save") {
    const l = req.body?.lead ?? {};
    const name = str(l.company, 120) || str(l.name, 120);
    if (!name) return res.status(400).json({ error: "business name required" });

    const row = {
      name: str(l.name, 120) || name,
      company: str(l.company, 120),
      website: str(l.website, 200),
      social: str(l.social, 200),
      email: str(l.email, 160),
      contact: str(l.contact, 160),
      source: SOURCES.includes(l.from) ? l.from : "outbound",
      quality: QUALITIES.includes(l.quality) ? l.quality : "warm",
      status: STATUSES.includes(l.status) ? l.status : "new",
      notes: str(l.notes, 2000),
      next_follow_up: Number.isFinite(Number(l.nextFollowUp)) && l.nextFollowUp ? Number(l.nextFollowUp) : null,
      who: user.owner_builder_id,
      via: user.username,
    };

    if (l.id) {
      // may only touch rows this console submitted
      const { data: owned } = await sb.from("leads").select("id").eq("id", l.id).eq("via", user.username).single();
      if (!owned) return res.status(403).json({ error: "not your lead" });
      const { error } = await sb.from("leads").update(row).eq("id", l.id);
      if (error) return res.status(500).json({ error: "could not save" });
      return res.json({ lead: toLead({ ...row, id: l.id, created_at: l.createdAt ?? Date.now() }) });
    }

    const id = "ld" + Date.now() + Math.random().toString(36).slice(2, 5);
    const created_at = Date.now();
    const { error } = await sb.from("leads").insert({ ...row, id, created_at });
    if (error) return res.status(500).json({ error: "could not save" });
    return res.status(201).json({ lead: toLead({ ...row, id, created_at }) });
  }

  return res.status(400).json({ error: "unknown action" });
}
