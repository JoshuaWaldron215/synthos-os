import { createClient } from "@supabase/supabase-js";
import { setupWebPush, vapidConfigured } from "./_lib.js";
import { HYPE_MORNING, HYPE_NUDGE, hypeFor } from "./_hype.js";

// 8am morning briefing (pg_cron, see supabase/schema.sql): each builder with
// overdue / due-today tasks or something on their calendar gets one personal
// push listing what's on their plate. Runs server-side so it reaches closed
// phones. Lead follow-ups are deliberately NOT in here — at a few hundred
// leads the digest was almost entirely "+52 more"; they still show on /leads
// and in the today widget.
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

  const url0 = process.env.VITE_SUPABASE_URL;
  const serviceKey0 = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // mode=events runs every few minutes and fires the per-event nudge; it has
  // its own cadence, so it must not hit the 8am guard below.
  const mode = req.query?.mode || (/[?&]mode=events/.test(req.url || "") ? "events" : "");
  if (mode === "events") {
    if (!url0 || !serviceKey0) return res.status(503).json({ error: "service key not configured" });
    return await sendEventNudges(createClient(url0, serviceKey0, { auth: { persistSession: false } }), res);
  }

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

  const [{ data: tasks }, { data: subs }, { data: events }] = await Promise.all([
    sb.from("tasks").select("who, title, due").not("due", "is", null).lte("due", cutoff).neq("col", "done").order("due", { ascending: true }),
    sb.from("push_subscriptions").select("who, endpoint, sub"),
    sb.from("calendar_events").select("*"),
  ]);

  // bucket the actual work items per builder so the push can name them
  const load = new Map();
  const bucket = (who) => {
    const b = load.get(who) ?? { tasks: [], events: [] };
    load.set(who, b);
    return b;
  };
  for (const t of tasks ?? []) bucket(t.who).tasks.push(t.title);
  for (const e of events ?? []) {
    if (occursOn(e, new Date())) bucket(e.who).events.push(e.title);
  }

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
      if (!b || (!b.tasks.length && !b.events.length)) return; // nothing due — no push
      const lines = [];
      if (b.tasks.length) {
        lines.push(b.tasks.length + " task" + (b.tasks.length === 1 ? "" : "s") + ": " + nameList(b.tasks, 3));
      }
      if (b.events.length) {
        lines.push("📅 " + nameList(b.events, 3));
        lines.push(hypeFor(HYPE_MORNING, todayKey()));
      }
      const payload = JSON.stringify({
        title: "your morning ✦",
        body: lines.join("\n"),
        tag: "daily-digest",
        url: b.tasks.length ? "/tasks" : "/calendar",
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

// ---- calendar event nudges --------------------------------------------------

const TZ = "America/New_York";

/** YYYY-MM-DD for a date in the team's timezone */
function todayKey(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** local wall-clock parts of a timestamp, in the team's timezone */
function parts(d) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, weekday: "short", hour: "numeric", minute: "numeric", hour12: false,
  }).formatToParts(d);
  const get = (t) => f.find((p) => p.type === t)?.value;
  const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { weekday: WD[get("weekday")], hour: Number(get("hour")) % 24, minute: Number(get("minute")) };
}

/** does a stored event occur on the given date? (mirrors src/lib/calEvents.ts) */
function occursOn(row, date) {
  const key = todayKey(date);
  const startKey = todayKey(new Date(row.start_at));
  if (key < startKey) return false;
  const days = row.repeat_days;
  if (!days || !days.length) return key === startKey;
  if (row.repeat_until && key > row.repeat_until) return false;
  return days.includes(parts(date).weekday);
}

/** Fires once per event per day, `remind_min` before it starts. Runs every 5
 *  minutes from pg_cron; last_reminded_on is the dedupe so a nudge can't repeat. */
async function sendEventNudges(sb, res) {
  if (!vapidConfigured()) return res.status(503).json({ error: "push not configured" });
  const now = new Date();
  const key = todayKey(now);
  const nowP = parts(now);
  const nowMin = nowP.hour * 60 + nowP.minute;

  const [{ data: events }, { data: subs }] = await Promise.all([
    sb.from("calendar_events").select("*").not("remind_min", "is", null),
    sb.from("push_subscriptions").select("who, endpoint, sub"),
  ]);

  const due = (events ?? []).filter((e) => {
    if (e.last_reminded_on === key) return false;      // already nudged today
    if (!occursOn(e, now)) return false;
    const st = parts(new Date(e.start_at));
    const startMin = e.all_day ? 8 * 60 : st.hour * 60 + st.minute;
    const fireAt = startMin - (e.remind_min ?? 0);
    // the window is the cron interval; a missed tick shouldn't fire an hour late
    return nowMin >= fireAt && nowMin < fireAt + 6;
  });
  if (!due.length) return res.json({ ok: true, sent: 0, due: 0 });

  const byWho = new Map();
  for (const e of due) byWho.set(e.who, (byWho.get(e.who) ?? []).concat(e));

  const webpush = setupWebPush();
  let sent = 0;
  const dead = [];
  await Promise.all(
    (subs ?? []).map(async (r) => {
      const mine = byWho.get(r.who);
      if (!mine) return;
      const e = mine[0];
      const when = e.remind_min === 0 ? "now" : "in " + (e.remind_min >= 60 ? e.remind_min / 60 + "h" : e.remind_min + "m");
      const payload = JSON.stringify({
        title: (e.kind === "workout" ? "🏃 " : "📅 ") + e.title + " · " + when,
        body: (e.notes ? e.notes + "\n" : "") + hypeFor(HYPE_NUDGE, key, mine.length),
        tag: "cal-" + e.id,
        url: "/calendar",
      });
      try {
        await webpush.sendNotification(r.sub, payload);
        sent++;
      } catch (err) {
        if (err && (err.statusCode === 404 || err.statusCode === 410)) dead.push(r.endpoint);
      }
    }),
  );

  // stamp regardless of push success, so a dead subscription can't cause a loop
  await sb.from("calendar_events").update({ last_reminded_on: key }).in("id", due.map((e) => e.id));
  if (dead.length) await sb.from("push_subscriptions").delete().in("endpoint", dead);
  res.json({ ok: true, sent, due: due.length });
}
