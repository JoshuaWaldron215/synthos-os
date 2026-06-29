import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AuditEntry,
  ChatMessage,
  ColKey,
  ColLabels,
  ContentItem,
  Conversation,
  DraftTask,
  NotifItem,
  Prefs,
  Priority,
  Profile,
  Project,
  ProjectFile,
  ProjectStatus,
  Task,
  TeamMessage,
  VaultKey,
  Win,
} from "../types";
import {
  AUDIT,
  BASE_TASKS,
  CONTENT,
  INITIAL_CHAT_GREETING,
  KEYS,
  PROJECTS,
  SAMPLE_SCOPE,
  WINS,
  seedConversations,
  seedTeam,
} from "../data/seed";
import { generateTasks, respond } from "../lib/intake";
import { defaultPrefs, defaultProfiles, effectiveUser, seedNotifications } from "../lib/profile";
import { currentPermission, showOSNotification } from "../lib/notifications";
import * as repo from "../data/repo";

const PRI_ORDER: Priority[] = ["low", "med", "high"];
const MAX_NOTIFS = 40;

interface StoreState {
  // ui / shell
  currentUserId: number;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  accountSheetOpen: boolean;
  openProfileId: number | null;
  notifOpen: boolean;
  showRevenue: boolean;
  toast: string | null;

  // profiles / prefs / notifications
  profiles: Record<number, Profile>;
  prefs: Record<number, Prefs>;
  notifications: NotifItem[];
  notifPermission: NotificationPermission;

  // shared data (one source of truth; synced via repo when Supabase is on)
  projects: Project[];
  keys: VaultKey[];
  activity: AuditEntry[];
  files: ProjectFile[];
  wins: Win[];
  hydrated: boolean;

  // projects filters
  fStatus: string;
  fBuilder: string;
  fStack: string;

  // tasks
  tasks: Task[];
  boardProj: string;
  dragId: string | null;
  dragOver: ColKey | null;
  editingId: string | null;
  editText: string;
  composerCol: ColKey | null;
  composerText: string;
  openTaskId: string | null;
  colLabels: ColLabels;
  editingCol: ColKey | null;
  editColText: string;

  // vault
  revealed: Record<string, boolean>;
  auditOpen: boolean;

  // chat (ask ai)
  chat: ChatMessage[];
  chatInput: string;

  // team
  activeConvo: string;
  teamInput: string;
  teamMsgs: Record<string, TeamMessage[]>;
  conversations: Conversation[];

  // content pipeline
  content: ContentItem[];
  contentDragId: string | null;
  contentDragOver: string | null;
  openContentId: string | null;
  contentComposerLane: string | null;
  contentComposerText: string;

  // intake
  intakeText: string;
  draftTasks: DraftTask[] | null;
  intakeBusy: boolean;

  // actions
  setCurrentUser: (id: number) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  openMobileNav: () => void;
  closeMobileNav: () => void;
  openAccountSheet: () => void;
  closeAccountSheet: () => void;
  openProfile: (id: number) => void;
  closeProfile: () => void;
  toggleNotif: () => void;
  setShowRevenue: (v: boolean) => void;
  showToast: (msg: string) => void;
  clearToast: () => void;
  copy: (text: string, label: string) => void;

  // profile / prefs / notifications
  updateProfile: (id: number, patch: Partial<Profile>) => void;
  setAvatar: (id: number, url: string | null) => void;
  updatePrefs: (id: number, patch: Partial<Prefs>) => void;
  setNotifPermission: (p: NotificationPermission) => void;
  pushNotification: (n: Omit<NotifItem, "id" | "read" | "time">) => void;
  markAllNotifsRead: () => void;
  clearNotifs: () => void;

  // data sync + activity
  hydrate: () => Promise<void>;
  logActivity: (action: string, target: string, proj: string) => void;

  // projects
  addProject: (input: { client: string; tagline?: string; stack?: string[]; status?: ProjectStatus }) => string;
  updateProject: (id: string, patch: Partial<Project>) => void;
  setProjectImage: (id: string, url: string | null) => void;
  deleteProject: (id: string) => void;

