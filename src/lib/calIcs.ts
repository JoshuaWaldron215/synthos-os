import { expand } from "./calEvents";
import type { CalendarEvent } from "../types";

// Export the user's own events as an .ics. iOS has no way to show a PWA on the
// lock screen, but Apple Calendar can — importing this puts the block behind
// the native Calendar widget, with an alarm per session.

const esc = (t: string) =>
  t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** ICS lines are limited to 75 octets; continuations start with a space */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 73) return line;
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (enc.encode(cur + ch).length > 73) {
      out.push(cur);
      cur = " ";
    }
    cur += ch;
  }
  out.push(cur);
  return out.join("\r\n");
}

const stampUTC = (ms: number) =>
  new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** YYYYMMDD in local time — for all-day events, which carry no timezone */
const dateOnly = (ms: number) => {
  const d = new Date(ms);
  return (
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0")
  );
};

/**
 * Build a VCALENDAR covering a year of occurrences. Repeating events are
 * flattened rather than emitted as RRULEs — the series are short and this
 * keeps every occurrence's real local time correct across the DST change.
 */
export function buildIcs(events: CalendarEvent[], calName = "Synthos — my calendar"): string {
  const from = Date.now() - 30 * 86_400_000;
  const to = Date.now() + 365 * 86_400_000;
  const now = stampUTC(Date.now());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Synthos OS//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold("X-WR-CALNAME:" + esc(calName)),
    "X-APPLE-CALENDAR-COLOR:#2FC197",
  ];

  for (const { event, at } of expand(events, from, to)) {
    const uid = event.id + "-" + dateOnly(at) + "@synthos";
    lines.push("BEGIN:VEVENT", "UID:" + uid, "DTSTAMP:" + now);
    if (event.allDay) {
      const next = new Date(at);
      next.setDate(next.getDate() + 1);
      lines.push("DTSTART;VALUE=DATE:" + dateOnly(at), "DTEND;VALUE=DATE:" + dateOnly(next.getTime()));
    } else {
      lines.push(
        "DTSTART:" + stampUTC(at),
        "DTEND:" + stampUTC(at + (event.durationMin ?? 60) * 60_000),
      );
    }
    lines.push(fold("SUMMARY:" + esc(event.title)));
    if (event.notes) lines.push(fold("DESCRIPTION:" + esc(event.notes)));
    lines.push("CATEGORIES:" + esc(event.kind));
    if (event.remindMin !== null && !event.allDay) {
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "TRIGGER:-PT" + event.remindMin + "M",
        fold("DESCRIPTION:" + esc(event.title)),
        "END:VALARM",
      );
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/** hand the file to the browser — on iOS this opens straight into Calendar */
export function downloadIcs(events: CalendarEvent[], filename = "synthos-calendar.ics"): void {
  const blob = new Blob([buildIcs(events)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
