import type { Booking, BookingStatus } from "../types";

// Pure calendar helpers for the bookings page — month grid, day grouping,
// status colour, and time formatting. Kept side-effect-free and tested.

export const BOOKING_COLORS: Record<BookingStatus, string> = {
  confirmed: "#2FC197",
  pending: "#F0A94B",
  rescheduled: "#33ADEE",
  cancelled: "#C6663F",
};

export const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** local YYYY-MM-DD key for grouping bookings by calendar day */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** the 6×7 grid of days covering the month `month` (0-indexed) of `year`,
 *  padded with the trailing/leading days so every week is full */
export function monthMatrix(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay()); // back up to the Sunday on/before the 1st
  const weeks: Date[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/** bookings grouped by local day key, each day sorted by start time */
export function groupByDay(bookings: Booking[]): Record<string, Booking[]> {
  const out: Record<string, Booking[]> = {};
  for (const b of bookings) {
    const k = dayKey(new Date(b.startAt));
    (out[k] ??= []).push(b);
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => a.startAt - b.startAt);
  return out;
}

/** the next upcoming booking that isn't cancelled, or null */
export function nextBooking(bookings: Booking[], now = Date.now()): Booking | null {
  return (
    bookings
      .filter((b) => b.status !== "cancelled" && b.startAt >= now)
      .sort((a, b) => a.startAt - b.startAt)[0] ?? null
  );
}

export function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function fmtRange(startMs: number, endMs: number): string {
  return fmtTime(startMs) + " – " + fmtTime(endMs);
}

export function fmtDayLabel(ms: number): string {
  return new Date(ms).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

/** "in 2h 14m" / "in 3 days" / "now" / "" once past */
export function untilBooking(startMs: number, now = Date.now()): string {
  const ms = startMs - now;
  if (ms <= 0) return "";
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `in ${hrs}h ${mins % 60}m`;
  const days = Math.round(hrs / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}