  // vault keys
  addKey: (input: { label: string; val: string; proj: string }) => void;
  updateKey: (id: string, patch: Partial<VaultKey>) => void;
  deleteKey: (id: string) => void;

  // project files
  addFile: (f: ProjectFile) => void;
  deleteFile: (f: ProjectFile) => void;

  // wins
  addWin: (input: { title: string; who: number; tag: string; amount: string; proj: string; note: string }) => void;
  updateWin: (id: string, patch: Partial<Win>) => void;
  deleteWin: (id: string) => void;

  setFilter: (group: "status" | "builder" | "stack", val: string) => void;
  setBoardProj: (val: string) => void;

  // task actions
  setDragId: (id: string | null) => void;
  setDragOver: (col: ColKey | null) => void;
  dropOnCol: (col: ColKey) => void;
  startEdit: (id: string) => void;
  setEditText: (v: string) => void;
  saveEdit: () => void;
  cancelEdit: () => void;
  openComposer: (col: ColKey) => void;
  setComposerText: (v: string) => void;
  saveComposer: () => void;
  closeComposer: () => void;
  addTask: (input: { title: string; proj: string; col?: ColKey; who?: number; pri?: Priority }) => void;
  openTask: (id: string) => void;
  closeTask: () => void;
  patchTask: (id: string, patch: Partial<Task>) => void;
  cyclePri: (id: string) => void;
  cycleAssignTask: (id: string) => void;
  deleteTask: (id: string) => void;
  startEditCol: (col: ColKey) => void;
  setEditColText: (v: string) => void;
  saveEditCol: () => void;
  cancelEditCol: () => void;

  // vault actions
  reveal: (id: string) => void;
  hide: (id: string) => void;
  copyEnv: () => void;
  openAudit: () => void;
  closeAudit: () => void;

  // chat actions
  setChatInput: (v: string) => void;
  sendChat: () => void;
  ask: (t: string) => void;

  // team actions
  selectConvo: (id: string) => void;
  setTeamInput: (v: string) => void;
  teamSend: () => void;
  createConversation: (input: { name: string; members: number[]; proj?: string; guests?: string[] }) => string;
  renameConversation: (id: string, name: string) => void;
  setConversationMembers: (id: string, members: number[]) => void;
  setConversationProject: (id: string, proj: string | undefined) => void;
  addGuest: (id: string, contact: string) => void;
  removeGuest: (id: string, contact: string) => void;
  deleteConversation: (id: string) => void;
  receiveTeamMessage: (convoId: string, who: number, text: string) => void;

  // content actions
  setContentDragId: (id: string | null) => void;
  setContentDragOver: (lane: string | null) => void;
  dropContentOnLane: (lane: string) => void;
  openContentComposer: (lane: string) => void;
  setContentComposerText: (v: string) => void;
  saveContentComposer: () => void;
  closeContentComposer: () => void;
  addContent: (input: { title: string; lane: string; kind?: string; who?: number }) => void;
  openContent: (id: string) => void;
  closeContent: () => void;
  patchContent: (id: string, patch: Partial<ContentItem>) => void;
  cycleContentAssignee: (id: string) => void;
  deleteContent: (id: string) => void;

  // intake actions
  setIntakeText: (v: string) => void;
  fillSample: () => void;
  analyzeIntake: () => void;
  cycleAssignee: (i: number) => void;
  clearDraft: () => void;
  addDrafts: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
let intakeTimer: ReturnType<typeof setTimeout> | undefined;
const revealTimers: Record<string, ReturnType<typeof setTimeout>> = {};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      currentUserId: 0,
      sidebarCollapsed: false,
      mobileNavOpen: false,
      accountSheetOpen: false,
      openProfileId: null,
      notifOpen: false,
      showRevenue: true,
      toast: null,

      profiles: defaultProfiles(),
      prefs: defaultPrefs(),
      notifications: seedNotifications(),
      notifPermission: currentPermission(),

