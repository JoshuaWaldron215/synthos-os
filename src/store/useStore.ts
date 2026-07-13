import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultPrefs } from "../lib/profile";
import type { StoreState } from "./types";
import { createChatSlice } from "./slices/chat";
import { createDashboardSlice } from "./slices/dashboard";
import { createContentSlice } from "./slices/content";
import { createDataSlice } from "./slices/data";
import { createHealthSlice } from "./slices/health";
import { createIntakeSlice } from "./slices/intake";
import { createLeadsSlice } from "./slices/leads";
import { createPortalSlice } from "./slices/portal";
import { createPrayersSlice } from "./slices/prayers";
import { createProfilesSlice } from "./slices/profiles";
import { createTasksSlice } from "./slices/tasks";
import { createTeamSlice } from "./slices/team";
import { createUiSlice } from "./slices/ui";
import { createVaultSlice } from "./slices/vault";

export type { StoreState } from "./types";

// The persisted slice of the store — also the exact shape of JSON backups
// (src/lib/backup.ts), so export/import and persistence never drift apart.
export const persistSnapshot = (s: StoreState) => ({
  currentUserId: s.currentUserId,
  showRevenue: s.showRevenue,
  theme: s.theme,
  profiles: s.profiles,
  prefs: s.prefs,
  notifications: s.notifications,
  projects: s.projects,
  keys: s.keys,
  activity: s.activity,
  files: s.files,
  wins: s.wins,
  tasks: s.tasks,
  colLabels: s.colLabels,
  conversations: s.conversations,
  teamMsgs: s.teamMsgs,
  convoReads: s.convoReads,
  content: s.content,
  leads: s.leads,
  dashboards: s.dashboards,
  prayerLog: s.prayerLog,
  prayerPlace: s.prayerPlace,
  prayerNotified: s.prayerNotified,
  health: s.health,
  lastHydrateAt: s.lastHydrateAt,
});

export type PersistedState = ReturnType<typeof persistSnapshot>;

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...createUiSlice(set, get),
      ...createProfilesSlice(set, get),
      ...createDataSlice(set, get),
      ...createTasksSlice(set, get),
      ...createVaultSlice(set, get),
      ...createChatSlice(set, get),
      ...createTeamSlice(set, get),
      ...createContentSlice(set, get),
      ...createIntakeSlice(set, get),
      ...createLeadsSlice(set, get),
      ...createDashboardSlice(set, get),
      ...createPrayersSlice(set, get),
      ...createHealthSlice(set, get),
      ...createPortalSlice(set, get),
    }),
    {
      name: "synthos-os-v2",
      // Bump `version` whenever the persisted shape changes and translate old
      // data in `migrate` — without this, zustand drops mismatched state and
      // the user's local workspace is wiped. Version history:
      //   1: baseline (Phase C) — same shape as the unversioned v0 store
      //   2: convoReads added — existing chats start as read (no badge storm)
      //   3: prefs gained prayers/fitness — backfill from defaults, else the
      //      persisted prefs (restored wholesale) leave new toggles undefined
      //      and those notification categories silently never fire
      version: 3,
      migrate: (persisted, version) => {
        const p = persisted as Partial<StoreState>;
        if (version < 2 && p.teamMsgs && !p.convoReads) {
          const now = Date.now();
          p.convoReads = Object.fromEntries(Object.keys(p.teamMsgs).map((id) => [id, now]));
        }
        if (version < 3 && p.prefs) {
          const defaults = defaultPrefs();
          for (const id of Object.keys(p.prefs).map(Number)) {
            p.prefs[id] = { ...(defaults[id] ?? defaults[0]), ...p.prefs[id] };
          }
        }
        return p as PersistedState;
      },
      partialize: persistSnapshot,
    }
  )
);
