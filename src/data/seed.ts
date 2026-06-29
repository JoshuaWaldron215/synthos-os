import type {
  AuditEntry,
  Conversation,
  ContentItem,
  Project,
  Task,
  TeamMessage,
  User,
  VaultKey,
  Win,
} from "../types";

// The Synthos team. Edit display names and usernames in Settings.
export const USERS: User[] = [
  { id: 0, name: "Josh Waldron", first: "Josh", initials: "JW", role: "founder · full-stack", tone: "#0B0F19" },
  { id: 1, name: "Sadeq Wahab", first: "Sadeq", initials: "SW", role: "engineering", tone: "#283149" },
  { id: 2, name: "Aqeel Bacchus", first: "Aqeel", initials: "AB", role: "engineering", tone: "#525a76" },
];

// A real workspace starts empty — the team creates their own projects, tasks,
// keys, wins and content. No demo/mock records are seeded.
export const PROJECTS: Project[] = [];

export const BASE_TASKS: Task[] = [];

export const KEYS: VaultKey[] = [];

export const AUDIT: AuditEntry[] = [];

export const CONTENT: ContentItem[] = [];

export const WINS: Win[] = [];

// An example transcript users can load on the Intake screen to try the
// task generator. It is an explicit sample, not seeded workspace data.
export const SAMPLE_SCOPE =
  "Client call: We need a customer portal where users can log in, view their past orders, and download invoices as PDFs. The whole thing has to match our brand and feel great on mobile. We want Stripe billing with subscriptions, plus an admin dashboard so the team can manage users and refunds. Send an automated email when an order ships. It needs to integrate with our existing Supabase database, and set up row-level security so clients only see their own data. Can we also get a weekly analytics report generated automatically? Launch target is the end of the month, so the checkout flow is the top priority.";

export function seedConversations(): Conversation[] {
  return [
    { id: "general", type: "channel", name: "general", members: [0, 1, 2], guests: [], system: true },
    { id: "builds", type: "channel", name: "builds", members: [0, 1, 2], guests: [], system: true },
    { id: "clients", type: "channel", name: "clients", members: [0, 1, 2], guests: [], system: true },
  ];
}

export function seedTeam(): Record<string, TeamMessage[]> {
  return {};
}

export const INITIAL_CHAT_GREETING =
  "hey — i'm grounded in your projects, tasks and vault. ask me for a standup draft, a blocker summary, or where revenue stands and i'll pull it together.";
