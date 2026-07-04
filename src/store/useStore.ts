import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { StoreState } from "./types";
import { createChatSlice } from "./slices/chat";
import { createContentSlice } from "./slices/content";
import { createDataSlice } from "./slices/data";
import { createIntakeSlice } from "./slices/intake";
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
  content: s.content,
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
    }),
    {
      name: "synthos-os-v2",
      // Bump `version` whenever the persisted shape changes and translate old
      // data in `migrate` — without this, zustand drops mismatched state and
      // the user's local workspace is wiped. Version history:
      //   1: baseline (Phase C) — same shape as the unversioned v0 store
      version: 1,
      migrate: (persisted, _version) => {
        // v0 → v1: no shape change; earlier unversioned data passes through
        return persisted;
      },
      partialize: persistSnapshot,
    }
  )
);
