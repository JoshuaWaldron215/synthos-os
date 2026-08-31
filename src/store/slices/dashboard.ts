import type { StoreGet, StoreSet } from "../types";

// Per-user home dashboard layout: which widgets show and in what order.
// Stored per builder id so a shared device keeps everyone's arrangement.
export type WidgetKey = "ask" | "today" | "training" | "tasks" | "pipeline" | "projects" | "team" | "wins";

export interface DashboardItem {
  key: WidgetKey;
  on: boolean;
}

export const DEFAULT_DASHBOARD: DashboardItem[] = [
  { key: "today", on: true },
  { key: "training", on: true },
  { key: "ask", on: true },
  { key: "tasks", on: true },
  { key: "pipeline", on: true },
  { key: "projects", on: true },
  { key: "team", on: true },
  { key: "wins", on: true },
];

// Saved layouts predate newly-shipped widgets — union them in (appended,
// visible) instead of silently hiding them from existing users.
export const fullLayout = (saved?: DashboardItem[]): DashboardItem[] => {
  if (!saved) return DEFAULT_DASHBOARD;
  const have = new Set(saved.map((w) => w.key));
  const missing = DEFAULT_DASHBOARD.filter((w) => !have.has(w.key));
  if (!missing.length) return saved;
  // Drop each new widget where it was designed to sit rather than at the very
  // bottom: find the last saved widget that precedes it in the default order.
  const out = [...saved];
  for (const w of missing) {
    const before = new Set(
      DEFAULT_DASHBOARD.slice(0, DEFAULT_DASHBOARD.findIndex((d) => d.key === w.key)).map((d) => d.key),
    );
    let at = out.length;
    for (let i = out.length - 1; i >= 0; i--) {
      if (before.has(out[i].key)) {
        at = i + 1;
        break;
      }
    }
    out.splice(at, 0, w);
  }
  return out;
};

export const createDashboardSlice = (set: StoreSet, get: StoreGet) => ({
  dashboards: {} as Record<number, DashboardItem[]>,
  dashEditing: false,

  setDashEditing: (v: boolean) => set({ dashEditing: v }),

  moveWidget: (key: WidgetKey, dir: -1 | 1) => {
    const uid = get().currentUserId;
    const layout = [...fullLayout(get().dashboards[uid])];
    const i = layout.findIndex((w) => w.key === key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= layout.length) return;
    [layout[i], layout[j]] = [layout[j], layout[i]];
    set((s) => ({ dashboards: { ...s.dashboards, [uid]: layout } }));
  },

  toggleWidget: (key: WidgetKey) => {
    const uid = get().currentUserId;
    const layout = fullLayout(get().dashboards[uid]).map((w) =>
      w.key === key ? { ...w, on: !w.on } : w,
    );
    set((s) => ({ dashboards: { ...s.dashboards, [uid]: layout } }));
  },
});
