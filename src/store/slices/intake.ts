import * as repo from "../../data/repo";
import { SAMPLE_SCOPE, USERS } from "../../data/seed";
import { generateTasks } from "../../lib/intake";
import type { DraftTask, Task } from "../../types";
import type { StoreGet, StoreSet } from "../types";

let intakeTimer: ReturnType<typeof setTimeout> | undefined;

// Intake: paste a scope/transcript, generate draft tasks, push them to the board.
export const createIntakeSlice = (set: StoreSet, get: StoreGet) => ({
  intakeText: "",
  draftTasks: null as DraftTask[] | null,
  intakeBusy: false,

  setIntakeText: (v: string) => set({ intakeText: v }),
  fillSample: () => set({ intakeText: SAMPLE_SCOPE, draftTasks: null }),
  analyzeIntake: () => {
    const txt = (get().intakeText || "").trim();
    if (!txt) {
      get().showToast("paste a scope or transcript first");
      return;
    }
    set({ intakeBusy: true, draftTasks: null });
    clearTimeout(intakeTimer);
    intakeTimer = setTimeout(() => {
      set({ draftTasks: generateTasks(txt, get().tasks), intakeBusy: false });
    }, 800);
  },
  cycleAssignee: (i: number) =>
    set((s) => {
      if (!s.draftTasks) return {};
      const d = s.draftTasks.map((t) => ({ ...t }));
      d[i].who = (d[i].who + 1) % USERS.length;
      return { draftTasks: d };
    }),
  clearDraft: () => set({ draftTasks: null }),
  addDrafts: () => {
    const d = get().draftTasks || [];
    if (!d.length) return;
    // drafts land without a project; assign from the task modal afterwards
    const nw: Task[] = d.map((t) => ({
      id: t.id,
      title: t.title,
      col: "build",
      who: t.who,
      pri: t.pri,
      blocked: false,
      proj: "",
      notes: "",
    }));
    set((s) => ({ tasks: s.tasks.concat(nw), draftTasks: null, intakeText: "" }));
    nw.forEach((t) => repo.saveTask(t).catch(get().syncCatch("task write")));
    get().showToast("added " + d.length + " tasks · assigned evenly");
  },
});
