import { requireUser, setupWebPush, vapidConfigured } from "./_lib.js";

// Send a push to the whole team or to specific builder ids (userIds).
// Dead endpoints (404/410 from the push service) are pruned as we go.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!vapidConfigured()) return res.status(503).json({ error: "push not configured" });
  const ctx = await requireUser(req, res);
  if (!ctx) return;

  const { title = "Synthos OS", body = "", tag, url, userIds } = req.body || {};
  let q = ctx.sb.from("push_subscriptions").select("endpoint, sub");
  if (Array.isArray(userIds) && userIds.length) q = q.in("who", userIds);
  const { data: rows, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  const webpush = setupWebPush();
  const payload = JSON.stringify({ title, body, tag, url });
  let sent = 0;
  const dead = [];

  await Promise.all(
    (rows ?? []).map(async (r) => {
      try {
        await webpush.sendNotification(r.sub, payload);
        sent++;
      } catch (err) {
        if (err && (err.statusCode === 404 || err.statusCode === 410)) dead.push(r.endpoint);
      }
    }),
  );

  if (dead.length) await ctx.sb.from("push_subscriptions").delete().in("endpoint", dead);
  res.json({ ok: true, sent, total: rows?.length ?? 0, pruned: dead.length });
}
