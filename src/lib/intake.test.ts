import { describe, expect, it } from "vitest";
import { generateTasks, respond } from "./intake";
import type { Task } from "../types";

const SCOPE =
  "Client call — Northwind: We need a customer portal where users can log in, view their past orders, and download invoices as PDFs. We want Stripe billing with subscriptions, plus an admin dashboard. Set up row-level security so clients only see their own data. Launch target is the end of the month, so the checkout flow is the top priority.";

describe("generateTasks", () => {
  it("drafts a bounded list of tasks from a scope", () => {
    const drafts = generateTasks(SCOPE, []);
    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts.length).toBeLessThanOrEqual(8);
    drafts.forEach((d) => {
      expect(d.title.length).toBeGreaterThan(0);
      expect([0, 1, 2]).toContain(d.who);
      expect(["low", "med", "high"]).toContain(d.pri);
    });
  });

  it("falls back to a default plan when no scope is provided", () => {
    const drafts = generateTasks("", []);
    expect(drafts.length).toBe(5);
    expect(drafts[0].title).toBe("scope the project");
  });

  it("flags checkout/launch work as high priority", () => {
    const drafts = generateTasks(SCOPE, []);
    const checkout = drafts.find((d) => /checkout/i.test(d.title));
    expect(checkout?.pri).toBe("high");
  });

  it("balances assignments by existing open load", () => {
    // Pile all open work on user 0; new tasks should avoid them.
    const tasks: Task[] = Array.from({ length: 6 }, (_, i) => ({
      id: "t" + i,
      title: "existing",
      col: "build",
      who: 0,
      pri: "med",
      blocked: false,
      proj: "northwind",
      notes: "",
    }));
    const drafts = generateTasks(SCOPE, tasks);
    const toUser0 = drafts.filter((d) => d.who === 0).length;
    expect(toUser0).toBeLessThan(drafts.length);
  });
});

describe("respond (local Ask AI)", () => {
  it("answers blocker, standup, revenue and fallback prompts", () => {
    expect(respond("summarize what's blocked").toLowerCase()).toContain("block");
    expect(respond("draft today's standup").toLowerCase()).toContain("standup");
    expect(respond("estimate revenue this month").toLowerCase()).toContain("mrr");
    expect(respond("hello there").length).toBeGreaterThan(0);
  });
});
