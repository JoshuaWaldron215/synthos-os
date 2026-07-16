import * as repo from "../../data/repo";
import type { VaultLogin } from "../../types";
import type { StoreGet, StoreSet } from "../types";

const revealTimers: Record<string, ReturnType<typeof setTimeout>> = {};

// Vault reveal state (auto-hides after 7s) and the audit drawer.
export const createVaultSlice = (set: StoreSet, get: StoreGet) => ({
  revealed: {} as Record<string, boolean>,
  auditOpen: false,
  logins: [] as VaultLogin[],

  reveal: (id: string) => {
    set((s) => ({ revealed: { ...s.revealed, [id]: true } }));
    const k = get().keys.find((x) => x.id === id);
    const l = get().logins.find((x) => x.id === id);
    if (k) get().logActivity("revealed", k.label, k.proj);
    else if (l) get().logActivity("revealed login", l.tool, l.proj);
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

  addLogin: (input: { tool: string; username: string; password: string; url: string; proj: string }) => {
    const login: VaultLogin = {
      id: "lg" + Date.now() + Math.random().toString(36).slice(2, 5),
      tool: input.tool.trim(),
      username: input.username.trim(),
      password: input.password,
      url: input.url.trim(),
      proj: input.proj,
    };
    set((s) => ({ logins: s.logins.concat(login) }));
    repo.saveLogin(login).catch(get().syncCatch("vault write"));
    get().logActivity("added login", login.tool, login.proj);
  },
  deleteLogin: (id: string) => {
    const l = get().logins.find((x) => x.id === id);
    set((s) => ({ logins: s.logins.filter((x) => x.id !== id) }));
    repo.removeLogin(id).catch(get().syncCatch("vault write"));
    if (l) get().logActivity("removed login", l.tool, l.proj);
  },
});
