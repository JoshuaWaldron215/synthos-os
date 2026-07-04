import { describe, expect, it } from "vitest";
import { computeInitials, defaultPrefs, defaultProfiles, effectiveUser, isKnownTeammate } from "./profile";

describe("computeInitials", () => {
  it("uses first + last initial for multi-word names", () => {
    expect(computeInitials("alex carter")).toBe("AC");
    expect(computeInitials("maya reyes")).toBe("MR");
  });

  it("uses first two letters for single names and handles blanks", () => {
    expect(computeInitials("dev")).toBe("DE");
    expect(computeInitials("")).toBe("?");
    expect(computeInitials("   ")).toBe("?");
  });
});

describe("effectiveUser", () => {
  it("falls back to seed data when no profile override exists", () => {
    const u = effectiveUser(0, {});
    expect(u.id).toBe(0);
    expect(u.name.length).toBeGreaterThan(0);
    expect(u.initials).toBe(computeInitials(u.name));
  });

  it("applies profile overrides (name drives initials + first name)", () => {
    const profiles = defaultProfiles();
    profiles[0] = { ...profiles[0], name: "jordan blake" };
    const u = effectiveUser(0, profiles);
    expect(u.name).toBe("jordan blake");
    expect(u.first).toBe("jordan");
    expect(u.initials).toBe("JB");
  });
});

describe("isKnownTeammate", () => {
  it("accepts default team emails (case/space-insensitive)", () => {
    expect(isKnownTeammate("josh@runsynthos.com")).toBe(true);
    expect(isKnownTeammate("  SADEQ@runsynthos.com ")).toBe(true);
    expect(isKnownTeammate("Josh@runsynthos.com")).toBe(true);
    expect(isKnownTeammate("aqeel@runsynthos.com")).toBe(true);
  });

  it("accepts any domain when the local-part matches a teammate username", () => {
    expect(isKnownTeammate("josh@gmail.com")).toBe(true);
    expect(isKnownTeammate("josh@synthos.dev")).toBe(true); // legacy domain
  });

  it("rejects unknown emails and blanks", () => {
    expect(isKnownTeammate("stranger@runsynthos.com")).toBe(false);
    expect(isKnownTeammate("")).toBe(false);
    expect(isKnownTeammate(undefined)).toBe(false);
    expect(isKnownTeammate(null)).toBe(false);
  });
});

describe("defaults", () => {
  it("seeds a profile and prefs for every user", () => {
    const profiles = defaultProfiles();
    const prefs = defaultPrefs();
    expect(Object.keys(profiles).length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(prefs).length).toBeGreaterThanOrEqual(3);
    expect(prefs[0].pushEnabled).toBe(true);
  });
});
