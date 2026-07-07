import { createClient } from "@supabase/supabase-js";
import { setupWebPush, vapidConfigured } from "./_lib.js";

// 8am morning briefing (Vercel cron, see vercel.json): each builder with
// overdue / due-today tasks or lead follow-ups gets one personal push listing
// what's on their plate. Runs server-side so it reaches closed phones.
//
// Cron runs at 12:00 and 13:00 UTC; the guard below keeps whichever hits
// 8am America/New_York, so the briefing survives daylight-saving flips.
//
// Auth: Vercel cron sends `Authorization: Bearer ${CRON_SECRET}` when that env
// var is set. The webhook secret is also accepted so the team can trigger a
// digest manually (e.g. while testing — add ?force=1 to skip the 8am guard).
export default async function handler(req, res) {
  if (!vapidConfigured()) return res.status(503).json({ error: "push not configured" });

  const cronSecret = process.env.CRON_SECRET;
  const hookSecret = process.env.PUSH_WEBHOOK_SECRET;
  const authed =
    (cronSecret && req.headers.authorization === `Bearer ${cronSecret}`) ||
    (hookSecret && req.headers["x-webhook-secret"] === hookSecret);
  if (!authed) return res.status(401).json({ error: "unauthorized" });

  // only the invocation that lands on 8am Eastern actually sends
  const easternHour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/New_York" }).format(new Date()),
  );
  const force = req.query?.force === "1" || (req.url || "").includes("force=1");
  if (!force && easternHour !== 8) {
    return res.status(200).json({ ok: true, skipped: true, easternHour });
  }

  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(503).json({ error: "service key not configured" });
  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const cutoff = endOfToday.getTime();

  const [{ data: tasks }, { data: leads }, { data: subs }] = await Promise.all([
    sb.from("tasks").select("who, title, due").not("due", "is", null).lte("due", cutoff).neq("col", "done").order("due", { ascending: true }),
    sb
      .from("leads")
      .select("who, name, next_follow_up, status")
      .not("next_follow_up", "is", null)
      .lte("next_follow_up", cutoff)
      .not("status", "in", '("won","lost")')
      .order("next_follow_up", { ascending: true }),
    sb.from("push_subscriptions").select("who, endpoint, sub"),
  ]);

  // bucket the actual work items per builder so the push can name them
  const load = new Map();
  const bucket = (who) => {
    const b = load.get(who) ?? { tasks: [], leads: [] };
    load.set(who, b);
    return b;
  };
  for (const t of tasks ?? []) bucket(t.who).tasks.push(t.title);
  for (const l of leads ?? []) bucket(l.who).leads.push(l.name);

  // "wire stripe webhook · fix login bug · +2 more"
  const nameList = (items, max) => {
    const shown = items.slice(0, max).join(" · ");
    const extra = items.length - max;
    return extra > 0 ? shown + " · +" + extra + " more" : shown;
  };

  const webpush = setupWebPush();
  let sent = 0;
  const dead = [];

  await Promise.all(
    (subs ?? []).map(async (r) => {
      const b = load.get(r.who);
      if (!b) return; // nothing due for this builder — no push
      const lines = [];
      if (b.tasks.length) {
        lines.push(b.tasks.length + " task" + (b.tasks.length === 1 ? "" : "s") + ": " + nameList(b.tasks, 3));
      }
      if (b.leads.length) {
        lines.push("follow up: " + nameList(b.leads, 3));
      }
      const payload = JSON.stringify({
        title: "your morning ✦",
        body: lines.join("\n"),
        tag: "daily-digest",
        url: b.tasks.length ? "/tasks" : "/leads",
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
