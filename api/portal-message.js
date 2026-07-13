import { createClient } from "@supabase/supabase-js";

// A portal visitor writes into the project's client thread. The message is a
// normal `messages` row (who -1, guest = the visitor's name), so it lands in
// the team's chat via realtime and the existing message-insert webhook pushes
// it to everyone's phones ("💬 Stephen (client)").
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  res.setHeader("Cache-Control", "no-store");

  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(503).json({ error: "not configured" });

  const token = typeof req.body?.token === "string" ? req.body.token : "";
  const name = String(req.body?.name ?? "").trim().slice(0, 40);
  const text = String(req.body?.text ?? "").trim().slice(0, 2000);
  if (!token || token.length < 20) return res.status(404).json({ error: "not found" });
  if (!name || !text) return res.status(400).json({ error: "name and message required" });

  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: link } = await sb.from("portal_links").select("proj").eq("token", token).single();
  if (!link) return res.status(404).json({ error: "not found" });

  const convoId = "portal-" + link.proj;

  // simple flood guard: one guest message per portal per 3 seconds
  const { data: last } = await sb
    .from("messages")
    .select("at")
    .eq("convo", convoId)
    .not("guest", "is", null)
    .order("at", { ascending: false })
    .limit(1);
  if (last?.[0]?.at && Date.now() - last[0].at < 3000) {
    return res.status(429).json({ error: "slow down a little" });
  }

  // the thread conversation should exist (created with the link) — but heal
  // if it doesn't, so a client message is never dropped
  const { data: convo } = await sb.from("conversations").select("id").eq("id", convoId).maybeSingle();
  if (!convo) {
    const { data: project } = await sb.from("projects").select("client").eq("id", link.proj).single();
    await sb.from("conversations").insert({
      id: convoId,
      type: "client",
      name: (project?.client ?? link.proj) + " · portal",
      proj: link.proj,
      members: [0, 1, 2],
      guests: [],
      system: false,
    });
  }

  const { error } = await sb.from("messages").insert({
    id: "m" + Date.now() + Math.random().toString(36).slice(2, 7),
    convo: convoId,
    who: -1,
    text,
    at: Date.now(),
    guest: name,
  });
  if (error) return res.status(500).json({ error: "could not send" });

  res.status(201).json({ ok: true });
}
