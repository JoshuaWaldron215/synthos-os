import * as repo from "../../data/repo";
import { AUDIT, KEYS, PROJECTS, WINS } from "../../data/seed";
import type { AuditEntry, Project, ProjectFile, ProjectStatus, VaultKey, Win } from "../../types";
import type { StoreGet, StoreSet, StoreState } from "../types";

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
        set({
          projects: data.projects.length ? data.projects : get().projects,
          keys: data.keys.length ? data.keys : get().keys,
          activity: data.activity.length ? data.activity : get().activity,
          files: data.files,
          wins: data.wins.length ? data.wins : get().wins,
          tasks: data.tasks.length ? data.tasks : get().tasks,
        });
      }
    } catch {
      /* stay on local cache */
    } finally {
      set({ hydrated: true });
    }
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
    repo.addActivity(entry).catch(() => {});
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
    repo.saveProject(proj).catch(() => {});
    get().logActivity("created project", proj.client, id);
    return id;
  },
  updateProject: (id: string, patch: Partial<Project>) => {
    set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
    const updated = get().projects.find((p) => p.id === id);
    if (updated) repo.saveProject(updated).catch(() => {});
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
    repo.removeProject(id).catch(() => {});
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
    repo.saveKey(key).catch(() => {});
    get().logActivity("added", key.label, key.proj);
  },
  updateKey: (id: string, patch: Partial<VaultKey>) => {
    set((s) => ({ keys: s.keys.map((k) => (k.id === id ? { ...k, ...patch } : k)) }));
    const updated = get().keys.find((k) => k.id === id);
    if (updated) repo.saveKey(updated).catch(() => {});
  },
  deleteKey: (id: string) => {
    const k = get().keys.find((x) => x.id === id);
    set((s) => ({ keys: s.keys.filter((x) => x.id !== id) }));
    repo.removeKey(id).catch(() => {});
    if (k) get().logActivity("removed", k.label, k.proj);
  },

  addFile: (f: ProjectFile) => {
    set((s) => ({ files: s.files.concat(f) }));
    repo.saveFileMeta(f).catch(() => {});
    get().logActivity("uploaded", f.name, f.proj);
  },
  deleteFile: (f: ProjectFile) => {
    set((s) => ({ files: s.files.filter((x) => x.id !== f.id) }));
    repo.removeFile(f).catch(() => {});
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
    repo.saveWin(win).catch(() => {});
    if (win.proj) get().logActivity("logged a win", win.title, win.proj);
    get().showToast("win logged \u2728");
  },
  updateWin: (id: string, patch: Partial<Win>) => {
    set((s) => ({ wins: s.wins.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
    const updated = get().wins.find((w) => w.id === id);
    if (updated) repo.saveWin(updated).catch(() => {});
  },
  deleteWin: (id: string) => {
    set((s) => ({ wins: s.wins.filter((w) => w.id !== id) }));
    repo.removeWin(id).catch(() => {});
    get().showToast("win removed");
  },

  setFilter: (group: "status" | "builder" | "stack", val: string) => {
    const map = { status: "fStatus", builder: "fBuilder", stack: "fStack" } as const;
    set({ [map[group]]: val } as Partial<StoreState>);
  },
});
