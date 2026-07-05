import * as repo from "../../data/repo";
import { BASE_TASKS, USERS } from "../../data/seed";
import { effectiveUser } from "../../lib/profile";
import { sendServerPush } from "../../lib/push";
import type { ColKey, ColLabels, Priority, Task } from "../../types";
import type { StoreGet, StoreSet } from "../types";

const PRI_ORDER: Priority[] = ["low", "med", "high"];

// Kanban board: tasks, drag state, inline edit, composer, column labels.
export const createTasksSlice = (set: StoreSet, get: StoreGet) => ({
  tasks: BASE_TASKS.map((t) => ({ ...t })),
  boardProj: "all",
  boardWho: "all" as number | "all",
  dragId: null as string | null,
  dragOver: null as ColKey | null,
  editingId: null as string | null,
  editText: "",
  composerCol: null as ColKey | null,
  composerText: "",
  openTaskId: null as string | null,
  colLabels: { build: "build", qa: "qa", ship: "ship", done: "done" } as ColLabels,
  editingCol: null as ColKey | null,
  editColText: "",

  setBoardProj: (val: string) => set({ boardProj: val }),
  setBoardWho: (val: number | "all") => set({ boardWho: val }),

  // Real Web Push to a teammate's devices when a task lands on their plate.
  // Open tabs get the in-app notification via Realtime; this reaches phones
  // with the app closed. Best-effort, never surfaces an error.
  notifyAssigned: (id: string) => {
    const t = get().tasks.find((x) => x.id === id);
    const me = get().currentUserId;
    if (!t || !repo.usingSupabase || t.who === me) return;
    const assigner = effectiveUser(me, get().profiles).name;
    sendServerPush("task for you ✦", assigner + " assigned: " + t.title, "task-" + t.id, [t.who], "/tasks").catch(
      () => {},
    );
  },
  setDragId: (id: string | null) => set({ dragId: id }),
  setDragOver: (col: ColKey | null) => set((s) => (s.dragOver === col ? {} : { dragOver: col })),
  dropOnCol: (col: ColKey) => {
    const id = get().dragId;
    if (id) {
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, col } : t)) }));
      const moved = get().tasks.find((t) => t.id === id);
      if (moved) repo.saveTask(moved).catch(get().syncCatch("task write"));
    }
    set({ dragId: null, dragOver: null });
  },
  startEdit: (id: string) => {
    const t = get().tasks.find((x) => x.id === id);
    set({ editingId: id, editText: t ? t.title : "" });
  },
  setEditText: (v: string) => set({ editText: v }),
  saveEdit: () => {
    const { editingId, editText } = get();
    const v = (editText || "").trim();
    if (editingId && v) {
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === editingId ? { ...t, title: v } : t)),
        editingId: null,
        editText: "",
      }));
      const edited = get().tasks.find((t) => t.id === editingId);
      if (edited) repo.saveTask(edited).catch(get().syncCatch("task write"));
    } else {
      set({ editingId: null, editText: "" });
    }
  },
  cancelEdit: () => set({ editingId: null, editText: "" }),
  openComposer: (col: ColKey) => set({ composerCol: col, composerText: "" }),
  setComposerText: (v: string) => set({ composerText: v }),
  saveComposer: () => {
    const { composerCol, composerText, boardProj } = get();
    const v = (composerText || "").trim();
    if (composerCol && v) {
      // on the "all" board the task starts without a project ("" = none)
      const proj = boardProj !== "all" ? boardProj : "";
      get().addTask({ title: v, proj, col: composerCol });
      set({ composerText: "" });
    }
  },
  closeComposer: () => set({ composerCol: null, composerText: "" }),
  addTask: (input: { title: string; proj: string; col?: ColKey; who?: number; pri?: Priority }) => {
    const task: Task = {
      id: "t" + Date.now() + Math.random().toString(36).slice(2, 5),
      title: input.title.trim(),
      col: input.col ?? "build",
      who: input.who ?? get().currentUserId,
      pri: input.pri ?? "med",
      blocked: false,
      proj: input.proj,
      notes: "",
    };
    set((s) => ({ tasks: s.tasks.concat(task) }));
    repo.saveTask(task).catch(get().syncCatch("task write"));
    get().notifyAssigned(task.id);
    get().showToast("task added");
  },
  openTask: (id: string) => set({ openTaskId: id, editingId: null }),
  closeTask: () => set({ openTaskId: null }),
  patchTask: (id: string, patch: Partial<Task>) => {
    const before = get().tasks.find((t) => t.id === id);
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
    const updated = get().tasks.find((t) => t.id === id);
    if (updated) repo.saveTask(updated).catch(get().syncCatch("task write"));
    if (patch.who !== undefined && before && patch.who !== before.who) get().notifyAssigned(id);
  },
  cyclePri: (id: string) => {
    set((s) => ({
      tasks: s.tasks.map((t) => {
        if (t.id !== id) return t;
        const i = (PRI_ORDER.indexOf(t.pri) + 1) % PRI_ORDER.length;
        return { ...t, pri: PRI_ORDER[i] };
      }),
    }));
    const t = get().tasks.find((x) => x.id === id);
    if (t) repo.saveTask(t).catch(get().syncCatch("task write"));
  },
  cycleAssignTask: (id: string) => {
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, who: (t.who + 1) % USERS.length } : t)) }));
    const t = get().tasks.find((x) => x.id === id);
    if (t) repo.saveTask(t).catch(get().syncCatch("task write"));
    get().notifyAssigned(id);
  },
  deleteTask: (id: string) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id), openTaskId: null }));
    repo.removeTask(id).catch(get().syncCatch("task write"));
    get().showToast("task deleted");
  },
  startEditCol: (col: ColKey) => set((s) => ({ editingCol: col, editColText: s.colLabels[col] })),
  setEditColText: (v: string) => set({ editColText: v }),
  saveEditCol: () => {
    const { editingCol, editColText } = get();
    const v = (editColText || "").trim();
    if (editingCol && v) {
      set((s) => ({ colLabels: { ...s.colLabels, [editingCol]: v }, editingCol: null, editColText: "" }));
    } else {
      set({ editingCol: null, editColText: "" });
    }
  },
  cancelEditCol: () => set({ editingCol: null, editColText: "" }),
});
