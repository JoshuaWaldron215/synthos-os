import type { IconName } from "./Icon";

export interface NavDef {
  key: string;
  label: string;
  path: string;
  icon: IconName;
}

export const NAV_ITEMS: NavDef[] = [
  { key: "projects", label: "projects", path: "/projects", icon: "projects" },
  { key: "tasks", label: "tasks", path: "/tasks", icon: "tasks" },
  { key: "vault", label: "vault", path: "/vault", icon: "vault" },
  { key: "intake", label: "intake", path: "/intake", icon: "intake" },
  { key: "wins", label: "wins", path: "/wins", icon: "wins" },
  { key: "team", label: "team", path: "/team", icon: "team" },
  { key: "content", label: "content", path: "/content", icon: "content" },
  { key: "ask", label: "ask ai", path: "/ask", icon: "ask" },
];

// bottom tab bar exposes 6 of the 8 routes
export const BOTTOM_TABS: NavDef[] = [
  { key: "projects", label: "projects", path: "/projects", icon: "projects" },
  { key: "tasks", label: "tasks", path: "/tasks", icon: "tasks" },
  { key: "intake", label: "intake", path: "/intake", icon: "intake" },
  { key: "vault", label: "vault", path: "/vault", icon: "vault" },
  { key: "team", label: "team", path: "/team", icon: "team" },
  { key: "ask", label: "ask", path: "/ask", icon: "ask" },
];

// the active nav key for a given pathname (project detail maps to "projects")
export function activeKeyFor(pathname: string): string {
  if (pathname.startsWith("/project/")) return "projects";
  const seg = pathname.split("/")[1] || "projects";
  return seg;
}
