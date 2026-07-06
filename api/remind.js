import { createClient } from "@supabase/supabase-js";
import { setupWebPush, vapidConfigured } from "./_lib.js";

// Morning reminder digest (Vercel cron, see vercel.json): each builder with
// overdue / due-today tasks or lead follow-ups gets one push. Runs server-side
// so it reaches closed phones.
//
// Auth: Vercel cron sends `Authorization: Bearer ${CRON_SECRET}` when that env
// var is set. The webhook secret is also accepted so the team can trigger a
// digest manually (e.g. while testing).
export default async function handler(req, res) {
  if (!vapidConfigured()) return res.status(503).json({ error: "push not configured" });

  const cronSecret = process.env.CRON_SECRET;
  const hookSecret = process.env.PUSH_WEBHOOK_SECRET;
  const authed =
    (cronSecret && req.headers.authorization === `Bearer ${cronSecret}`) ||
    (hookSecret && req.headers["x-webhook-secret"] === hookSecret);
  if (!authed) return res.status(401).json({ error: "unauthorized" });

  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(503).json({ error: "service key not configured" });
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const cutoff = endOfToday.getTime();

  const [{ data: tasks }, { data: leads }, { data: subs }] = await Promise.all([
    sb.from("tasks").select("who, title, due").not("due", "is", null).lte("due", cutoff).neq("col", "done"),
    sb
      .from("leads")
      .select("who, name, next_follow_up, status")
      .not("next_follow_up", "is", null)
      .lte("next_follow_up", cutoff)
      .not("status", "in", '("won","lost")'),
    sb.from("push_subscriptions").select("who, endpoint, sub"),
  ]);

  // bucket the workload per builder
  const load = new Map();
  for (const t of tasks ?? []) {
    const b = load.get(t.who) ?? { tasks: 0, leads: 0 };
    b.tasks++;
    load.set(t.who, b);
  }
  for (const l of leads ?? []) {
    const b = load.get(l.who) ?? { tasks: 0, leads: 0 };
    b.leads++;
    load.set(l.who, b);
  }

  const webpush = setupWebPush();
  let sent = 0;
  const dead = [];

  await Promise.all(
    (subs ?? []).map(async (r) => {
      const b = load.get(r.who);
      if (!b) return; // nothing due for this builder — no push
      const parts = [];
      if (b.tasks) parts.push(b.tasks + " task" + (b.tasks === 1 ? "" : "s") + " due");
      if (b.leads) parts.push(b.leads + " lead follow-up" + (b.leads === 1 ? "" : "s"));
      const payload = JSON.stringify({
        title: "today at synthos ✦",
        body: parts.join(" · "),
        tag: "daily-digest",
        url: b.tasks ? "/tasks" : "/leads",
      });
      try {
        await webpush.sendNotification(r.sub, payload);
        sent++;
      } catch (err) {
        if (err && (err.statusCode === 404 || err.statusCode === 410)) dead.push(r.endpoint);
      }
    }),
  );

  if (dead.length) await sb.from("push_subscriptions").delete().in("endpoint", dead);
  res.json({ ok: true, sent, buildersWithWork: load.size, pruned: dead.length });
}
