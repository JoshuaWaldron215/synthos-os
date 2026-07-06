import * as repo from "../../data/repo";
import { AUDIT, KEYS, PROJECTS, WINS } from "../../data/seed";
import type {
  AuditEntry,
  ContentItem,
  Conversation,
  Lead,
  Profile,
  Project,
  ProjectFile,
  ProjectStatus,
  Task,
  TeamMessage,
  VaultKey,
  Win,
} from "../../types";
import type { StoreGet, StoreSet, StoreState } from "../types";

// replace-or-append by id — realtime events and hydrate merges are idempotent
const upsertBy = <T extends { id: string }>(list: T[], item: T): T[] =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : list.concat(item);

// Union server + local by id (server wins on conflict). Local-only records —
// ones a failed or offline write never delivered — are kept, not dropped.
const unionById = <T extends { id: string }>(server: T[], local: T[]): T[] => {
  const ids = new Set(server.map((x) => x.id));
  return server.concat(local.filter((x) => !ids.has(x.id)));
};

// Re-push local records the server has never seen, so a write that silently
// failed (FK reject, offline, transient) eventually reaches the team instead
// of being stranded on one device. Push-only — never deletes.
function reconcileToServer(
  server: { projects: Project[]; tasks: Task[]; keys: VaultKey[]; wins: Win[]; content: ContentItem[]; leads: Lead[] },
  local: { projects: Project[]; tasks: Task[]; keys: VaultKey[]; wins: Win[]; content: ContentItem[]; leads: Lead[] },
): void {
  const missing = <T extends { id: string }>(srv: T[], loc: T[]): T[] => {
    const ids = new Set(srv.map((x) => x.id));
    return loc.filter((x) => !ids.has(x.id));
  };
  const swallow = () => {};
  missing(server.projects, local.projects).forEach((p) => repo.saveProject(p).catch(swallow));
  missing(server.tasks, local.tasks).forEach((t) => repo.saveTask(t).catch(swallow));
  missing(server.keys, local.keys).forEach((k) => repo.saveKey(k).catch(swallow));
  missing(server.wins, local.wins).forEach((w) => repo.saveWin(w).catch(swallow));
  missing(server.content, local.content).forEach((c) => repo.saveContent(c).catch(swallow));
  missing(server.leads, local.leads).forEach((l) => repo.saveLead(l).catch(swallow));
}

// Server messages win per id; locally-persisted messages the server has never
// seen (offline sends, pre-sync history) are kept rather than dropped.
const mergeTeamMsgs = (
  local: Record<string, TeamMessage[]>,
  server: Record<string, TeamMessage[]>,
): Record<string, TeamMessage[]> => {
  const out = { ...local };
  for (const convo of Object.keys(server)) {
    const remote = server[convo];
    const ids = new Set(remote.map((m) => m.id));
    const localOnly = (local[convo] || []).filter((m) => !m.id || !ids.has(m.id));
    out[convo] = remote.concat(localOnly).sort((a, b) => (a.at ?? 0) - (b.at ?? 0));
  }
  return out;
};

const mergeProfiles = (
  local: Record<number, Profile>,
  server: Record<number, Partial<Profile>>,
): Record<number, Profile> => {
  const out = { ...local };
  for (const id of Object.keys(server).map(Number)) {
    if (out[id]) out[id] = { ...out[id], ...server[id] };
  }
  return out;
};

