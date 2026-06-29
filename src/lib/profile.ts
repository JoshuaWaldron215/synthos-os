import { USERS } from "../data/seed";
import type { NotifItem, Prefs, Profile } from "../types";

export function computeInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function defaultUsername(u: { first: string }): string {
  return (u.first || "user").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function defaultProfiles(): Record<number, Profile> {
  const out: Record<number, Profile> = {};
  USERS.forEach((u) => {
    out[u.id] = {
      name: u.name,
      username: defaultUsername(u),
      role: u.role,
      email: defaultUsername(u) + "@synthos.dev",
      github: "",
      bio: "",
      avatarUrl: null,
      status: "online",
    };
  });
  return out;
}

export const STATUS_OPTIONS = ["online", "focusing", "away"] as const;

export function statusMeta(status: string): { color: string; label: string } {
  if (status === "focusing") return { color: "#F5A524", label: "focusing" };
  if (status === "away") return { color: "#98A0B0", label: "away" };
  return { color: "#2FC197", label: "online" };
}

export function defaultPrefs(): Record<number, Prefs> {
  const out: Record<number, Prefs> = {};
  USERS.forEach((u) => {
    out[u.id] = {
      pushEnabled: true,
      mentions: true,
      taskAssigned: true,
      shipped: true,
      content: false,
      sound: false,
    };
  });
  return out;
}

export interface EffectiveUser {
  id: number;
  name: string;
  first: string;
  username: string;
  initials: string;
  role: string;
  email: string;
  github: string;
  bio: string;
  tone: string;
  avatarUrl: string | null;
  status: string;
}

export function effectiveUser(id: number, profiles: Record<number, Profile>): EffectiveUser {
  const base = USERS[id];
  const p = profiles[id];
  const name = p?.name ?? base.name;
  return {
    id,
    name,
    first: name.split(/\s+/)[0] || base.first,
    username: p?.username ?? defaultUsername(base),
    initials: computeInitials(name),
    role: p?.role ?? base.role,
    email: p?.email ?? defaultUsername(base) + "@synthos.dev",
    github: p?.github ?? "",
    bio: p?.bio ?? "",
    tone: base.tone,
    avatarUrl: p?.avatarUrl ?? null,
    status: p?.status ?? "online",
  };
}

/** Normalize a stored github value (handle or url) into a full profile url. */
export function githubUrl(value: string): string {
  const v = value.trim().replace(/^@/, "");
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith("github.com/")) return "https://" + v;
  return "https://github.com/" + v;
}

/** Display form of a github value (just the handle). */
export function githubHandle(value: string): string {
  const v = value.trim().replace(/^@/, "");
  return v.replace(/^https?:\/\//i, "").replace(/^github\.com\//i, "").replace(/\/+$/, "");
}

// A real workspace starts with an empty notification feed — entries arrive
// from live activity (mentions, assignments, ships, content).
export function seedNotifications(): NotifItem[] {
  return [];
}
