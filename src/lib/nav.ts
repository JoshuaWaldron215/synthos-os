import type { IconName } from "./Icon";

export interface NavDef {
  key: string;
  label: string;
  path: string;
  icon: IconName;
  /** sidebar/drawer section — items render grouped in this order */
  group: "sell" | "build" | "grow" | "ops";
}

// Ordered by how the agency actually works: find clients → scope → build →
// ship → tell the world. Eyebrow numbers on each surface follow this order.
export const NAV_ITEMS: NavDef[] = [
  { key: "leads", label: "leads", path: "/leads", icon: "bolt", group: "sell" },
  { key: "intake", label: "intake", path: "/intake", icon: "intake", group: "sell" },
  { key: "projects", label: "projects", path: "/projects", icon: "projects", group: "build" },
  { key: "tasks", label: "tasks", path: "/tasks", icon: "tasks", group: "build" },
  { key: "team", label: "team", path: "/team", icon: "team", group: "build" },
  { key: "content", label: "content", path: "/content", icon: "content", group: "grow" },
  { key: "wins", label: "wins", path: "/wins", icon: "wins", group: "grow" },
  { key: "vault", label: "vault", path: "/vault", icon: "vault", group: "ops" },
  { key: "ask", label: "ask ai", path: "/ask", icon: "ask", group: "ops" },
];

export const NAV_GROUPS: Array<NavDef["group"]> = ["sell", "build", "grow", "ops"];

// bottom tab bar: the five daily drivers, roomier touch targets
export const BOTTOM_TABS: NavDef[] = [
  { key: "projects", label: "projects", path: "/projects", icon: "projects", group: "build" },
  { key: "tasks", label: "tasks", path: "/tasks", icon: "tasks", group: "build" },
  { key: "leads", label: "leads", path: "/leads", icon: "bolt", group: "sell" },
  { key: "team", label: "team", path: "/team", icon: "team", group: "build" },
  { key: "ask", label: "ask", path: "/ask", icon: "ask", group: "ops" },
];

// the active nav key for a given pathname (project detail maps to "projects")
export function activeKeyFor(pathname: string): string {
  if (pathname.startsWith("/project/")) return "projects";
  const seg = pathname.split("/")[1] || "projects";
  return seg;
}
