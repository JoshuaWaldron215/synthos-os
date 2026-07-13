import * as repo from "../../data/repo";
import type { Conversation, PortalUpdate } from "../../types";
import type { StoreGet, StoreSet } from "../types";

export interface PortalState {
  token: string | null;
  progress: number;
  updates: PortalUpdate[];
  loaded: boolean;
}

const EMPTY: PortalState = { token: null, progress: 0, updates: [], loaded: false };

const randomToken = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

const progressTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Client portal (team side): one revocable public link per project, a
// team-controlled progress %, and the curated updates feed. The public page
// itself reads through /api/portal — this slice only manages the controls.
export const createPortalSlice = (set: StoreSet, get: StoreGet) => ({
  portals: {} as Record<string, PortalState>,

  loadPortal: async (proj: string): Promise<void> => {
    const data = await repo.fetchPortal(proj).catch(() => null);
    set((s) => ({
      portals: {
        ...s.portals,
        [proj]: data
          ? { token: data.link?.token ?? null, progress: data.link?.progress ?? 0, updates: data.updates, loaded: true }
          : { ...EMPTY, loaded: true },
      },
    }));
  },

  enablePortal: (proj: string) => {
    const token = randomToken();
    const prev = get().portals[proj] ?? EMPTY;
    set((s) => ({ portals: { ...s.portals, [proj]: { ...prev, token, loaded: true } } }));
    repo.savePortalLink(proj, token, prev.progress).catch(get().syncCatch("portal"));

    // the portal's client thread — a real conversation so replies live in chat
    const convoId = "portal-" + proj;
    if (!get().conversations.some((c) => c.id === convoId)) {
      const project = get().projects.find((p) => p.id === proj);
      const convo: Conversation = {
        id: convoId,
        type: "client",
        name: (project?.client ?? proj) + " · portal",
        proj,
        members: [0, 1, 2],
        guests: [],
      };
      set((s) => ({ conversations: s.conversations.concat(convo) }));
      repo.saveConversation(convo).catch(get().syncCatch("portal"));
    }
    get().showToast("portal link created ✦");
  },

  /** new token, old link instantly dead */
  rotatePortal: (proj: string) => {
    const prev = get().portals[proj];
    if (!prev?.token) return;
    const token = randomToken();
    set((s) => ({ portals: { ...s.portals, [proj]: { ...prev, token } } }));
    repo.savePortalLink(proj, token, prev.progress).catch(get().syncCatch("portal"));
    get().showToast("new link minted — old one is dead");
  },

  disablePortal: (proj: string) => {
    const prev = get().portals[proj] ?? EMPTY;
    set((s) => ({ portals: { ...s.portals, [proj]: { ...prev, token: null } } }));
    repo.removePortalLink(proj).catch(get().syncCatch("portal"));
    get().showToast("portal turned off");
  },

  // slider fires per-pixel — keep the UI live, debounce the write
  setPortalPct: (proj: string, pct: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    const prev = get().portals[proj] ?? EMPTY;
    set((s) => ({ portals: { ...s.portals, [proj]: { ...prev, progress: clamped } } }));
    clearTimeout(progressTimers.get(proj));
    progressTimers.set(
      proj,
      setTimeout(() => {
        if (get().portals[proj]?.token) {
          repo.setPortalProgress(proj, get().portals[proj].progress).catch(get().syncCatch("portal"));
        }
      }, 500),
    );
  },

  postPortalUpdate: (proj: string, body: string) => {
    const text = body.trim();
    if (!text) return;
    const u: PortalUpdate = {
      id: "pu" + Date.now() + Math.random().toString(36).slice(2, 5),
      proj,
      who: get().currentUserId,
      body: text,
      at: Date.now(),
    };
    const prev = get().portals[proj] ?? EMPTY;
    set((s) => ({ portals: { ...s.portals, [proj]: { ...prev, updates: [u, ...prev.updates] } } }));
    repo.savePortalUpdate(u).catch(get().syncCatch("portal"));
    get().showToast("update posted to the portal ✦");
  },

  deletePortalUpdate: (proj: string, id: string) => {
    const prev = get().portals[proj];
    if (!prev) return;
    set((s) => ({ portals: { ...s.portals, [proj]: { ...prev, updates: prev.updates.filter((u) => u.id !== id) } } }));
    repo.removePortalUpdate(id).catch(get().syncCatch("portal"));
  },

  receivePortalUpdate: (u: PortalUpdate) => {
    const prev = get().portals[u.proj];
    if (!prev) return; // not loaded on this device — loadPortal will fetch it
    const updates = prev.updates.some((x) => x.id === u.id)
      ? prev.updates.map((x) => (x.id === u.id ? u : x))
      : [u, ...prev.updates].sort((a, b) => b.at - a.at);
    set((s) => ({ portals: { ...s.portals, [u.proj]: { ...prev, updates } } }));
  },
});
