export type StatusKey = "sky" | "mint" | "blush" | "lav";
export type Priority = "low" | "med" | "high";
export type ProjectStatus = "in progress" | "blocked" | "in qa" | "shipped";
export type ColKey = "build" | "qa" | "ship" | "done";

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
  time: string;
  proj: string;
}

export interface ContentItem {
  id: string;
  lane: string;
  title: string;
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
  who: number;
  text: string;
  time: string;
  attachments?: MessageAttachment[];
  reactions?: Record<string, number[]>;
}

export interface Conversation {
  id: string;
  type: "channel";
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
  status: string;
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
  time: string;
  read: boolean;
  category: NotifCategory;
}
