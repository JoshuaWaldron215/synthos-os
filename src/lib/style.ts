import type { CSSProperties } from "react";
import type { Priority, ProjectStatus, StatusKey } from "../types";
import { USERS } from "../data/seed";

export const SM: Record<StatusKey, { dot: string; bg: string }> = {
  sky: { dot: "#33ADEE", bg: "rgba(96,200,255,.16)" },
  mint: { dot: "#2FC197", bg: "rgba(126,230,193,.20)" },
  blush: { dot: "#FF8A63", bg: "rgba(255,150,120,.16)" },
  lav: { dot: "#8A84F0", bg: "rgba(200,198,255,.28)" },
};

export function statusKey(s: ProjectStatus): StatusKey {
  if (s === "in progress") return "sky";
  if (s === "in qa") return "lav";
  if (s === "blocked") return "blush";
  return "mint";
}

export function priColor(pri: Priority): string {
  return pri === "high" ? "#E5484D" : pri === "med" ? "#F5A524" : "#98A0B0";
}

export function priTint(pri: Priority): { bg: string; fg: string } {
  if (pri === "high") return { bg: "rgba(229,72,77,.12)", fg: "#C5343A" };
  if (pri === "med") return { bg: "rgba(245,165,36,.16)", fg: "#9A6712" };
  return { bg: "rgba(152,160,176,.18)", fg: "#5C6575" };
}

export function priDot(pri: Priority): CSSProperties {
  const c = priColor(pri);
  const ring =
    pri === "high"
      ? "0 0 0 3px rgba(229,72,77,.16)"
      : pri === "med"
      ? "0 0 0 3px rgba(245,165,36,.16)"
      : "none";
  return {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: c,
    flex: "0 0 auto",
    boxShadow: ring,
  };
}

export function avatarStyle(id: number, i = 0, size = 26): CSSProperties {
  const u = USERS[id];
  return {
    width: size,
    height: size,
    borderRadius: "50%",
    background: u.tone,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: Math.round(size * 0.4),
    fontWeight: 600,
    letterSpacing: ".02em",
    flex: "0 0 auto",
    boxShadow: "0 0 0 2px #fff",
    marginLeft: i ? -(Math.round(size * 0.34)) : 0,
  };
}
