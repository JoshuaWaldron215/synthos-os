import { createClient } from "@supabase/supabase-js";
import { setupWebPush, vapidConfigured } from "./_lib.js";

// Apple Health ingest: each teammate's iPhone runs an iOS Shortcut that POSTs
// the last few days of Health data here, authed by their personal token from
// /api/health-token (the phone has no Supabase session). Rows upsert into
// health_days; notable *transitions* on today's row fire playful pushes at
// the rest of the squad. Data saves even when push isn't configured.
//
// Push abuse guard: each transition is recorded in the row's `pushed` jsonb
// (10k once per day, workouts by high-water count, overtakes once per victim
// per day, plus a short global cooldown) so replayed or oscillating payloads
// can't re-fire notifications.
//
// Body: { days: [{ day:"YYYY-MM-DD", steps, sleepMin, moveKcal, exerciseMin,
//                   standHours, workouts:[{type,min,kcal,at?}] }] }

const STEP_GOAL = 10000;
const PUSH_COOLDOWN_MS = 45_000;
const DAY_WINDOW_PAST = 14; // accept days within [today-14, today+1]

const PASSED_QUIPS = [
  "{name} just walked past you like you were standing still 💨",
  "you've been passed. {name} owns the sidewalk now 👟",
  "breaking: {name} took the step lead. devastating scenes 📉",
  "{name} said 'on your left' 🚶💨",
];
const WORKOUT_QUIPS = [
  "{name} just logged a workout 🏋️ peer pressure is now active",
  "{name} moved their body for {mins} minutes. your move 👀",
  "gym update: {name} did something. allegedly {mins} minutes 💪",
  "{name} is sweating. the leaderboard is shifting 🏆",
];
const TENK_QUIPS = [
  "{name} hit 10k steps. the bar has been raised 📈",
  "10k club: {name} just checked in ✅",
  "{name} walked 10,000 steps and will absolutely mention it 🗣️",
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clampInt = (v, max) => Math.min(max, Math.max(0, Math.floor(Number(v) || 0)));

function easternDayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // en-CA formats as YYYY-MM-DD
}

