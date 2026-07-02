import { currentPermission } from "../../lib/notifications";
import { defaultPrefs, defaultProfiles, seedNotifications } from "../../lib/profile";
import type { NotifItem, Prefs, Profile } from "../../types";
import type { StoreGet, StoreSet } from "../types";

const MAX_NOTIFS = 40;

// Per-user profiles, notification preferences and the in-app notification feed.
export const createProfilesSlice = (set: StoreSet, _get: StoreGet) => ({
  profiles: defaultProfiles(),
  prefs: defaultPrefs(),
  notifications: seedNotifications(),
  notifPermission: currentPermission(),

  updateProfile: (id: number, patch: Partial<Profile>) =>
    set((s) => ({ profiles: { ...s.profiles, [id]: { ...s.profiles[id], ...patch } } })),
  setAvatar: (id: number, url: string | null) =>
    set((s) => ({ profiles: { ...s.profiles, [id]: { ...s.profiles[id], avatarUrl: url } } })),
  updatePrefs: (id: number, patch: Partial<Prefs>) =>
    set((s) => ({ prefs: { ...s.prefs, [id]: { ...s.prefs[id], ...patch } } })),
  setNotifPermission: (p: NotificationPermission) => set({ notifPermission: p }),
  pushNotification: (n: Omit<NotifItem, "id" | "read" | "time" | "at">) =>
    set((s) => ({
      notifications: [
        { ...n, id: "n" + Date.now() + Math.random().toString(36).slice(2, 6), read: false, at: Date.now() },
        ...s.notifications,
      ].slice(0, MAX_NOTIFS),
    })),
  markAllNotifsRead: () =>
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
  clearNotifs: () => set({ notifications: [] }),
});
