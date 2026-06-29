import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney, sumMoney } from "./money";

describe("parseMoney", () => {
  it("parses plain dollars, k and m suffixes", () => {
    expect(parseMoney("$8,000")).toBe(8000);
    expect(parseMoney("$12k")).toBe(12_000);
    expect(parseMoney("$1.2m")).toBe(1_200_000);
    expect(parseMoney("75k")).toBe(75_000);
  });

  it("returns 0 for blank or unparseable input", () => {
    expect(parseMoney("")).toBe(0);
    expect(parseMoney("n/a")).toBe(0);
    // @ts-expect-error guarding against undefined at runtime
    expect(parseMoney(undefined)).toBe(0);
  });

  it("handles negative values", () => {
    expect(parseMoney("-$5k")).toBe(-5000);
  });
});

describe("formatMoney", () => {
  it("formats numbers into compact money strings", () => {
    expect(formatMoney(0)).toBe("$0");
    expect(formatMoney(12_000)).toBe("$12k");
    expect(formatMoney(1_200_000)).toBe("$1.2m");
    expect(formatMoney(127_000)).toBe("$127k");
  });
});

describe("sumMoney", () => {
  it("sums mixed money strings and ignores blanks", () => {
    expect(sumMoney(["$30k", "$22k", "$75k"])).toBe("$127k");
    expect(sumMoney(["$12k", "", "$8,000"])).toBe("$20k");
    expect(sumMoney([])).toBe("$0");
  });

  it("matches the Wins 'total earned' rule (project earned + win amounts)", () => {
    const projectEarned = ["$0", "$0", "$0"];
    const winAmounts = ["$30k", "$22k", "$75k"];
    expect(sumMoney([...projectEarned, ...winAmounts])).toBe("$127k");
  });
});
