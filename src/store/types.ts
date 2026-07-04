import type {
  AuditEntry,
  ChatMessage,
  ColKey,
  ColLabels,
  ContentItem,
  ContentLane,
  Conversation,
  DraftTask,
  MessageAttachment,
  NotifCategory,
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

// Full store contract. State and actions are implemented in domain slices
// (src/store/slices/*) and combined in useStore.ts.

export interface StoreState {
  // ui / shell
  currentUserId: number;
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  accountSheetOpen: boolean;
  openProfileId: number | null;
  notifOpen: boolean;
  showRevenue: boolean;
  toast: string | null;
  syncError: string | null;

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
  contentDragOver: ContentLane | null;
  openContentId: string | null;
  contentComposerLane: ContentLane | null;
  contentComposerText: string;

  // intake
  intakeText: string;
  draftTasks: DraftTask[] | null;
  intakeBusy: boolean;

  // ui / shell actions
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
  syncCatch: (context: string) => (err: unknown) => void;
  dismissSyncError: () => void;
  copy: (text: string, label: string) => void;

  // profile / prefs / notifications
  updateProfile: (id: number, patch: Partial<Profile>) => void;
  setAvatar: (id: number, url: string | null) => void;
  syncProfile: (id: number) => void;
  updatePrefs: (id: number, patch: Partial<Prefs>) => void;
  setNotifPermission: (p: NotificationPermission) => void;
  pushNotification: (n: Omit<NotifItem, "id" | "read" | "time" | "at">) => void;
  notifyCategory: (
    category: NotifCategory,
    n: { dot: string; title: string; body: string; tag?: string; url?: string },
  ) => void;
  markAllNotifsRead: () => void;
  clearNotifs: () => void;

  // data sync + activity
  hydrate: () => Promise<void>;
  startRealtime: () => void;
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
  notifyAssigned: (id: string) => void;
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
  teamSend: (attachments?: MessageAttachment[]) => void;
  toggleReaction: (convoId: string, index: number, emoji: string) => void;
  createConversation: (input: { name: string; members: number[]; proj?: string; guests?: string[] }) => string;
  renameConversation: (id: string, name: string) => void;
  setConversationMembers: (id: string, members: number[]) => void;
  setConversationProject: (id: string, proj: string | undefined) => void;
  addGuest: (id: string, contact: string) => void;
  removeGuest: (id: string, contact: string) => void;
  syncConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  receiveTeamMessage: (convoId: string, msg: TeamMessage) => void;

  // content actions
  setContentDragId: (id: string | null) => void;
  setContentDragOver: (lane: ContentLane | null) => void;
  dropContentOnLane: (lane: ContentLane) => void;
  openContentComposer: (lane: ContentLane) => void;
  setContentComposerText: (v: string) => void;
  saveContentComposer: () => void;
  closeContentComposer: () => void;
  addContent: (input: { title: string; lane: ContentLane; kind?: string; who?: number }) => void;
  openContent: (id: string) => void;
  closeContent: () => void;
  patchContent: (id: string, patch: Partial<ContentItem>) => void;
  cycleContentAssignee: (id: string) => void;
  syncContent: (id: string) => void;
  deleteContent: (id: string) => void;

  // intake actions
  setIntakeText: (v: string) => void;
  fillSample: () => void;
  analyzeIntake: () => void;
  cycleAssignee: (i: number) => void;
  clearDraft: () => void;
  addDrafts: () => void;
}

// Loose set/get signatures shared by all slice creators. The combined object
// in useStore.ts is checked structurally against StoreState, so a slice that
// drifts from the contract fails to compile there.
export type StoreSet = (partial: Partial<StoreState> | ((s: StoreState) => Partial<StoreState>)) => void;
export type StoreGet = () => StoreState;
