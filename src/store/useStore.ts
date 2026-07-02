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
      partialize: (s) => ({
        currentUserId: s.currentUserId,
        showRevenue: s.showRevenue,
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
      }),
    }
  )
);
