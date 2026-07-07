import * as repo from "../../data/repo";
import { currentPermission, showOSNotification } from "../../lib/notifications";
import { defaultPrefs, defaultProfiles, seedNotifications } from "../../lib/profile";
import { playNotifySound } from "../../lib/sound";
import type { NotifCategory, NotifItem, Prefs, Profile } from "../../types";
import type { StoreGet, StoreSet } from "../types";

const MAX_NOTIFS = 40;
const profileSyncTimers = new Map<number, ReturnType<typeof setTimeout>>();

// Per-user profiles, notification preferences and the in-app notification feed.
export const createProfilesSlice = (set: StoreSet, get: StoreGet) => ({
  profiles: defaultProfiles(),
  prefs: defaultPrefs(),
  notifications: seedNotifications(),
  notifPermission: currentPermission(),

  updateProfile: (id: number, patch: Partial<Profile>) => {
    set((s) => ({ profiles: { ...s.profiles, [id]: { ...s.profiles[id], ...patch } } }));
    get().syncProfile(id);
  },
  setAvatar: (id: number, url: string | null) => {
    set((s) => ({ profiles: { ...s.profiles, [id]: { ...s.profiles[id], avatarUrl: url } } }));
    get().syncProfile(id);
  },
  // debounced: profile edits commit per-field on blur, so batch the writes
  syncProfile: (id: number) => {
    clearTimeout(profileSyncTimers.get(id));
    profileSyncTimers.set(
      id,
      setTimeout(() => {
        const p = get().profiles[id];
        if (p) repo.saveProfile(id, p).catch(get().syncCatch("profile save"));
      }, 600),
    );
  },
  updatePrefs: (id: number, patch: Partial<Prefs>) =>
    set((s) => ({ prefs: { ...s.prefs, [id]: { ...s.prefs[id], ...patch } } })),
  setNotifPermission: (p: NotificationPermission) => set({ notifPermission: p }),
  pushNotification: (n: Omit<NotifItem, "id" | "read" | "time" | "at">, opts?: { silent?: boolean }) => {
    set((s) => ({
      notifications: [
        { ...n, id: "n" + Date.now() + Math.random().toString(36).slice(2, 6), read: false, at: Date.now() },
        ...s.notifications,
      ].slice(0, MAX_NOTIFS),
    }));
    const st = get();
    if (!opts?.silent && st.prefs[st.currentUserId]?.sound) playNotifySound();
  },

  // Single gate for category-based notifications: the Settings toggle for the
  // category controls the whole thing (feed entry, sound, OS popup). This is
  // what makes the toggles real — an event whose toggle is off never surfaces.
  // `quiet` adds the bell entry only (no sound, no OS popup) — used by the
  // hydrate catch-up so reopening the app doesn't fire a burst of stale
  // notifications. Returns whether the notification surfaced.
  notifyCategory: (
    category: NotifCategory,
    n: { dot: string; title: string; body: string; tag?: string; url?: string; quiet?: boolean },
  ): boolean => {
    const st = get();
    const prefs = st.prefs[st.currentUserId];
    if (!prefs?.[category]) return false;
    st.pushNotification({ dot: n.dot, title: n.title, body: n.body, category, url: n.url }, { silent: n.quiet });
    if (!n.quiet && prefs.pushEnabled && st.notifPermission === "granted") {
      showOSNotification(n.title, n.body, n.tag, n.url);
    }
    return true;
  },
  markAllNotifsRead: () =>
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
  markNotifRead: (id: string) =>
    set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
  clearNotifs: () => set({ notifications: [] }),
});
