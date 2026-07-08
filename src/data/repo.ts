import { FILES_BUCKET, getSupabase, isSupabaseConfigured } from "../lib/supabase";
import { deleteBlob, getBlob, putBlob } from "../lib/fileStore";
import type {
  AuditEntry,
  ContentItem,
  Conversation,
  Lead,
  MessageAttachment,
  Profile,
  Project,
  ProjectFile,
  Task,
  TeamMessage,
  VaultKey,
  Win,
} from "../types";

// The repo is the single seam between the app and its backend. Components and
// the store never touch Supabase directly. In local mode every read returns
// null (the store keeps its own persisted state) and every write is a no-op,
// so the app is fully usable without credentials. When VITE_SUPABASE_* are
// set, the same calls hit Postgres + Storage so the whole team shares state.

export interface Dataset {
  projects: Project[];
  tasks: Task[];
  keys: VaultKey[];
  activity: AuditEntry[];
  files: ProjectFile[];
  wins: Win[];
  conversations: Conversation[];
  teamMsgs: Record<string, TeamMessage[]>;
  content: ContentItem[];
  leads: Lead[];
  /** per-builder profile fields that have been saved to the server */
  profiles: Record<number, Partial<Profile>>;
  /** shared workspace settings (e.g. kanban column labels), keyed by name */
  settings: Record<string, unknown>;
  /** deleted-record markers, "tbl:id" — stale local copies must not resurrect */
  tombstones: Set<string>;
}

export const usingSupabase = isSupabaseConfigured;

// ---- row <-> model mappers (Postgres uses snake_case) -----------------------

interface ProjectRow {
  id: string;
  client: string;
  tagline: string | null;
  description: string | null;
  status: Project["status"];
  health: Project["health"];
  open: number | null;
  builders: number[] | null;
  rev: string | null;
  earned: string | null;
  stack: string[] | null;
  links: Project["links"] | null;
  image_url: string | null;
}
const toProject = (r: ProjectRow): Project => ({
  id: r.id,
  client: r.client,
  tagline: r.tagline ?? "",
  description: r.description ?? "",
  status: r.status,
  health: r.health,
  open: r.open ?? 0,
  builders: r.builders ?? [],
  rev: r.rev ?? "",
  earned: r.earned ?? "",
  stack: r.stack ?? [],
  links: r.links ?? [],
  imageUrl: r.image_url ?? null,
});
const fromProject = (p: Project): ProjectRow => ({
  id: p.id,
  client: p.client,
  tagline: p.tagline,
  description: p.description,
  status: p.status,
  health: p.health,
  open: p.open,
  builders: p.builders,
  rev: p.rev,
  earned: p.earned,
  stack: p.stack,
  links: p.links,
  image_url: p.imageUrl,
});

interface TaskRow {
  id: string;
  title: string;
  col: Task["col"];
  who: number;
  pri: Task["pri"];
  blocked: boolean;
  proj: string | null;
  notes: string | null;
  due: number | null;
  done_at: number | null;
  attachments: MessageAttachment[] | null;
}
const toTask = (r: TaskRow): Task => ({
  id: r.id,
  title: r.title,
  col: r.col,
  who: r.who,
  pri: r.pri,
  blocked: r.blocked,
  proj: r.proj ?? "",
  notes: r.notes ?? "",
  due: r.due,
  doneAt: r.done_at,
  attachments: r.attachments?.length ? r.attachments : undefined,
});
const fromTask = (t: Task): TaskRow => ({
  id: t.id,
  title: t.title,
  col: t.col,
  who: t.who,
  pri: t.pri,
  blocked: t.blocked,
  // "" means unassigned in the app; the column's FK needs null instead
  proj: t.proj || null,
  notes: t.notes,
  due: t.due ?? null,
  done_at: t.doneAt ?? null,
  attachments: t.attachments?.length ? t.attachments : null,
});

interface FileRow {
  id: string;
  proj: string;
  name: string;
  kind: string;
  size: number;
  path: string;
  who: number;
  created_at: number;
}
const toFile = (r: FileRow): ProjectFile => ({
  id: r.id,
  proj: r.proj,
  name: r.name,
  kind: r.kind,
  size: r.size,
  path: r.path,
  who: r.who,
  createdAt: r.created_at,
});
const fromFile = (f: ProjectFile): FileRow => ({
  id: f.id,
  proj: f.proj,
  name: f.name,
  kind: f.kind,
  size: f.size,
  path: f.path,
  who: f.who,
  created_at: f.createdAt,
});

