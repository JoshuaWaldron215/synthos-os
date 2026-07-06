export type StatusKey = "sky" | "mint" | "blush" | "lav";
export type Priority = "low" | "med" | "high";
export type ProjectStatus = "in progress" | "blocked" | "in qa" | "shipped";
export type ColKey = "build" | "qa" | "ship" | "done";
export type ContentLane = "idea" | "scripting" | "filming" | "editing" | "scheduled" | "posted";
export type UserStatus = "online" | "focusing" | "away";

export interface User {
  id: number;
  name: string;
  first: string;
  initials: string;
  role: string;
  tone: string;
}

export interface ProjectLink {
  id: string;
  label: string;
  url: string;
}

export interface Project {
  id: string;
  client: string;
  tagline: string;
  description: string;
  status: ProjectStatus;
  health: StatusKey;
  open: number;
  builders: number[];
  rev: string;
  earned: string;
  stack: string[];
  links: ProjectLink[];
  imageUrl: string | null;
}

export interface ProjectFile {
  id: string;
  proj: string;
  name: string;
  kind: string;
  size: number;
  path: string;
  who: number;
  createdAt: number;
}

export interface Task {
  id: string;
  title: string;
  col: ColKey;
  who: number;
  pri: Priority;
  blocked: boolean;
  proj: string;
  notes: string;
  /** optional deadline, epoch ms */
  due?: number | null;
  /** when the task landed in "done" — drives the board's auto-archive */
  doneAt?: number | null;
  /** files attached to the task (blobs live in Storage, like chat attachments) */
  attachments?: MessageAttachment[];
}

export interface VaultKey {
  id: string;
  label: string;
  val: string;
  proj: string;
}

export interface AuditEntry {
  id: string;
  who: number;
  action: string;
  target: string;
  /** legacy display string kept for entries persisted before real timestamps */
  time?: string;
  at?: number;
  proj: string;
}

export interface ContentItem {
  id: string;
  lane: ContentLane;
  title: string;
  /** free-form: one of CONTENT_KINDS or a custom format typed by the user */
  kind: string;
  who: number;
}

export interface Win {
  id: string;
  who: number;
  title: string;
  tag: string;
  amount: string;
  proj: string;
  note: string;
  createdAt: number;
}

export type LeadSource = "outbound" | "inbound" | "referral" | "other";
export type LeadQuality = "cold" | "warm" | "hot";
export type LeadStatus = "new" | "contacted" | "call booked" | "proposal" | "won" | "lost";

export interface Lead {
  id: string;
  name: string;
  /** email / phone / handle — wherever the conversation lives */
  contact: string;
  from: LeadSource;
  quality: LeadQuality;
  status: LeadStatus;
  notes: string;
  lastFollowUp: number | null;
  nextFollowUp: number | null;
  who: number;
  createdAt: number;
}

export interface DraftTask {
  id: string;
  title: string;
  who: number;
  pri: Priority;
}

export interface ChatMessage {
  role: "me" | "ai";
  text: string;
  fresh?: boolean;
}

export interface MessageAttachment {
  id: string;
  name: string;
  kind: string;
  size: number;
  path: string;
  image: boolean;
}

export interface TeamMessage {
  /** stable id for sync/dedupe; absent on messages persisted before shared chat */
  id?: string;
  who: number;
  text: string;
  /** legacy display string kept for messages persisted before real timestamps */
  time?: string;
  at?: number;
  attachments?: MessageAttachment[];
  reactions?: Record<string, number[]>;
}

export interface Conversation {
  id: string;
  /** dm rows exist server-side with canonical pair ids (dm-<lo>-<hi>) */
  type: "channel" | "dm";
  name: string;
  proj?: string;
  members: number[];
  guests: string[];
  system?: boolean;
}

export type ColLabels = Record<ColKey, string>;

export interface Profile {
  name: string;
  username: string;
  role: string;
  email: string;
  github: string;
  bio: string;
  avatarUrl: string | null;
  status: UserStatus;
}

export interface Prefs {
  pushEnabled: boolean;
  mentions: boolean;
  taskAssigned: boolean;
  shipped: boolean;
  content: boolean;
  sound: boolean;
}

export type NotifCategory = "mentions" | "taskAssigned" | "shipped" | "content";

export interface NotifItem {
  id: string;
  dot: string;
  title: string;
  body: string;
  /** legacy display string kept for items persisted before real timestamps */
  time?: string;
  at?: number;
  read: boolean;
  category: NotifCategory;
  /** in-app destination when tapped (e.g. /tasks) */
  url?: string;
}
