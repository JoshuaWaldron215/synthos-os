import { describe, expect, it } from "vitest";
import { DEFAULT_DASHBOARD, fullLayout, type DashboardItem } from "./dashboard";

describe("fullLayout", () => {
  it("returns the SAME array reference when nothing is missing", () => {
    // Home selects this straight out of a zustand selector — handing back a
    // fresh array on every snapshot re-renders forever (it did, once).
    const saved: DashboardItem[] = DEFAULT_DASHBOARD.map((w) => ({ ...w }));
    expect(fullLayout(saved)).toBe(saved);
  });

  it("inserts a new widget at its default position, not the end", () => {
    // a layout saved before "training" shipped
    const saved: DashboardItem[] = DEFAULT_DASHBOARD.filter((w) => w.key !== "training").map((w) => ({ ...w }));
    const out = fullLayout(saved);
    expect(out.map((w) => w.key)).toEqual(DEFAULT_DASHBOARD.map((w) => w.key));
    expect(out.indexOf(out.find((w) => w.key === "training")!)).toBe(
      DEFAULT_DASHBOARD.findIndex((w) => w.key === "training"),
    );
  });

  it("keeps the user's own ordering for widgets they already had", () => {
    const saved: DashboardItem[] = [
      { key: "wins", on: true },
      { key: "today", on: false },
      { key: "ask", on: true },
    ];
    const out = fullLayout(saved);
    const kept = out.filter((w) => ["wins", "today", "ask"].includes(w.key)).map((w) => w.key);
    expect(kept).toEqual(["wins", "today", "ask"]);
    expect(out.find((w) => w.key === "today")!.on).toBe(false);
  });

  it("adds every missing widget exactly once", () => {
    const out = fullLayout([{ key: "wins", on: true }]);
    const keys = out.map((w) => w.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const d of DEFAULT_DASHBOARD) expect(keys).toContain(d.key);
  });

  it("falls back to the default layout when nothing is saved", () => {
    expect(fullLayout(undefined)).toBe(DEFAULT_DASHBOARD);
  });
});
