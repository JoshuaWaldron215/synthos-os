import type { StoreGet, StoreSet } from "../types";

const revealTimers: Record<string, ReturnType<typeof setTimeout>> = {};

// Vault reveal state (auto-hides after 7s) and the audit drawer.
export const createVaultSlice = (set: StoreSet, get: StoreGet) => ({
  revealed: {} as Record<string, boolean>,
  auditOpen: false,

  reveal: (id: string) => {
    set((s) => ({ revealed: { ...s.revealed, [id]: true } }));
    const k = get().keys.find((x) => x.id === id);
    if (k) get().logActivity("revealed", k.label, k.proj);
    clearTimeout(revealTimers[id]);
    revealTimers[id] = setTimeout(() => {
      set((s) => {
        const r = { ...s.revealed };
        delete r[id];
        return { revealed: r };
      });
    }, 7000);
  },
  hide: (id: string) => {
    set((s) => {
      const r = { ...s.revealed };
      delete r[id];
      return { revealed: r };
    });
    clearTimeout(revealTimers[id]);
  },
  copyEnv: () => {
    const keys = get().keys;
    const env = keys.map((k) => k.label + "=" + k.val).join("\n");
    get().copy(env, "copied .env  ·  " + keys.length + " keys");
    get().logActivity("exported .env", keys.length + " keys", "shared");
  },
  openAudit: () => set({ auditOpen: true }),
  closeAudit: () => set({ auditOpen: false }),
});
