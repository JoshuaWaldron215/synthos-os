import type { StoreGet, StoreSet } from "../types";

let toastTimer: ReturnType<typeof setTimeout> | undefined;

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
  copy: async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      get().showToast(label);
    } catch {
      get().showToast("couldn't copy — check clipboard permissions");
    }
  },
});
