import { describe, expect, it } from "vitest";
import { dayStart, expand, occurrenceAt, occursOn, repeatLabel } from "./calEvents";
import type { CalendarEvent } from "../types";

const at = (iso: string) => new Date(iso).getTime();

const base: CalendarEvent = {
  id: "e1",
  who: 0,
  title: "run",
  notes: "",
  kind: "workout",
  startAt: at("2026-09-01T18:00:00"), // a Tuesday
  durationMin: 90,
  allDay: false,
  shared: false,
  repeatDays: [],
  repeatUntil: null,
  remindMin: 60,
  createdAt: 0,
};

describe("occursOn", () => {
  it("a one-off happens only on its own day", () => {
    expect(occursOn(base, at("2026-09-01T09:00:00"))).toBe(true);
    expect(occursOn(base, at("2026-09-02T09:00:00"))).toBe(false);
    expect(occursOn(base, at("2026-08-31T23:00:00"))).toBe(false);
  });

  it("never fires before the start date, even on a matching weekday", () => {
    const e = { ...base, repeatDays: [2] }; // Tuesdays
    expect(occursOn(e, at("2026-08-25T12:00:00"))).toBe(false); // the Tuesday before
    expect(occursOn(e, at("2026-09-08T12:00:00"))).toBe(true);
  });

  it("repeats on the chosen weekdays", () => {
    const e = { ...base, repeatDays: [1, 3, 5] }; // mon/wed/fri
    expect(occursOn(e, at("2026-09-02T12:00:00"))).toBe(true); // wed
    expect(occursOn(e, at("2026-09-03T12:00:00"))).toBe(false); // thu
    expect(occursOn(e, at("2026-09-07T12:00:00"))).toBe(true); // mon
  });

  it("stops after repeatUntil, inclusive of that day", () => {
    const e = { ...base, repeatDays: [2], repeatUntil: at("2026-09-15T00:00:00") };
    expect(occursOn(e, at("2026-09-15T12:00:00"))).toBe(true);
    expect(occursOn(e, at("2026-09-22T12:00:00"))).toBe(false);
  });
});

describe("occurrenceAt", () => {
  it("keeps the original time of day on a later occurrence", () => {
    const e = { ...base, repeatDays: [2] };
    const d = new Date(occurrenceAt(e, at("2026-09-08T00:00:00")));
    expect(d.getHours()).toBe(18);
    expect(d.getDate()).toBe(8);
  });
});

describe("expand", () => {
  it("emits one entry per occurrence, in time order", () => {
    const e = { ...base, repeatDays: [1, 3] }; // mon + wed
    // window is tue 1st -> sun 13th: wed 2, mon 7, wed 9 (mon 14 is outside)
    const out = expand([e], at("2026-09-01T00:00:00"), at("2026-09-13T23:59:59"));
    expect(out.map((o) => new Date(o.at).getDate())).toEqual([2, 7, 9]);
    expect(out[0].at).toBeLessThan(out[1].at);
  });

  it("pins all-day occurrences to local midnight", () => {
    const out = expand([{ ...base, allDay: true }], at("2026-09-01T00:00:00"), at("2026-09-01T23:59:59"));
    expect(out[0].at).toBe(dayStart(at("2026-09-01T12:00:00")));
  });

  it("ignores events outside the window", () => {
    expect(expand([base], at("2026-10-01T00:00:00"), at("2026-10-31T00:00:00"))).toHaveLength(0);
  });
});

describe("repeatLabel", () => {
  it("is blank for a one-off", () => {
    expect(repeatLabel(base)).toBe("");
  });
  it("lists the weekdays", () => {
    expect(repeatLabel({ ...base, repeatDays: [1, 3, 5] })).toBe("every mo · we · fr");
  });
  it("collapses a full week", () => {
    expect(repeatLabel({ ...base, repeatDays: [0, 1, 2, 3, 4, 5, 6] })).toBe("every day");
  });
});
