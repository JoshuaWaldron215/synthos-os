import { describe, expect, it } from "vitest";
import {
  type HealthDay,
  fmtSleep,
  healthDateKey,
  stepStreak,
  teamWeekSteps,
  tickerLines,
  workoutEmoji,
} from "./health";

const day = (who: number, daysAgo: number, steps: number, extra: Partial<HealthDay> = {}): HealthDay => ({
  who,
  day: healthDateKey(new Date(NOW.getTime() - daysAgo * 86_400_000)),
  steps,
  sleepMin: 0,
  moveKcal: 0,
  exerciseMin: 0,
  standHours: 0,
  workouts: [],
  hype: {},
  syncedAt: 0,
  ...extra,
});

const NOW = new Date("2026-07-08T18:00:00");

describe("stepStreak", () => {
  it("counts consecutive 8k+ days ending today", () => {
    const rows = [day(0, 0, 9000), day(0, 1, 8500), day(0, 2, 12000), day(0, 3, 2000)];
    expect(stepStreak(rows, 0, NOW)).toBe(3);
  });

  it("an in-progress today below the floor doesn't break yesterday's streak", () => {
    const rows = [day(0, 0, 1200), day(0, 1, 9000), day(0, 2, 8100)];
    expect(stepStreak(rows, 0, NOW)).toBe(2);
  });

  it("zero when nothing qualifies", () => {
    expect(stepStreak([day(0, 0, 100)], 0, NOW)).toBe(0);
    expect(stepStreak([], 0, NOW)).toBe(0);
  });
});

describe("teamWeekSteps", () => {
  it("sums everyone's steps across the last 7 days only", () => {
    const rows = [day(0, 0, 5000), day(1, 3, 7000), day(2, 6, 1000), day(0, 8, 99_999)];
    expect(teamWeekSteps(rows, NOW)).toBe(13_000);
  });
});

describe("fmtSleep", () => {
  it("formats minutes as Xh YYm", () => {
    expect(fmtSleep(412)).toBe("6h 52m");
    expect(fmtSleep(480)).toBe("8h 00m");
    expect(fmtSleep(0)).toBe("—");
  });
});

describe("workoutEmoji", () => {
  it("maps common HealthKit names and falls back to a runner", () => {
    expect(workoutEmoji("Traditional Strength Training")).toBe("🏋️");
    expect(workoutEmoji("Outdoor Run")).toBe("🏃");
    expect(workoutEmoji("Cycling")).toBe("🚴");
    expect(workoutEmoji("Underwater Basket Weaving")).toBe("🏃");
  });
});

describe("tickerLines", () => {
  const named = (row?: HealthDay, name = "josh", who = 0) => ({ who, name, row });

  it("handles nobody synced", () => {
    const lines = tickerLines([named(undefined), named(undefined, "sadeq", 1)], 12);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("nobody's synced");
  });

  it("calls a close race and roasts the unsynced", () => {
    const lines = tickerLines(
      [named(day(0, 0, 6000)), named(day(1, 0, 5200), "sadeq", 1), named(undefined, "aqeel", 2)],
      12,
    );
    expect(lines.some((l) => l.includes("sadeq") && l.includes("800"))).toBe(true);
    expect(lines.some((l) => l.includes("aqeel") && l.includes("synced"))).toBe(true);
  });

  it("celebrates 10k and roasts short sleep", () => {
    const lines = tickerLines(
      [named(day(0, 0, 11_000, { sleepMin: 250 }))],
      12,
    );
    expect(lines.some((l) => l.includes("certified walker"))).toBe(true);
    expect(lines.some((l) => l.includes("bro"))).toBe(true);
  });

  it("ties are a photo finish", () => {
    const lines = tickerLines([named(day(0, 0, 4000)), named(day(1, 0, 4000), "sadeq", 1)], 12);
    expect(lines.some((l) => l.includes("photo finish"))).toBe(true);
  });

  it("no-workout roast only appears in the afternoon", () => {
    const squad = [named(day(0, 0, 4000)), named(day(1, 0, 5000), "sadeq", 1)];
    expect(tickerLines(squad, 10).some((l) => l.includes("grinding to a halt"))).toBe(false);
    expect(tickerLines(squad, 16).some((l) => l.includes("grinding to a halt"))).toBe(true);
  });

  it("never returns an empty list (all-zero morning has a fallback line)", () => {
    const lines = tickerLines(
      [named(day(0, 0, 0)), named(day(1, 0, 0), "sadeq", 1), named(day(2, 0, 0), "aqeel", 2)],
      9,
    );
    expect(lines.length).toBeGreaterThan(0);
  });
});
