import type { CalendarEvent } from "../types";

// Personal calendar events. A repeating event is stored as ONE row — the
// start_at fixes the time of day, repeat_days picks the weekdays, and the
// occurrences are expanded on read. Editing the row edits the whole series,
// which is what a training block wants.

export const EVENT_KINDS = ["personal", "workout", "work"] as const;

export const EVENT_TINT: Record<string, { dot: string; tint: string }> = {
  workout: { dot: "#2FC197", tint: "var(--mint-tint)" },
  work: { dot: "#8A84F0", tint: "var(--lav-tint)" },
  personal: { dot: "#F5A524", tint: "rgba(245,165,36,.15)" },
};

/** local midnight for a timestamp */
export const dayStart = (ms: number): number => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** does this event happen on the given day? (day = any ms within it) */
export function occursOn(e: CalendarEvent, day: number): boolean {
  const d0 = dayStart(day);
  const first = dayStart(e.startAt);
  if (d0 < first) return false;
  if (!e.repeatDays.length) return d0 === first;
  if (e.repeatUntil !== null && d0 > dayStart(e.repeatUntil)) return false;
  return e.repeatDays.includes(new Date(d0).getDay());
}

/** the event's start time on a day it occurs, keeping its time of day */
export function occurrenceAt(e: CalendarEvent, day: number): number {
  const src = new Date(e.startAt);
  const d = new Date(dayStart(day));
  d.setHours(src.getHours(), src.getMinutes(), 0, 0);
  return d.getTime();
}

/** every occurrence of every event inside [from, to], flattened and sorted */
export function expand(
  events: CalendarEvent[],
  from: number,
  to: number,
): Array<{ event: CalendarEvent; at: number }> {
  const out: Array<{ event: CalendarEvent; at: number }> = [];
  for (let d = dayStart(from); d <= to; d += 86_400_000) {
    // DST-safe: re-derive midnight rather than trusting the 24h step
    const day = dayStart(d);
    for (const e of events) {
      if (occursOn(e, day)) out.push({ event: e, at: e.allDay ? day : occurrenceAt(e, day) });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

const DAY_LABELS = ["su", "mo", "tu", "we", "th", "fr", "sa"];

/** "every mo · we · fr" / "one-off" — for the event card */
export function repeatLabel(e: CalendarEvent): string {
  if (!e.repeatDays.length) return "";
  const days = [...e.repeatDays].sort().map((d) => DAY_LABELS[d]).join(" · ");
  return e.repeatDays.length === 7 ? "every day" : "every " + days;
}

export const DAY_NAMES = DAY_LABELS;