interface WinRow {
  id: string;
  who: number;
  title: string;
  tag: string | null;
  amount: string | null;
  proj: string | null;
  note: string | null;
  created_at: number;
}
const toWin = (r: WinRow): Win => ({
  id: r.id,
  who: r.who,
  title: r.title,
  tag: r.tag ?? "",
  amount: r.amount ?? "",
  proj: r.proj ?? "",
  note: r.note ?? "",
  createdAt: r.created_at,
});
const fromWin = (w: Win): WinRow => ({
  id: w.id,
  who: w.who,
  title: w.title,
  tag: w.tag,
  amount: w.amount,
  // "" means "no project" in the app; the FK column needs null, else the
  // whole insert is rejected and the win never leaves the author's device
  proj: w.proj || null,
  note: w.note,
  created_at: w.createdAt,
});

interface ConvoRow {
  id: string;
  type: string;
  name: string;
  proj: string | null;
  members: number[] | null;
  guests: string[] | null;
  system: boolean;
}
const toConvo = (r: ConvoRow): Conversation => ({
  id: r.id,
  type: r.type === "dm" ? "dm" : "channel",
  name: r.name,
  proj: r.proj ?? undefined,
  members: r.members ?? [],
  guests: r.guests ?? [],
  system: r.system || undefined,
});
const fromConvo = (c: Conversation): ConvoRow => ({
  id: c.id,
  type: c.type,
  name: c.name,
  proj: c.proj ?? null,
  members: c.members,
  guests: c.guests,
  system: !!c.system,
});

interface MessageRow {
  id: string;
  convo: string;
  who: number;
  text: string;
  at: number | null;
  attachments: MessageAttachment[] | null;
  reactions: Record<string, number[]> | null;
}
const toMessage = (r: MessageRow): TeamMessage => {
  const m: TeamMessage = { id: r.id, who: r.who, text: r.text, at: r.at ?? undefined };
  if (r.attachments?.length) m.attachments = r.attachments;
  if (r.reactions && Object.keys(r.reactions).length) m.reactions = r.reactions;
  return m;
};
const fromMessage = (convo: string, m: TeamMessage, id: string): MessageRow => ({
  id,
  convo,
  who: m.who,
  text: m.text,
  at: m.at ?? null,
  attachments: m.attachments ?? null,
  reactions: m.reactions ?? null,
});

interface ContentRow {
  id: string;
  lane: ContentItem["lane"];
  title: string;
  kind: string;
  who: number;
}
const toContent = (r: ContentRow): ContentItem => ({
  id: r.id,
  lane: r.lane,
  title: r.title,
  kind: r.kind,
  who: r.who,
});
const fromContent = (c: ContentItem): ContentRow => ({
  id: c.id,
  lane: c.lane,
  title: c.title,
  kind: c.kind,
  who: c.who,
});

interface LeadRow {
  id: string;
  name: string;
  contact: string | null;
  source: Lead["from"];
  quality: Lead["quality"];
  status: Lead["status"];
  notes: string | null;
  last_follow_up: number | null;
  next_follow_up: number | null;
  who: number;
  created_at: number;
}
const toLead = (r: LeadRow): Lead => ({
  id: r.id,
  name: r.name,
  contact: r.contact ?? "",
  from: r.source,
  quality: r.quality,
  status: r.status,
  notes: r.notes ?? "",
  lastFollowUp: r.last_follow_up,
  nextFollowUp: r.next_follow_up,
  who: r.who,
  createdAt: r.created_at,
});
const fromLead = (l: Lead): LeadRow => ({
  id: l.id,
  name: l.name,
  contact: l.contact,
  source: l.from,
  quality: l.quality,
  status: l.status,
  notes: l.notes,
  last_follow_up: l.lastFollowUp,
  next_follow_up: l.nextFollowUp,
  who: l.who,
  created_at: l.createdAt,
});

interface ProfileRow {
  builder_id: number | null;
  name: string | null;
  role: string | null;
  email: string | null;
  avatar_url: string | null;
  status: string | null;
  username: string | null;
  github: string | null;
  bio: string | null;
}
// Empty/null server fields are "never saved" — the local defaults win, so a
// freshly-provisioned backend doesn't blank out seeded roles and usernames.
const toProfilePatch = (r: ProfileRow): Partial<Profile> => {
  const p: Partial<Profile> = {};
  if (r.name) p.name = r.name;
  if (r.username) p.username = r.username;
  if (r.role) p.role = r.role;
  if (r.email) p.email = r.email;
  if (r.github) p.github = r.github;
  if (r.bio) p.bio = r.bio;
  if (r.avatar_url) p.avatarUrl = r.avatar_url;
  if (r.status) p.status = r.status as Profile["status"];
  return p;
};

// ---- reads ------------------------------------------------------------------

