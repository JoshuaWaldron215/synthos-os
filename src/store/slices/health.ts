import * as repo from "../../data/repo";
import {
  type HealthDay,
  STEP_GOAL,
  healthDateKey,
  workoutEmoji,
} from "../../lib/health";
import { effectiveUser } from "../../lib/profile";
import { getSupabase, isSupabaseConfigured } from "../../lib/supabase";
import type { StoreGet, StoreSet } from "../types";

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

// Playful copy for the on-screen notes (server pushes carry their own pool)
const PASSED_QUIPS = [
  "{name} just walked past you like you were standing still 💨",
  "you've been passed — {name} owns the sidewalk now 👟",
  "breaking: {name} took your spot in the step race 📉",
];
const WORKOUT_QUIPS = [
  "{name} just logged {emoji} {mins} min. peer pressure activated",
  "{name} moved their body {emoji} — your move",
  "gym report: {name} did {mins} minutes of something {emoji}",
];
const TENK_QUIPS = [
  "{name} hit 10k steps. the bar has been raised 📈",
  "10k club: {name} just checked in ✅",
];

// Apple Health team board: rows land via realtime (each phone's Shortcut
// syncs through /api/health-sync) and via hydrate. This slice keeps the
// local copy, reacts playfully to teammate updates, and handles workout hype.
export const createHealthSlice = (set: StoreSet, get: StoreGet) => ({
  health: [] as HealthDay[],
  /** this builder's Shortcut sync token (fetched on demand for the connect card) */
  healthToken: null as string | null,

  receiveHealth: (d: HealthDay) => {
    const st = get();
    const me = st.currentUserId;
    const today = healthDateKey();
    const prev = st.health.find((r) => r.who === d.who && r.day === d.day);

    set((s) => ({
      health: s.health.some((r) => r.who === d.who && r.day === d.day)
        ? s.health.map((r) => (r.who === d.who && r.day === d.day ? d : r))
        : s.health.concat(d),
    }));

    // On-screen playful notes: only for a TEAMMATE's fresh activity today.
    // (Server pushes cover closed phones; same tags collapse OS banners.)
    if (d.who === me || d.day !== today) return;
    const name = effectiveUser(d.who, st.profiles).first;

    if (d.workouts.length > (prev?.workouts.length ?? 0)) {
      const w = d.workouts[d.workouts.length - 1];
      st.notifyCategory("fitness", {
        dot: "#FF8A63",
        title: "the grind",
        body: pick(WORKOUT_QUIPS)
          .replace("{name}", name)
          .replace("{emoji}", workoutEmoji(w?.type ?? ""))
          .replace("{mins}", String(w?.min ?? 0)),
        tag: "fit-workout-" + d.who,
        url: "/fitness",
      });
    }

    if ((prev?.steps ?? 0) < STEP_GOAL && d.steps >= STEP_GOAL) {
      st.notifyCategory("fitness", {
        dot: "#2FC197",
        title: "the grind",
        body: pick(TENK_QUIPS).replace("{name}", name),
        tag: "fit-10k-" + d.who,
        url: "/fitness",
      });
    }

    const mySteps = st.health.find((r) => r.who === me && r.day === today)?.steps ?? 0;
    if (mySteps > 0 && (prev?.steps ?? 0) <= mySteps && d.steps > mySteps) {
      st.notifyCategory("fitness", {
        dot: "#33ADEE",
        title: "you got passed 👀",
        body: pick(PASSED_QUIPS).replace("{name}", name),
        tag: "fit-passed",
        url: "/fitness",
      });
    }
  },

  toggleHype: (who: number, day: string, workoutIdx: number, emoji: string) => {
    const st = get();
    const me = st.currentUserId;
    const row = st.health.find((r) => r.who === who && r.day === day);
    if (!row) return;
    const key = String(workoutIdx);
    const forWorkout = { ...(row.hype[key] ?? {}) };
    const ids = forWorkout[emoji] ?? [];
    forWorkout[emoji] = ids.includes(me) ? ids.filter((i) => i !== me) : ids.concat(me);
    if (!forWorkout[emoji].length) delete forWorkout[emoji];
    const hype = { ...row.hype, [key]: forWorkout };
    if (!Object.keys(forWorkout).length) delete hype[key];

    set((s) => ({
      health: s.health.map((r) => (r.who === who && r.day === day ? { ...r, hype } : r)),
    }));
    repo.saveHealthHype(who, day, hype).catch(get().syncCatch("hype"));
    navigator.vibrate?.(8);
  },

  fetchHealthToken: async (): Promise<void> => {
    if (!isSupabaseConfigured || get().healthToken) return;
    try {
      const sb = await getSupabase();
      const { data } = (await sb?.auth.getSession()) ?? { data: { session: null } };
      const token = data.session?.access_token;
      if (!token) return;
      const res = await fetch("/api/health-token", {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) return;
      const out = (await res.json()) as { token?: string };
      if (out.token) set({ healthToken: out.token });
    } catch {
      /* connect card just keeps showing the fetch button */
    }
  },
});
