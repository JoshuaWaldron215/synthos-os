/** Compact relative time — "just now", "4m ago", "yesterday", "2w ago". */
export function timeAgo(ms: number): string {
  const d = Math.floor((Date.now() - ms) / 1000);
  if (d < 60) return "just now";
  if (d < 3600) return Math.floor(d / 60) + "m ago";
  if (d < 86400) return Math.floor(d / 3600) + "h ago";
  const days = Math.floor(d / 86400);
  if (days === 1) return "yesterday";
  if (days < 7) return days + "d ago";
  return Math.floor(days / 7) + "w ago";
}

/**
 * Display label for records that may predate real timestamps.
 * New records carry `at` (epoch ms); older persisted ones only have the
 * legacy display string (usually the literal "now").
 */
export function whenLabel(at?: number, legacy?: string): string {
  if (at) return timeAgo(at);
  return legacy ?? "";
}
