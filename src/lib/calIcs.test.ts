import { describe, expect, it } from "vitest";
import { buildIcs } from "./calIcs";
import type { CalendarEvent } from "../types";

const base: CalendarEvent = {
  id: "e1", who: 0, title: "Drago", notes: "", kind: "workout",
  startAt: new Date("2026-09-09T11:00:00").getTime(),
  durationMin: 60, allDay: false, shared: false,
  repeatDays: [], repeatUntil: null, remindMin: 90, createdAt: 0,
};

describe("buildIcs", () => {
  it("wraps events in a valid VCALENDAR", () => {
    const ics = buildIcs([base]);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Drago");
    expect(ics.split("BEGIN:VEVENT").length - 1).toBe(1);
  });

  it("uses CRLF line endings, as the spec requires", () => {
    expect(buildIcs([base]).split("\n").every((l) => l === "" || l.endsWith("\r"))).toBe(true);
  });

  it("emits an alarm at the event's own reminder offset", () => {
    expect(buildIcs([base])).toContain("TRIGGER:-PT90M");
    expect(buildIcs([{ ...base, remindMin: null }])).not.toContain("BEGIN:VALARM");
  });

  it("escapes the characters ICS treats as syntax", () => {
    const ics = buildIcs([{ ...base, title: "Squat; RDL, calves", notes: "line one\nline two" }]);
    expect(ics).toContain("SUMMARY:Squat\\; RDL\\, calves");
    expect(ics).toContain("line one\\nline two");
  });

  it("writes all-day events as DATE values spanning one day", () => {
    const ics = buildIcs([{ ...base, allDay: true, title: "Rest" }]);
    expect(ics).toMatch(/DTSTART;VALUE=DATE:20260909/);
    expect(ics).toMatch(/DTEND;VALUE=DATE:20260910/);
  });

  it("flattens a repeating series into one VEVENT per occurrence", () => {
    const ics = buildIcs([{ ...base, repeatDays: [3], repeatUntil: new Date("2026-09-30T00:00:00").getTime() }]);
    // wednesdays from Sep 9 through Sep 30 inclusive
    expect(ics.split("BEGIN:VEVENT").length - 1).toBe(4);
  });

  it("gives every occurrence a distinct UID", () => {
    const ics = buildIcs([{ ...base, repeatDays: [3], repeatUntil: new Date("2026-09-30T00:00:00").getTime() }]);
    const uids = [...ics.matchAll(/^UID:(.+)$/gm)].map((m) => m[1]);
    expect(new Set(uids).size).toBe(uids.length);
  });

  it("folds long lines to stay under the octet limit", () => {
    const ics = buildIcs([{ ...base, title: "x".repeat(300) }]);
    const longest = Math.max(...ics.split("\r\n").map((l) => new TextEncoder().encode(l).length));
    expect(longest).toBeLessThanOrEqual(75);
  });
});