function sanitizeDay(raw, today) {
  if (!raw || typeof raw.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw.day)) return null;
  // must be a real calendar date inside the recent window — text PK rows for
  // "0000-99-99" style garbage would otherwise accumulate invisibly forever
  const parsed = new Date(raw.day + "T12:00:00Z");
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw.day) return null;
  const todayMs = new Date(today + "T12:00:00Z").getTime();
  const diffDays = (todayMs - parsed.getTime()) / 86_400_000;
  if (diffDays > DAY_WINDOW_PAST || diffDays < -1) return null;

  const workouts = (Array.isArray(raw.workouts) ? raw.workouts : [])
    .slice(0, 20)
    .map((w) => ({
      type: String(w?.type ?? "Workout").slice(0, 60),
      min: clampInt(w?.min, 1440),
      kcal: clampInt(w?.kcal, 20000),
      ...(Number.isFinite(Number(w?.at)) ? { at: Number(w.at) } : {}),
    }));
  return {
    day: raw.day,
    steps: clampInt(raw.steps, 200000),
    sleep_min: clampInt(raw.sleepMin, 1440),
    move_kcal: clampInt(raw.moveKcal, 20000),
    exercise_min: clampInt(raw.exerciseMin, 1440),
    stand_hours: clampInt(raw.standHours, 24),
    workouts,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(503).json({ error: "service key not configured" });

  const token = req.headers["x-health-token"];
  if (!token || typeof token !== "string") return res.status(401).json({ error: "missing token" });

  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: owner } = await sb.from("health_tokens").select("who").eq("token", token).single();
  if (!Number.isInteger(owner?.who)) return res.status(401).json({ error: "bad token" });
  const who = owner.who;

  const today = easternDayKey();
  const days = (Array.isArray(req.body?.days) ? req.body.days : [])
    .slice(0, 10) // bound work before any per-item processing
    .map((d) => sanitizeDay(d, today))
    .filter(Boolean)
    .slice(0, 7);
  if (!days.length) return res.status(400).json({ error: "no valid days" });

  const todayPayload = days.find((d) => d.day === today);

  // snapshot today BEFORE writing so we can detect transitions
  let prevMine = null;
  let othersToday = [];
  if (todayPayload) {
    const { data: rows } = await sb.from("health_days").select("who, steps, workouts, pushed").eq("day", today);
    prevMine = (rows ?? []).find((r) => r.who === who) ?? null;
    othersToday = (rows ?? []).filter((r) => r.who !== who);
  }

  // upsert data columns only — hype (reactions) and pushed stay server-owned
  let saved = 0;
  for (const d of days) {
    const { error } = await sb
      .from("health_days")
      .upsert({ who, ...d, synced_at: new Date().toISOString() }, { onConflict: "who,day" });
    if (!error) saved++;
  }

  // ---- playful pushes, deduped per day via the row's `pushed` markers ------
  if (todayPayload && vapidConfigured()) {
    const pushed = prevMine?.pushed && typeof prevMine.pushed === "object" ? { ...prevMine.pushed } : {};
    const cooledDown = !pushed.lastAt || Date.now() - pushed.lastAt > PUSH_COOLDOWN_MS;

    const { data: prof } = await sb.from("profiles").select("name").eq("builder_id", who).single();
    const name = (prof?.name || "teammate").split(" ")[0].toLowerCase();

    const notes = []; // {targets: number[]|null (null = all others), title, body, tag}

    // workouts: fire only when the count exceeds the day's high-water mark
    const workoutHighWater = clampInt(pushed.workouts, 20);
    if (todayPayload.workouts.length > workoutHighWater) {
      const w = todayPayload.workouts[todayPayload.workouts.length - 1];
      notes.push({
        targets: null,
        title: "the grind 🏋️",
        body: pick(WORKOUT_QUIPS).replace("{name}", name).replace("{mins}", String(w?.min ?? 0)),
        tag: "fit-workout-" + who,
      });
      pushed.workouts = todayPayload.workouts.length;
    }

    // 10k: once per day, ever
    if (!pushed.tenk && todayPayload.steps >= STEP_GOAL) {
      notes.push({
        targets: null,
        title: "10k club ✦",
        body: pick(TENK_QUIPS).replace("{name}", name),
        tag: "fit-10k-" + who,
      });
      pushed.tenk = true;
    }

    // overtakes: once per victim per day
    const prevSteps = prevMine?.steps ?? 0;
    const passedBefore = Array.isArray(pushed.passed) ? pushed.passed : [];
    const passed = othersToday
      .filter((o) => o.steps >= prevSteps && o.steps < todayPayload.steps && o.steps > 0)
      .map((o) => o.who)
      .filter((w) => !passedBefore.includes(w));
    if (passed.length) {
      notes.push({
        targets: passed,
        title: "you got passed 👀",
        body: pick(PASSED_QUIPS).replace("{name}", name),
        tag: "fit-passed",
      });
      pushed.passed = passedBefore.concat(passed);
    }

    if (notes.length && cooledDown) {
      pushed.lastAt = Date.now();
      await sb.from("health_days").update({ pushed }).eq("who", who).eq("day", today);

      const { data: subs } = await sb.from("push_subscriptions").select("endpoint, who, sub").neq("who", who);
      const webpush = setupWebPush();
      const dead = [];
      await Promise.all(
        (subs ?? []).flatMap((r) =>
          notes
            .filter((n) => n.targets === null || n.targets.includes(r.who))
            .map(async (n) => {
              try {
                await webpush.sendNotification(
                  r.sub,
                  JSON.stringify({ title: n.title, body: n.body, tag: n.tag, url: "/fitness" }),
                );
              } catch (err) {
                if (err && (err.statusCode === 404 || err.statusCode === 410)) dead.push(r.endpoint);
              }
            }),
        ),
      );
      if (dead.length) await sb.from("push_subscriptions").delete().in("endpoint", dead);
    }
  }

  res.json({ ok: true, saved });
}
