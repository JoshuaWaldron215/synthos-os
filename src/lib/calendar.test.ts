import { describe, expect, it } from "vitest";
import { dayKey, groupByDay, monthMatrix, nextBooking, untilBooking } from "./calendar";
import type { Booking } from "../types";

const NOW = new Date("2026-07-15T12:00:00").getTime();

const bk = (id: string, startISO: string, status: Booking["status"] = "confirmed"): Booking => ({
  id,
  eventTypeId: "et",
  eventType: "Discovery call",
  duration: 45,
  location: "google_meet",
  hostEmail: "support@runsynthos.com",
  startAt: new Date(startISO).getTime(),
  endAt: new Date(startISO).getTime() + 45 * 60000,
  inviteeName: "Jane",
  inviteeEmail: "jane@co.com",
  answers: {},
  status,
  meetUrl: null,
  source: "website",
  createdAt: NOW,
});

describe("monthMatrix", () => {
  it("is a padded 6×7 grid starting on Sunday", () => {
    const weeks = monthMatrix(2026, 6); // July 2026
    expect(weeks).toHaveLength(6);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0].every((d) => d.getDay() === weeks[0].indexOf(d))).toBe(true); // Sun..Sat
    // July 1 2026 is a Wednesday → appears in the first week at index 3
    expect(dayKey(weeks[0][3])).toBe("2026-07-01");
  });
});

describe("groupByDay", () => {
  it("buckets by local day and sorts each day by start", () => {
    const g = groupByDay([bk("b", "2026-07-15T15:00:00"), bk("a", "2026-07-15T09:00:00"), bk("c", "2026-07-16T10:00:00")]);
    expect(g["2026-07-15"].map((x) => x.id)).toEqual(["a", "b"]);
    expect(g["2026-07-16"].map((x) => x.id)).toEqual(["c"]);
  });
});

describe("nextBooking", () => {
  it("returns the soonest upcoming non-cancelled booking", () => {
    const list = [
      bk("past", "2026-07-14T10:00:00"),
      bk("soon", "2026-07-15T15:00:00"),
      bk("later", "2026-07-20T10:00:00"),
      bk("cancelled-soonest", "2026-07-15T13:00:00", "cancelled"),
    ];
    expect(nextBooking(list, NOW)?.id).toBe("soon");
  });
  it("returns null when nothing upcoming", () => {
    expect(nextBooking([bk("past", "2026-07-14T10:00:00")], NOW)).toBeNull();
    expect(nextBooking([], NOW)).toBeNull();
  });
});

describe("untilBooking", () => {
  it("formats minutes, hours, days and empties the past", () => {
    expect(untilBooking(NOW + 30 * 60000, NOW)).toBe("in 30m");
    expect(untilBooking(NOW + 3 * 3600_000, NOW)).toBe("in 3h 0m");
    expect(untilBooking(NOW + 2 * 86400_000, NOW)).toBe("in 2 days");
    expect(untilBooking(NOW - 1000, NOW)).toBe("");
  });
});