export async function fetchAll(): Promise<Dataset | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const [projects, tasks, keys, activity, files, wins, convos, messages, content, profiles, leads, settings, tombstones] = await Promise.all([
    sb.from("projects").select("*"),
    sb.from("tasks").select("*"),
    sb.rpc("vault_keys_list"),
    sb.from("activity").select("*"),
    sb.from("project_files").select("*"),
    sb.from("wins").select("*"),
    sb.from("conversations").select("*"),
    sb.from("messages").select("*").order("at", { ascending: true }),
    sb.from("content_items").select("*"),
    sb.from("profiles").select("*"),
    sb.from("leads").select("*"),
    sb.from("workspace_settings").select("*"),
    sb.from("tombstones").select("tbl,id"),
  ]);
  const teamMsgs: Record<string, TeamMessage[]> = {};
  for (const r of (messages.data ?? []) as MessageRow[]) {
    (teamMsgs[r.convo] ??= []).push(toMessage(r));
  }
  const profilePatches: Record<number, Partial<Profile>> = {};
  for (const r of (profiles.data ?? []) as ProfileRow[]) {
    if (r.builder_id !== null) profilePatches[r.builder_id] = toProfilePatch(r);
  }
  return {
    projects: ((projects.data ?? []) as ProjectRow[]).map(toProject),
    tasks: ((tasks.data ?? []) as TaskRow[]).map(toTask),
    keys: (keys.data ?? []) as VaultKey[],
    activity: (activity.data ?? []) as AuditEntry[],
    files: ((files.data ?? []) as FileRow[]).map(toFile),
    wins: ((wins.data ?? []) as WinRow[]).map(toWin),
    conversations: ((convos.data ?? []) as ConvoRow[]).map(toConvo),
    teamMsgs,
    content: ((content.data ?? []) as ContentRow[]).map(toContent),
    leads: ((leads.data ?? []) as LeadRow[]).map(toLead),
    profiles: profilePatches,
    settings: Object.fromEntries(
      (((settings.data ?? []) as SettingRow[])).map((r) => [r.key, r.value]),
    ),
    tombstones: new Set(
      (((tombstones.data ?? []) as Array<{ tbl: string; id: string }>)).map((r) => r.tbl + ":" + r.id),
    ),
  };
}

// ---- writes (no-ops in local mode) -----------------------------------------

export async function saveProject(p: Project): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("projects").upsert(fromProject(p));
}
export async function removeProject(id: string): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("projects").delete().eq("id", id);
}
export async function saveSetting(key: string, value: unknown): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("workspace_settings").upsert({ key, value });
}
export async function saveTask(t: Task): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("tasks").upsert(fromTask(t));
}
export async function removeTask(id: string): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("tasks").delete().eq("id", id);
}
// Vault secrets are encrypted at rest: reads/writes go through security-
// definer RPCs (pgcrypto; the symmetric key lives in Supabase Vault). Never
// select or upsert vault_keys directly — the table only holds ciphertext.
export async function saveKey(k: VaultKey): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  const { error } = await sb.rpc("vault_key_save", { p_id: k.id, p_label: k.label, p_val: k.val, p_proj: k.proj });
  if (error) throw error;
}
export async function fetchVaultKeys(): Promise<VaultKey[] | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("vault_keys_list");
  if (error) throw error;
  return (data ?? []) as VaultKey[];
}
export async function removeKey(id: string): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("vault_keys").delete().eq("id", id);
}
export async function addActivity(a: AuditEntry): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("activity").insert(a);
}
export async function saveWin(w: Win): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("wins").upsert(fromWin(w));
}
export async function removeWin(id: string): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("wins").delete().eq("id", id);
}

export async function saveConversation(c: Conversation): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("conversations").upsert(fromConvo(c));
}
export async function removeConversation(id: string): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  // messages cascade server-side
  await sb.from("conversations").delete().eq("id", id);
}
export async function saveMessage(convo: string, m: TeamMessage): Promise<void> {
  if (!m.id) return; // legacy local messages predate shared chat
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("messages").upsert(fromMessage(convo, m, m.id));
}
export async function saveContent(c: ContentItem): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("content_items").upsert(fromContent(c));
}
export async function removeContent(id: string): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("content_items").delete().eq("id", id);
}
export async function saveLead(l: Lead): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("leads").upsert(fromLead(l));
}
export async function removeLead(id: string): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("leads").delete().eq("id", id);
}

export async function saveProfile(builderId: number, p: Profile): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  // rows are provisioned with the auth users; update by the stable builder slot
  await sb
    .from("profiles")
    .update({
      name: p.name,
      username: p.username,
      role: p.role,
      email: p.email,
      github: p.github,
      bio: p.bio,
      avatar_url: p.avatarUrl,
      status: p.status,
    })
    .eq("builder_id", builderId);
}

// ---- realtime ----------------------------------------------------------------

// Callbacks the store wires into its state. "upsert" carries the mapped model;
// "delete" carries the row id (Postgres delete payloads only include the PK).
interface SettingRow {
  key: string;
  value: unknown;
}

