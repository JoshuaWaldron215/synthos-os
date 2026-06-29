import { describe, expect, it } from "vitest";
import { computeInitials, defaultPrefs, defaultProfiles, effectiveUser } from "./profile";

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

describe("defaults", () => {
  it("seeds a profile and prefs for every user", () => {
    const profiles = defaultProfiles();
    const prefs = defaultPrefs();
    expect(Object.keys(profiles).length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(prefs).length).toBeGreaterThanOrEqual(3);
    expect(prefs[0].pushEnabled).toBe(true);
  });
});
