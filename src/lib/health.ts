// Apple Health team board: shared model + the pure logic behind the step
// race, streaks and the trash-talk ticker. Data arrives per builder per local
// day via /api/health-sync (each phone runs an iOS Shortcut).

export interface HealthWorkout {
  /** HealthKit activity name, e.g. "Running", "Traditional Strength Training" */
  type: string;
  min: number;
  kcal: number;
  /** epoch ms of the workout start, when the Shortcut provides it */
  at?: number;
}

/** workout reactions: workoutIndex -> emoji -> builder ids who hyped it */
export type HypeMap = Record<string, Record<string, number[]>>;

export interface HealthDay {
  who: number;
  day: string; // YYYY-MM-DD in the builder's local time
  steps: number;
  sleepMin: number;
  moveKcal: number;
  exerciseMin: number;
  standHours: number;
  workouts: HealthWorkout[];
  hype: HypeMap;
  syncedAt: number;
}

export const STEP_GOAL = 10_000;
export const STREAK_FLOOR = 8_000; // a day "counts" for the 🔥 streak
export const TEAM_WEEKLY_GOAL = 150_000; // combined squad steps per week

// House ring goals (Apple's move goal is personal, so we standardize)
export const RING_GOALS = { move: 500, exercise: 30, stand: 12 };

export const HYPE_EMOJI = ["💪", "🔥", "👏"];

/** Local calendar key — same convention as the prayers page. */
export function healthDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dayFor(rows: HealthDay[], who: number, day: string): HealthDay | undefined {
  return rows.find((r) => r.who === who && r.day === day);
}

export function fmtSleep(min: number): string {
  if (!min) return "—";
  return Math.floor(min / 60) + "h " + String(min % 60).padStart(2, "0") + "m";
}

export function fmtSteps(n: number): string {
  return n.toLocaleString();
}

const WORKOUT_EMOJI: [RegExp, string][] = [
  [/run/i, "🏃"],
  [/walk|hik/i, "🚶"],
  [/strength|weight|functional/i, "🏋️"],
  [/cycl|bike/i, "🚴"],
  [/swim/i, "🏊"],
  [/basketball/i, "🏀"],
  [/soccer|football/i, "⚽"],
  [/hiit|interval/i, "🔥"],
  [/yoga|stretch|flexib/i, "🧘"],
  [/box|martial|kick/i, "🥊"],
  [/row/i, "🚣"],
  [/ellipt|stair|cardio/i, "❤️‍🔥"],
];

export function workoutEmoji(type: string): string {
  for (const [re, e] of WORKOUT_EMOJI) if (re.test(type)) return e;
  return "🏃";
}

/** consecutive days (ending today, or yesterday if today hasn't hit it yet) at STREAK_FLOOR+ steps */
export function stepStreak(rows: HealthDay[], who: number, now = new Date()): number {
  let n = 0;
  for (let d = 0; d < 400; d++) {
    const key = healthDateKey(new Date(now.getTime() - d * 86_400_000));
    const row = dayFor(rows, who, key);
    const hit = (row?.steps ?? 0) >= STREAK_FLOOR;
    if (hit) n++;
    else if (d === 0) continue; // today in progress doesn't break the streak
    else break;
  }
  return n;
}

/** sum of the squad's steps for the last 7 days (incl. today) */
export function teamWeekSteps(rows: HealthDay[], now = new Date()): number {
  const keys = new Set(
    Array.from({ length: 7 }, (_, d) => healthDateKey(new Date(now.getTime() - d * 86_400_000))),
  );
  return rows.filter((r) => keys.has(r.day)).reduce((sum, r) => sum + r.steps, 0);
}

// ---------------------------------------------------------------------------
// the trash-talk ticker: playful one-liners generated from today's live data.
// Pure + deterministic given (rows, names, hour) so it's testable; the page
// rotates through whatever this returns.
// ---------------------------------------------------------------------------
export function tickerLines(
  todays: { who: number; name: string; row?: HealthDay }[],
  hour: number,
): string[] {
  const lines: string[] = [];
  const synced = todays.filter((t) => t.row);
  if (synced.length === 0) {
    return ["nobody's synced yet — the race hasn't started 🦗"];
  }

  const byStep = [...synced].sort((a, b) => (b.row!.steps ?? 0) - (a.row!.steps ?? 0));
  const lead = byStep[0];
  const chaser = byStep[1];

  if (chaser && lead.row!.steps > 0) {
    const gap = lead.row!.steps - chaser.row!.steps;
    if (gap === 0) {
      lines.push(`${lead.name} and ${chaser.name} are tied. photo finish loading 📸`);
    } else if (gap <= 1500) {
      lines.push(`${chaser.name} is ${fmtSteps(gap)} steps from taking the lead 👀`);
    } else {
      lines.push(`${lead.name} leads by ${fmtSteps(gap)} — comfortable. too comfortable 🛋️`);
    }
  }

  for (const t of synced) {
    const r = t.row!;
    if (r.steps >= STEP_GOAL) lines.push(`${t.name} hit ${fmtSteps(STEP_GOAL)} — certified walker ✅`);
    if (r.sleepMin > 0 && r.sleepMin < 5 * 60) lines.push(`${t.name} slept ${fmtSleep(r.sleepMin)}… bro 😵`);
    if (r.sleepMin >= 9 * 60) lines.push(`${t.name} slept ${fmtSleep(r.sleepMin)} — retirement behavior 😴`);
    if (r.workouts.length >= 2) lines.push(`${t.name} logged ${r.workouts.length} workouts today. show-off 🏆`);
  }

  const anyWorkout = synced.some((t) => t.row!.workouts.length > 0);
  if (!anyWorkout && hour >= 15) lines.push("zero workouts logged today. the grind is grinding to a halt 🦥");

  const allLow = synced.every((t) => (t.row!.steps ?? 0) < 3000);
  if (allLow && hour >= 14) lines.push("everybody under 3k steps. shipping code doesn't count as cardio 🧑‍💻");

  const unsynced = todays.filter((t) => !t.row);
  for (const t of unsynced) lines.push(`${t.name} hasn't synced today — hiding the numbers? 🫣`);

  // never empty — the ticker always has something to say
  if (!lines.length) lines.push("quiet out here… somebody go get some steps 👟");
  return lines;
}