// Shared workspace data: projects, vault keys, files, wins, activity log,
// plus the Supabase hydration entry point. Every write goes through the repo
// (a no-op in local mode).
export const createDataSlice = (set: StoreSet, get: StoreGet) => ({
  projects: PROJECTS.map((p) => ({ ...p })),
  keys: KEYS.map((k) => ({ ...k })),
  activity: AUDIT.map((a) => ({ ...a })),
  files: [] as ProjectFile[],
  wins: WINS.map((w) => ({ ...w })),
  hydrated: false,

  fStatus: "all",
  fBuilder: "all",
  fStack: "all",

  hydrate: async () => {
    try {
      const data = await repo.fetchAll();
      if (data) {
        const local = get();
        // union everything id-keyed so a locally-stranded record (failed or
        // offline write) is never dropped; server copy wins on conflict
        set({
          projects: unionById(data.projects, local.projects),
          keys: unionById(data.keys, local.keys),
          activity: data.activity.length ? data.activity : local.activity,
          files: data.files,
          wins: unionById(data.wins, local.wins),
          tasks: unionById(data.tasks, local.tasks),
          conversations: data.conversations.length ? data.conversations : local.conversations,
          teamMsgs: mergeTeamMsgs(local.teamMsgs, data.teamMsgs),
          content: unionById(data.content, local.content),
          leads: unionById(data.leads, local.leads),
          profiles: mergeProfiles(local.profiles, data.profiles),
        });
        get().startRealtime();
        // recover any of those local-only records to the server
        reconcileToServer(data, local);
      }
    } catch (e) {
      // stay on local cache, but let the user know the shared copy didn't load
      get().syncCatch("initial load")(e);
    } finally {
      set({ hydrated: true });
    }
  },

  // Live cross-client sync. Handlers are idempotent (upsert/remove by id), so
  // echoes of this client's own optimistic writes apply harmlessly.
  startRealtime: () => {
    repo
      .subscribeRealtime({
        project: (ev, data) =>
          set((s) => ({
            projects: ev === "delete" ? s.projects.filter((p) => p.id !== data) : upsertBy(s.projects, data as Project),
          })),
        // Task events double as notification triggers. Own edits apply locally
        // before the echo arrives, so prev-based diffs only fire for changes
        // made by someone else.
        task: (ev, data) => {
          if (ev === "delete") {
            set((s) => ({ tasks: s.tasks.filter((t) => t.id !== data) }));
            return;
          }
          const task = data as Task;
          const st = get();
          const prev = st.tasks.find((t) => t.id === task.id);
          set((s) => ({ tasks: upsertBy(s.tasks, task) }));
          if (task.who === st.currentUserId && (!prev || prev.who !== st.currentUserId)) {
            st.notifyCategory("taskAssigned", {
              dot: "#33ADEE",
              title: "task for you ✦",
              body: task.title,
              tag: "task-" + task.id,
              url: "/tasks",
            });
          } else if (prev && prev.col !== task.col && (task.col === "ship" || task.col === "done")) {
            st.notifyCategory("shipped", {
              dot: "#2FC197",
              title: task.col === "done" ? "task done" : "task shipped",
              body: task.title,
              tag: "task-" + task.id,
              url: "/tasks",
            });
          }
        },
        key: (ev, data) =>
          set((s) => ({
            keys: ev === "delete" ? s.keys.filter((k) => k.id !== data) : upsertBy(s.keys, data as VaultKey),
          })),
        win: (ev, data) => {
          if (ev === "delete") {
            set((s) => ({ wins: s.wins.filter((w) => w.id !== data) }));
            return;
          }
          const win = data as Win;
          const isNew = !get().wins.some((w) => w.id === win.id);
          set((s) => ({ wins: upsertBy(s.wins, win) }));
          if (isNew) {
            get().notifyCategory("shipped", {
              dot: "#2FC197",
              title: "win logged 🎉",
              body: win.title + (win.amount ? " · " + win.amount : ""),
              tag: "win-" + win.id,
              url: "/wins",
            });
          }
        },
        file: (ev, data) =>
          set((s) => ({
            files: ev === "delete" ? s.files.filter((f) => f.id !== data) : upsertBy(s.files, data as ProjectFile),
          })),
        activity: (entry) =>
          set((s) =>
            s.activity.some((a) => a.id === entry.id) ? {} : { activity: [entry, ...s.activity].slice(0, 80) },
          ),
        convo: (ev, data) => {
          if (ev === "delete") {
            set((s) => {
              const msgs = { ...s.teamMsgs };
              delete msgs[data as string];
              return {
                conversations: s.conversations.filter((c) => c.id !== data),
                teamMsgs: msgs,
                activeConvo: s.activeConvo === data ? "general" : s.activeConvo,
              };
            });
          } else {
            set((s) => ({ conversations: upsertBy(s.conversations, data as Conversation) }));
          }
        },
        message: (convoId, msg) => get().receiveTeamMessage(convoId, msg),
        messageDeleted: (id) =>
          set((s) => {
            const msgs: typeof s.teamMsgs = {};
            for (const [convo, list] of Object.entries(s.teamMsgs)) {
              msgs[convo] = list.filter((m) => m.id !== id);
            }
            return { teamMsgs: msgs };
          }),
        content: (ev, data) => {
          if (ev === "delete") {
            set((s) => ({ content: s.content.filter((c) => c.id !== data) }));
            return;
          }
          const item = data as ContentItem;
          const isNew = !get().content.some((c) => c.id === item.id);
          set((s) => ({ content: upsertBy(s.content, item) }));
          if (isNew) {
            get().notifyCategory("content", {
              dot: "#FF8A63",
              title: "new in the pipeline",
              body: item.title,
              tag: "content-" + item.id,
              url: "/content",
            });
          }
        },
        lead: (ev, data) =>
          set((s) => ({
            leads: ev === "delete" ? s.leads.filter((l) => l.id !== data) : upsertBy(s.leads, data as Lead),
          })),
        profile: (builderId, patch) =>
          set((s) => ({
            profiles: s.profiles[builderId]
              ? { ...s.profiles, [builderId]: { ...s.profiles[builderId], ...patch } }
              : s.profiles,
          })),
      })
      .catch(() => {
        /* local mode or subscribe failure — polling-free local UX still works */
      });
  },

  logActivity: (action: string, target: string, proj: string) => {
    const entry: AuditEntry = {
      id: "act" + Date.now() + Math.random().toString(36).slice(2, 5),
      who: get().currentUserId,
      action,
      target,
      at: Date.now(),
      proj,
    };
    set((s) => ({ activity: [entry, ...s.activity].slice(0, 80) }));
    repo.addActivity(entry).catch(get().syncCatch("data write"));
  },

  addProject: (input: { client: string; tagline?: string; stack?: string[]; status?: ProjectStatus }) => {
    const base = (input.client || "project")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "project";
    const existing = new Set(get().projects.map((p) => p.id));
    let id = base;
    let n = 2;
    while (existing.has(id)) id = base + "-" + n++;
    const proj: Project = {
      id,
      client: input.client.trim() || "untitled project",
      tagline: input.tagline?.trim() || "",
      description: "",
      status: input.status ?? "in progress",
      health: "sky",
      open: 0,
      builders: [get().currentUserId],
      rev: "",
      earned: "",
      stack: input.stack ?? [],
      links: [
        { id: "l-repo", label: "repo", url: "" },
        { id: "l-vercel", label: "vercel", url: "" },
        { id: "l-supabase", label: "supabase", url: "" },
      ],
      imageUrl: null,
    };
    set((s) => ({ projects: s.projects.concat(proj) }));
    repo.saveProject(proj).catch(get().syncCatch("data write"));
    get().logActivity("created project", proj.client, id);
    return id;
  },
  updateProject: (id: string, patch: Partial<Project>) => {
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
    const updated = get().projects.find((p) => p.id === id);
    if (updated) repo.saveProject(updated).catch(get().syncCatch("data write"));
  },
  setProjectImage: (id: string, url: string | null) => {
    get().updateProject(id, { imageUrl: url });
  },
  deleteProject: (id: string) => {
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      tasks: s.tasks.filter((t) => t.proj !== id),
      keys: s.keys.filter((k) => k.proj !== id),
      files: s.files.filter((f) => f.proj !== id),
    }));
    repo.removeProject(id).catch(get().syncCatch("data write"));
    get().showToast("project deleted");
  },

  addKey: (input: { label: string; val: string; proj: string }) => {
    const key: VaultKey = {
      id: "k" + Date.now() + Math.random().toString(36).slice(2, 5),
      label: input.label.trim(),
      val: input.val.trim(),
      proj: input.proj,
    };
    set((s) => ({ keys: s.keys.concat(key) }));
    repo.saveKey(key).catch(get().syncCatch("data write"));
    get().logActivity("added", key.label, key.proj);
  },
  updateKey: (id: string, patch: Partial<VaultKey>) => {
    set((s) => ({ keys: s.keys.map((k) => (k.id === id ? { ...k, ...patch } : k)) }));
    const updated = get().keys.find((k) => k.id === id);
    if (updated) repo.saveKey(updated).catch(get().syncCatch("data write"));
  },
  deleteKey: (id: string) => {
    const k = get().keys.find((x) => x.id === id);
    set((s) => ({ keys: s.keys.filter((x) => x.id !== id) }));
    repo.removeKey(id).catch(get().syncCatch("data write"));
    if (k) get().logActivity("removed", k.label, k.proj);
  },

  addFile: (f: ProjectFile) => {
    set((s) => ({ files: s.files.concat(f) }));
    repo.saveFileMeta(f).catch(get().syncCatch("data write"));
    get().logActivity("uploaded", f.name, f.proj);
  },
  deleteFile: (f: ProjectFile) => {
    set((s) => ({ files: s.files.filter((x) => x.id !== f.id) }));
    repo.removeFile(f).catch(get().syncCatch("data write"));
    get().logActivity("deleted file", f.name, f.proj);
  },

  addWin: (input: { title: string; who: number; tag: string; amount: string; proj: string; note: string }) => {
    const win: Win = {
      id: "w" + Date.now() + Math.random().toString(36).slice(2, 5),
      who: input.who,
      title: input.title.trim(),
      tag: input.tag.trim(),
      amount: input.amount.trim(),
      proj: input.proj,
      note: input.note.trim(),
      createdAt: Date.now(),
    };
    set((s) => ({ wins: [win, ...s.wins] }));
    repo.saveWin(win).catch(get().syncCatch("data write"));
    if (win.proj) get().logActivity("logged a win", win.title, win.proj);
    get().showToast("win logged \u2728");
  },
  updateWin: (id: string, patch: Partial<Win>) => {
    set((s) => ({ wins: s.wins.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
    const updated = get().wins.find((w) => w.id === id);
    if (updated) repo.saveWin(updated).catch(get().syncCatch("data write"));
  },
  deleteWin: (id: string) => {
    set((s) => ({ wins: s.wins.filter((w) => w.id !== id) }));
    repo.removeWin(id).catch(get().syncCatch("data write"));
    get().showToast("win removed");
  },

  setFilter: (group: "status" | "builder" | "stack", val: string) => {
    const map = { status: "fStatus", builder: "fBuilder", stack: "fStack" } as const;
    set({ [map[group]]: val } as Partial<StoreState>);
  },
});
