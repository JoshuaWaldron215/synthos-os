import { createClient } from "@supabase/supabase-js";
import { setupWebPush, vapidConfigured } from "./_lib.js";

// Database-triggered chat push: Postgres fires a webhook on every message
// insert (see supabase/schema.sql), so notifications no longer depend on the
// SENDER's device running current code — any synced message notifies the
// other conversation members. The client-side send in teamSend stays as a
// fallback; both share the same notification tag, so devices collapse the
// pair into one banner.
//
// Auth: the webhook carries a shared secret (PUSH_WEBHOOK_SECRET). DB reads
// use the service role key — this endpoint is never called by browsers.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!vapidConfigured()) return res.status(503).json({ error: "push not configured" });

  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret || req.headers["x-webhook-secret"] !== secret) {
    return res.status(401).json({ error: "bad secret" });
  }
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(503).json({ error: "service key not configured" });

  const record = req.body?.record;
  if (!record?.convo) return res.status(400).json({ error: "no message record" });

  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: convo } = await sb.from("conversations").select("name, type, members").eq("id", record.convo).single();
  const members = (convo?.members ?? [0, 1, 2]).filter((m) => m !== record.who);
  if (!members.length) return res.json({ ok: true, sent: 0, total: 0 });

  const { data: profile } = await sb.from("profiles").select("name").eq("builder_id", record.who).single();
  const sender = profile?.name || "teammate";
  const label = !convo ? "team chat" : convo.type === "dm" ? "dm" : "#" + convo.name;

  const { data: subs } = await sb.from("push_subscriptions").select("endpoint, sub").in("who", members);
  const webpush = setupWebPush();
  const payload = JSON.stringify({
    title: sender,
    body: label + ": " + (record.text || "sent an attachment"),
    tag: "msg-" + record.convo,
    url: "/team?c=" + record.convo,
  });

  let sent = 0;
  const dead = [];
  await Promise.all(
    (subs ?? []).map(async (r) => {
      try {
        await webpush.sendNotification(r.sub, payload);
        sent++;
      } catch (err) {
        if (err && (err.statusCode === 404 || err.statusCode === 410)) dead.push(r.endpoint);
      }
    }),
  );
  if (dead.length) await sb.from("push_subscriptions").delete().in("endpoint", dead);
  res.json({ ok: true, sent, total: subs?.length ?? 0, pruned: dead.length });
}
