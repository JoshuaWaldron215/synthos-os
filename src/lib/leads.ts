import type { LeadQuality, LeadSource, LeadStatus } from "../types";

// Shared vocabulary + pill styling for the outbound CRM. Colors are brand
// tokens/tints so pills read correctly in both light and dark themes.

export const LEAD_SOURCES = ["outbound", "inbound", "referral", "other"] as const satisfies readonly LeadSource[];
export const LEAD_QUALITIES = ["cold", "warm", "hot"] as const satisfies readonly LeadQuality[];
export const LEAD_STATUSES = ["new", "contacted", "call booked", "proposal", "won", "lost"] as const satisfies readonly LeadStatus[];

interface PillMeta {
  color: string;
  bg: string;
}

const PILLS: Record<string, PillMeta> = {
  // sources
  outbound: { color: "#8A84F0", bg: "var(--lav-tint)" },
  inbound: { color: "#33ADEE", bg: "var(--sky-tint)" },
  referral: { color: "#2FC197", bg: "var(--mint-tint)" },
  other: { color: "rgba(var(--ink-rgb),.55)", bg: "rgba(var(--ink-rgb),.06)" },
  // quality (matches the sheet: warm = amber, hot = red)
  cold: { color: "#33ADEE", bg: "var(--sky-tint)" },
  warm: { color: "#F5A524", bg: "rgba(245,165,36,.15)" },
  hot: { color: "#E5484D", bg: "rgba(229,72,77,.14)" },
  // status pipeline
  new: { color: "rgba(var(--ink-rgb),.55)", bg: "rgba(var(--ink-rgb),.06)" },
  contacted: { color: "#33ADEE", bg: "var(--sky-tint)" },
  "call booked": { color: "#8A84F0", bg: "var(--lav-tint)" },
  proposal: { color: "#F5A524", bg: "rgba(245,165,36,.15)" },
  won: { color: "#2FC197", bg: "var(--mint-tint)" },
  lost: { color: "rgba(var(--ink-rgb),.45)", bg: "rgba(var(--ink-rgb),.05)" },
};

export function leadPill(key: string): PillMeta {
  return PILLS[key] ?? PILLS.other;
}

/** cycle helper: next value in a list (for tap-to-advance pills) */
export function nextOf<T>(list: readonly T[], current: T): T {
  return list[(list.indexOf(current) + 1) % list.length];
}

export const startOfToday = (): number => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

export const fmtDay = (ms: number): string =>
  new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** leads are typed by hand, so a website may arrive bare ("acme.com") */
export const webHref = (raw: string): string => (/^https?:\/\//i.test(raw) ? raw : "https://" + raw);

/** what to show for a website — no protocol, no www., no trailing slash */
export const webLabel = (raw: string): string =>
  raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "");