export interface RealtimeHandlers {
  project: (ev: "upsert" | "delete", data: Project | string) => void;
  task: (ev: "upsert" | "delete", data: Task | string) => void;
  key: (ev: "delete", data: string) => void;
  /** a vault key was added/edited somewhere — refetch the decrypted list */
  keysChanged: () => void;
  win: (ev: "upsert" | "delete", data: Win | string) => void;
  file: (ev: "upsert" | "delete", data: ProjectFile | string) => void;
  activity: (entry: AuditEntry) => void;
  convo: (ev: "upsert" | "delete", data: Conversation | string) => void;
  message: (convoId: string, msg: TeamMessage) => void;
  messageDeleted: (id: string) => void;
  content: (ev: "upsert" | "delete", data: ContentItem | string) => void;
  lead: (ev: "upsert" | "delete", data: Lead | string) => void;
  profile: (builderId: number, patch: Partial<Profile>) => void;
  setting: (key: string, value: unknown) => void;
}

interface ChangePayload<Row> {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Row;
  old: { id?: string };
}

let liveChannel: { unsubscribe: () => void } | null = null;

// One channel, one postgres_changes listener per synced table. Events are
// idempotent on the store side (upsert-by-id / remove-by-id), so receiving an
// echo of our own optimistic write is harmless.
export async function subscribeRealtime(h: RealtimeHandlers): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  if (liveChannel) liveChannel.unsubscribe(); // e.g. re-hydrate under StrictMode
  const ch = sb.channel("synthos-sync");
  const on = <Row,>(table: string, cb: (e: ChangePayload<Row>) => void) => {
    ch.on(
      "postgres_changes" as never,
      { event: "*", schema: "public", table } as never,
      cb as never,
    );
  };
  const crud = <Row, Model>(mapper: (r: Row) => Model, cb: (ev: "upsert" | "delete", data: Model | string) => void) =>
    (e: ChangePayload<Row>) => {
      if (e.eventType === "DELETE") {
        if (e.old.id) cb("delete", e.old.id);
      } else {
        cb("upsert", mapper(e.new));
      }
    };
  on<ProjectRow>("projects", crud(toProject, h.project));
  on<TaskRow>("tasks", crud(toTask, h.task));
  // vault_keys rows on the wire are ciphertext — deletes apply directly,
  // inserts/updates trigger a decrypted refetch through the RPC
  on<{ id: string }>("vault_keys", (e) => {
    if (e.eventType === "DELETE") {
      if (e.old.id) h.key("delete", e.old.id);
    } else {
      h.keysChanged();
    }
  });
  on<WinRow>("wins", crud(toWin, h.win));
  on<FileRow>("project_files", crud(toFile, h.file));
  on<AuditEntry>("activity", (e) => {
    if (e.eventType !== "DELETE") h.activity({ id: e.new.id, who: e.new.who, action: e.new.action, target: e.new.target, at: e.new.at, proj: e.new.proj });
  });
  on<ConvoRow>("conversations", crud(toConvo, h.convo));
  on<MessageRow>("messages", (e) => {
    if (e.eventType === "DELETE") {
      if (e.old.id) h.messageDeleted(e.old.id);
    } else {
      h.message(e.new.convo, toMessage(e.new));
    }
  });
  on<ContentRow>("content_items", crud(toContent, h.content));
  on<LeadRow>("leads", crud(toLead, h.lead));
  on<ProfileRow>("profiles", (e) => {
    if (e.eventType !== "DELETE" && e.new.builder_id !== null) h.profile(e.new.builder_id, toProfilePatch(e.new));
  });
  on<SettingRow>("workspace_settings", (e) => {
    if (e.eventType !== "DELETE") h.setting(e.new.key, e.new.value);
  });
  ch.subscribe();
  liveChannel = ch;
}

// ---- files (Supabase Storage, IndexedDB fallback) ---------------------------

export async function uploadFileBlob(proj: string, id: string, file: File): Promise<string> {
  const path = `${proj}/${id}-${file.name}`;
  const sb = await getSupabase();
  if (!sb) {
    await putBlob(path, file);
    return path;
  }
  await sb.storage.from(FILES_BUCKET).upload(path, file, { upsert: true });
  return path;
}

export async function saveFileMeta(f: ProjectFile): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("project_files").insert(fromFile(f));
}

export async function fileObjectUrl(path: string): Promise<string | null> {
  const sb = await getSupabase();
  if (!sb) {
    const blob = await getBlob(path);
    return blob ? URL.createObjectURL(blob) : null;
  }
  const { data } = await sb.storage.from(FILES_BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function removeFile(f: ProjectFile): Promise<void> {
  const sb = await getSupabase();
  if (!sb) {
    await deleteBlob(f.path);
    return;
  }
  await Promise.all([
    sb.storage.from(FILES_BUCKET).remove([f.path]),
    sb.from("project_files").delete().eq("id", f.id),
  ]);
}
