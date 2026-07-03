import type { StoreGet, StoreSet } from "../types";

let toastTimer: ReturnType<typeof setTimeout> | undefined;
let syncErrorTimer: ReturnType<typeof setTimeout> | undefined;

// Shell chrome: sidebar, mobile nav, account sheet, profile card, toast.
export const createUiSlice = (set: StoreSet, get: StoreGet) => ({
  currentUserId: 0,
  sidebarCollapsed: false,
  mobileNavOpen: false,
  accountSheetOpen: false,
  openProfileId: null as number | null,
  notifOpen: false,
  showRevenue: true,
  toast: null as string | null,
  syncError: null as string | null,

  setCurrentUser: (id: number) => set({ currentUserId: id }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v: boolean) => set({ sidebarCollapsed: v }),
  openMobileNav: () => set({ mobileNavOpen: true }),
  closeMobileNav: () => set({ mobileNavOpen: false }),
  openAccountSheet: () => set({ accountSheetOpen: true }),
  closeAccountSheet: () => set({ accountSheetOpen: false }),
  openProfile: (id: number) => set({ openProfileId: id, accountSheetOpen: false }),
  closeProfile: () => set({ openProfileId: null }),
  toggleNotif: () => set((s) => ({ notifOpen: !s.notifOpen })),
  setShowRevenue: (v: boolean) => set({ showRevenue: v }),

  showToast: (msg: string) => {
    clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => set({ toast: null }), 1700);
  },
  clearToast: () => set({ toast: null }),

  // Returns a Promise catch handler that surfaces a failed backend write
  // instead of swallowing it. The optimistic local update already happened,
  // so the banner reassures the user their data is safe locally while flagging
  // that the shared copy is stale. Only meaningful in Supabase mode (repo
  // writes resolve instantly in local mode).
  syncCatch: (context: string) => (err: unknown) => {
    console.warn(`[sync] ${context} failed`, err);
    clearTimeout(syncErrorTimer);
    set({ syncError: "couldn’t sync to the server — your changes are saved on this device and will retry on reload" });
    syncErrorTimer = setTimeout(() => set({ syncError: null }), 9000);
  },
  dismissSyncError: () => {
    clearTimeout(syncErrorTimer);
    set({ syncError: null });
  },
  copy: async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      get().showToast(label);
    } catch {
      get().showToast("couldn't copy — check clipboard permissions");
    }
  },
});
