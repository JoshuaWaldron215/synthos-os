import { FILES_BUCKET, getSupabase, isSupabaseConfigured } from "../lib/supabase";
import { deleteBlob, getBlob, putBlob } from "../lib/fileStore";
import type { AuditEntry, Project, ProjectFile, Task, VaultKey, Win } from "../types";

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
  proj: string;
  notes: string | null;
}
const toTask = (r: TaskRow): Task => ({
  id: r.id,
  title: r.title,
  col: r.col,
  who: r.who,
  pri: r.pri,
  blocked: r.blocked,
  proj: r.proj,
  notes: r.notes ?? "",
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
  proj: w.proj,
  note: w.note,
  created_at: w.createdAt,
});

// ---- reads ------------------------------------------------------------------

export async function fetchAll(): Promise<Dataset | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  const [projects, tasks, keys, activity, files, wins] = await Promise.all([
    sb.from("projects").select("*"),
    sb.from("tasks").select("*"),
    sb.from("vault_keys").select("*"),
    sb.from("activity").select("*"),
    sb.from("project_files").select("*"),
    sb.from("wins").select("*"),
  ]);
  return {
    projects: ((projects.data ?? []) as ProjectRow[]).map(toProject),
    tasks: ((tasks.data ?? []) as TaskRow[]).map(toTask),
    keys: (keys.data ?? []) as VaultKey[],
    activity: (activity.data ?? []) as AuditEntry[],
    files: ((files.data ?? []) as FileRow[]).map(toFile),
    wins: ((wins.data ?? []) as WinRow[]).map(toWin),
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
export async function saveTask(t: Task): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("tasks").upsert(t);
}
export async function removeTask(id: string): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("tasks").delete().eq("id", id);
}
export async function saveKey(k: VaultKey): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  await sb.from("vault_keys").upsert(k);
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