      projects: PROJECTS.map((p) => ({ ...p })),
      keys: KEYS.map((k) => ({ ...k })),
      activity: AUDIT.map((a) => ({ ...a })),
      files: [],
      wins: WINS.map((w) => ({ ...w })),
      hydrated: false,

      fStatus: "all",
      fBuilder: "all",
      fStack: "all",

      tasks: BASE_TASKS.map((t) => ({ ...t })),
      boardProj: "all",
      dragId: null,
      dragOver: null,
      editingId: null,
      editText: "",
      composerCol: null,
      composerText: "",
      openTaskId: null,
      colLabels: { build: "build", qa: "qa", ship: "ship", done: "done" },
      editingCol: null,
      editColText: "",

      revealed: {},
      auditOpen: false,

      chat: [{ role: "ai", text: INITIAL_CHAT_GREETING }],
      chatInput: "",

      activeConvo: "general",
      teamInput: "",
      teamMsgs: seedTeam(),
      conversations: seedConversations(),

      content: CONTENT.map((c) => ({ ...c })),
      contentDragId: null,
      contentDragOver: null,
      openContentId: null,
      contentComposerLane: null,
      contentComposerText: "",

      intakeText: "",
      draftTasks: null,
      intakeBusy: false,

      setCurrentUser: (id) => set({ currentUserId: id }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      openMobileNav: () => set({ mobileNavOpen: true }),
      closeMobileNav: () => set({ mobileNavOpen: false }),
      openAccountSheet: () => set({ accountSheetOpen: true }),
      closeAccountSheet: () => set({ accountSheetOpen: false }),
      openProfile: (id) => set({ openProfileId: id, accountSheetOpen: false }),
      closeProfile: () => set({ openProfileId: null }),
      toggleNotif: () => set((s) => ({ notifOpen: !s.notifOpen })),
      setShowRevenue: (v) => set({ showRevenue: v }),

      showToast: (msg) => {
        clearTimeout(toastTimer);
        set({ toast: msg });
        toastTimer = setTimeout(() => set({ toast: null }), 1700);
      },
      clearToast: () => set({ toast: null }),
      copy: (text, label) => {
        try {
          if (navigator.clipboard) navigator.clipboard.writeText(text);
        } catch {
          /* noop */
        }
        get().showToast(label);
      },

      updateProfile: (id, patch) =>
        set((s) => ({ profiles: { ...s.profiles, [id]: { ...s.profiles[id], ...patch } } })),
      setAvatar: (id, url) =>
        set((s) => ({ profiles: { ...s.profiles, [id]: { ...s.profiles[id], avatarUrl: url } } })),
      updatePrefs: (id, patch) =>
        set((s) => ({ prefs: { ...s.prefs, [id]: { ...s.prefs[id], ...patch } } })),
      setNotifPermission: (p) => set({ notifPermission: p }),
      pushNotification: (n) =>
        set((s) => ({
          notifications: [
            { ...n, id: "n" + Date.now() + Math.random().toString(36).slice(2, 6), read: false, time: "now" },
            ...s.notifications,
          ].slice(0, MAX_NOTIFS),
        })),
      markAllNotifsRead: () =>
        set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
      clearNotifs: () => set({ notifications: [] }),

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

      logActivity: (action, target, proj) => {
        const entry: AuditEntry = {
          id: "act" + Date.now() + Math.random().toString(36).slice(2, 5),
          who: get().currentUserId,
          action,
          target,
          time: "now",
          proj,
        };
        set((s) => ({ activity: [entry, ...s.activity].slice(0, 80) }));
        repo.addActivity(entry).catch(() => {});
      },

      addProject: (input) => {
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
      updateProject: (id, patch) => {
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
        const updated = get().projects.find((p) => p.id === id);
        if (updated) repo.saveProject(updated).catch(() => {});
      },
      setProjectImage: (id, url) => {
        get().updateProject(id, { imageUrl: url });
      },
      deleteProject: (id) => {
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          tasks: s.tasks.filter((t) => t.proj !== id),
          keys: s.keys.filter((k) => k.proj !== id),
          files: s.files.filter((f) => f.proj !== id),
        }));
        repo.removeProject(id).catch(() => {});
        get().showToast("project deleted");
      },

      addKey: (input) => {
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
      updateKey: (id, patch) => {
        set((s) => ({ keys: s.keys.map((k) => (k.id === id ? { ...k, ...patch } : k)) }));
        const updated = get().keys.find((k) => k.id === id);
        if (updated) repo.saveKey(updated).catch(() => {});
      },
      deleteKey: (id) => {
        const k = get().keys.find((x) => x.id === id);
        set((s) => ({ keys: s.keys.filter((x) => x.id !== id) }));
        repo.removeKey(id).catch(() => {});
        if (k) get().logActivity("removed", k.label, k.proj);
      },

      addFile: (f) => {
        set((s) => ({ files: s.files.concat(f) }));
        repo.saveFileMeta(f).catch(() => {});
        get().logActivity("uploaded", f.name, f.proj);
      },
      deleteFile: (f) => {
        set((s) => ({ files: s.files.filter((x) => x.id !== f.id) }));
        repo.removeFile(f).catch(() => {});
        get().logActivity("deleted file", f.name, f.proj);
      },

      addWin: (input) => {
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
      updateWin: (id, patch) => {
        set((s) => ({ wins: s.wins.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
        const updated = get().wins.find((w) => w.id === id);
        if (updated) repo.saveWin(updated).catch(() => {});
      },
      deleteWin: (id) => {
        set((s) => ({ wins: s.wins.filter((w) => w.id !== id) }));
        repo.removeWin(id).catch(() => {});
        get().showToast("win removed");
      },

      setFilter: (group, val) => {
        const map = { status: "fStatus", builder: "fBuilder", stack: "fStack" } as const;
        set({ [map[group]]: val } as Partial<StoreState>);
      },
      setBoardProj: (val) => set({ boardProj: val }),

      setDragId: (id) => set({ dragId: id }),
      setDragOver: (col) => set((s) => (s.dragOver === col ? {} : { dragOver: col })),
      dropOnCol: (col) => {
        const id = get().dragId;
        if (id) {
          set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, col } : t)) }));
          const moved = get().tasks.find((t) => t.id === id);
          if (moved) repo.saveTask(moved).catch(() => {});
        }
        set({ dragId: null, dragOver: null });
      },
      startEdit: (id) => {
        const t = get().tasks.find((x) => x.id === id);
        set({ editingId: id, editText: t ? t.title : "" });
      },
      setEditText: (v) => set({ editText: v }),
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
          if (edited) repo.saveTask(edited).catch(() => {});
        } else {
          set({ editingId: null, editText: "" });
        }
      },
      cancelEdit: () => set({ editingId: null, editText: "" }),
      openComposer: (col) => set({ composerCol: col, composerText: "" }),
      setComposerText: (v) => set({ composerText: v }),
      saveComposer: () => {
        const { composerCol, composerText, boardProj, projects } = get();
        const v = (composerText || "").trim();
        if (composerCol && v) {
          const proj = boardProj !== "all" ? boardProj : projects[0]?.id ?? "unassigned";
          get().addTask({ title: v, proj, col: composerCol });
          set({ composerText: "" });
        }
      },
      closeComposer: () => set({ composerCol: null, composerText: "" }),
      addTask: (input) => {
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
        repo.saveTask(task).catch(() => {});
        get().showToast("task added");
      },
      openTask: (id) => set({ openTaskId: id, editingId: null }),
      closeTask: () => set({ openTaskId: null }),
      patchTask: (id, patch) => {
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
        const updated = get().tasks.find((t) => t.id === id);
        if (updated) repo.saveTask(updated).catch(() => {});
      },
      cyclePri: (id) => {
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const i = (PRI_ORDER.indexOf(t.pri) + 1) % 3;
            return { ...t, pri: PRI_ORDER[i] };
          }),
        }));
        const t = get().tasks.find((x) => x.id === id);
        if (t) repo.saveTask(t).catch(() => {});
      },
      cycleAssignTask: (id) => {
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, who: (t.who + 1) % 3 } : t)) }));
        const t = get().tasks.find((x) => x.id === id);
        if (t) repo.saveTask(t).catch(() => {});
      },
      deleteTask: (id) => {
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id), openTaskId: null }));
        repo.removeTask(id).catch(() => {});
        get().showToast("task deleted");
      },
      startEditCol: (col) => set((s) => ({ editingCol: col, editColText: s.colLabels[col] })),
      setEditColText: (v) => set({ editColText: v }),
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

      reveal: (id) => {
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
      hide: (id) => {
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

      setChatInput: (v) => set({ chatInput: v }),
      sendChat: () => {
        const t = (get().chatInput || "").trim();
        if (!t) return;
        set((s) => ({ chat: s.chat.concat([{ role: "me", text: t }]), chatInput: "" }));
        const reply = respond(t);
        setTimeout(() => {
          set((s) => ({ chat: s.chat.concat([{ role: "ai", text: reply, fresh: true }]) }));
        }, 650);
      },
      ask: (t) => {
        set({ chatInput: t });
        get().sendChat();
      },

      selectConvo: (id) => set({ activeConvo: id }),
      setTeamInput: (v) => set({ teamInput: v }),
      teamSend: () => {
        const t = (get().teamInput || "").trim();
        if (!t) return;
        const { activeConvo, currentUserId } = get();
        set((s) => {
          const msgs = { ...s.teamMsgs };
          msgs[activeConvo] = (msgs[activeConvo] || []).concat([{ who: currentUserId, text: t, time: "now" }]);
          return { teamMsgs: msgs, teamInput: "" };
        });
      },
      createConversation: ({ name, members, proj, guests }) => {
        const id = "c" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
        const convo: Conversation = {
          id,
          type: "channel",
          name: (name || "untitled").trim().toLowerCase(),
          proj,
          members: members.length ? members : [get().currentUserId],
          guests: guests ?? [],
        };
        set((s) => ({ conversations: s.conversations.concat([convo]), activeConvo: id }));
        get().showToast("group chat created");
        return id;
      },
      renameConversation: (id, name) =>
        set((s) => ({
          conversations: s.conversations.map((c) => (c.id === id ? { ...c, name: name.trim().toLowerCase() || c.name } : c)),
        })),
      setConversationMembers: (id, members) =>
        set((s) => ({
          conversations: s.conversations.map((c) => (c.id === id ? { ...c, members } : c)),
        })),
      setConversationProject: (id, proj) =>
        set((s) => ({
          conversations: s.conversations.map((c) => (c.id === id ? { ...c, proj } : c)),
        })),
      addGuest: (id, contact) => {
        const v = contact.trim();
        if (!v) return;
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id && !c.guests.includes(v) ? { ...c, guests: c.guests.concat([v]) } : c,
          ),
        }));
        get().showToast("guest invited · " + v);
      },
      removeGuest: (id, contact) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, guests: c.guests.filter((g) => g !== contact) } : c,
          ),
        })),
      deleteConversation: (id) => {
        const convo = get().conversations.find((c) => c.id === id);
        if (!convo || convo.system) return;
        set((s) => {
          const msgs = { ...s.teamMsgs };
          delete msgs[id];
          return {
            conversations: s.conversations.filter((c) => c.id !== id),
            teamMsgs: msgs,
            activeConvo: s.activeConvo === id ? "general" : s.activeConvo,
          };
        });
        get().showToast("group chat deleted");
      },
      receiveTeamMessage: (convoId, who, text) => {
        set((s) => {
          const msgs = { ...s.teamMsgs };
          msgs[convoId] = (msgs[convoId] || []).concat([{ who, text, time: "now" }]);
          return { teamMsgs: msgs };
        });
        const st = get();
        if (who === st.currentUserId) return;
        const convo = st.conversations.find((c) => c.id === convoId);
        const label = convo ? "#" + convo.name : "team chat";
        const sender = effectiveUser(who, st.profiles).name;
        st.pushNotification({ dot: "#8A84F0", title: sender, body: label + ": " + text, category: "mentions" });
        const prefs = st.prefs[st.currentUserId];
        if (prefs?.pushEnabled && prefs.mentions && st.notifPermission === "granted") {
          showOSNotification(sender, label + ": " + text, "msg-" + convoId);
        }
      },

      setContentDragId: (id) => set({ contentDragId: id }),
      setContentDragOver: (lane) => set((s) => (s.contentDragOver === lane ? {} : { contentDragOver: lane })),
      dropContentOnLane: (lane) => {
        const id = get().contentDragId;
        if (id) set((s) => ({ content: s.content.map((c) => (c.id === id ? { ...c, lane } : c)) }));
        set({ contentDragId: null, contentDragOver: null });
      },
      openContentComposer: (lane) => set({ contentComposerLane: lane, contentComposerText: "" }),
      setContentComposerText: (v) => set({ contentComposerText: v }),
      saveContentComposer: () => {
        const { contentComposerLane, contentComposerText } = get();
        const v = (contentComposerText || "").trim();
        if (contentComposerLane && v) {
          get().addContent({ title: v, lane: contentComposerLane });
          set({ contentComposerText: "" });
        }
      },
      closeContentComposer: () => set({ contentComposerLane: null, contentComposerText: "" }),
      addContent: (input) => {
        const item: ContentItem = {
          id: "c" + Date.now() + Math.random().toString(36).slice(2, 5),
          lane: input.lane,
          title: input.title.trim(),
          kind: (input.kind || "post").trim() || "post",
          who: input.who ?? get().currentUserId,
        };
        set((s) => ({ content: s.content.concat(item) }));
        get().showToast("content added");
      },
      openContent: (id) => set({ openContentId: id }),
      closeContent: () => set({ openContentId: null }),
      patchContent: (id, patch) =>
        set((s) => ({ content: s.content.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      cycleContentAssignee: (id) =>
        set((s) => ({ content: s.content.map((c) => (c.id === id ? { ...c, who: (c.who + 1) % 3 } : c)) })),
      deleteContent: (id) => {
        set((s) => ({ content: s.content.filter((c) => c.id !== id), openContentId: null }));
        get().showToast("content deleted");
      },

      setIntakeText: (v) => set({ intakeText: v }),
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
      cycleAssignee: (i) =>
        set((s) => {
          if (!s.draftTasks) return {};
          const d = s.draftTasks.map((t) => ({ ...t }));
          d[i].who = (d[i].who + 1) % 3;
          return { draftTasks: d };
        }),
      clearDraft: () => set({ draftTasks: null }),
      addDrafts: () => {
        const d = get().draftTasks || [];
        if (!d.length) return;
        const proj = get().projects[0]?.id ?? "unassigned";
        const nw: Task[] = d.map((t) => ({
          id: t.id,
          title: t.title,
          col: "build",
          who: t.who,
          pri: t.pri,
          blocked: false,
          proj,
          notes: "",
        }));
        set((s) => ({ tasks: s.tasks.concat(nw), draftTasks: null, intakeText: "" }));
        nw.forEach((t) => repo.saveTask(t).catch(() => {}));
        get().showToast("added " + d.length + " tasks · assigned evenly");
      },
    }),
    {
      name: "synthos-os-v2",
      partialize: (s) => ({
        currentUserId: s.currentUserId,
        showRevenue: s.showRevenue,
        profiles: s.profiles,
        prefs: s.prefs,
        notifications: s.notifications,
        projects: s.projects,
        keys: s.keys,
        activity: s.activity,
        files: s.files,
        wins: s.wins,
        tasks: s.tasks,
        colLabels: s.colLabels,
        conversations: s.conversations,
        teamMsgs: s.teamMsgs,
        content: s.content,
      }),
    }
  )
);
