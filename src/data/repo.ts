import { FILES_BUCKET, isSupabaseConfigured, supabase } from "../lib/supabase";
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

/* eslint-disable @typescript-eslint/no-explicit-any */
const toProject = (r: any): Project => ({
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
const fromProject = (p: Project) => ({
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

const toTask = (r: any): Task => ({
  id: r.id,
  title: r.title,
  col: r.col,
  who: r.who,
  pri: r.pri,
  blocked: r.blocked,
  proj: r.proj,
  notes: r.notes ?? "",
});

const toFile = (r: any): ProjectFile => ({
  id: r.id,
  proj: r.proj,
  name: r.name,
  kind: r.kind,
  size: r.size,
  path: r.path,
  who: r.who,
  createdAt: r.created_at,
});
const fromFile = (f: ProjectFile) => ({
  id: f.id,
  proj: f.proj,
  name: f.name,
  kind: f.kind,
  size: f.size,
  path: f.path,
  who: f.who,
  created_at: f.createdAt,
});

const toWin = (r: any): Win => ({
  id: r.id,
  who: r.who,
  title: r.title,
  tag: r.tag ?? "",
  amount: r.amount ?? "",
  proj: r.proj ?? "",
  note: r.note ?? "",
  createdAt: r.created_at,
});
const fromWin = (w: Win) => ({
  id: w.id,
  who: w.who,
  title: w.title,
  tag: w.tag,
  amount: w.amount,
  proj: w.proj,
  note: w.note,
  created_at: w.createdAt,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---- reads ------------------------------------------------------------------

export async function fetchAll(): Promise<Dataset | null> {
  if (!supabase) return null;
  const [projects, tasks, keys, activity, files, wins] = await Promise.all([
    supabase.from("projects").select("*"),
    supabase.from("tasks").select("*"),
    supabase.from("vault_keys").select("*"),
    supabase.from("activity").select("*"),
    supabase.from("project_files").select("*"),
    supabase.from("wins").select("*"),
  ]);
  return {
    projects: (projects.data ?? []).map(toProject),
    tasks: (tasks.data ?? []).map(toTask),
    keys: (keys.data ?? []) as VaultKey[],
    activity: (activity.data ?? []) as AuditEntry[],
    files: (files.data ?? []).map(toFile),
    wins: (wins.data ?? []).map(toWin),
  };
}

// ---- writes (no-ops in local mode) -----------------------------------------

export async function saveProject(p: Project): Promise<void> {
  if (!supabase) return;
  await supabase.from("projects").upsert(fromProject(p));
}
export async function removeProject(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("projects").delete().eq("id", id);
}
export async function saveTask(t: Task): Promise<void> {
  if (!supabase) return;
  await supabase.from("tasks").upsert(t);
}
export async function removeTask(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("tasks").delete().eq("id", id);
}
export async function saveKey(k: VaultKey): Promise<void> {
  if (!supabase) return;
  await supabase.from("vault_keys").upsert(k);
}
export async function removeKey(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("vault_keys").delete().eq("id", id);
}
export async function addActivity(a: AuditEntry): Promise<void> {
  if (!supabase) return;
  await supabase.from("activity").insert(a);
}
export async function saveWin(w: Win): Promise<void> {
  if (!supabase) return;
  await supabase.from("wins").upsert(fromWin(w));
}
export async function removeWin(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.from("wins").delete().eq("id", id);
}

// ---- files (Supabase Storage, IndexedDB fallback) ---------------------------

export async function uploadFileBlob(proj: string, id: string, file: File): Promise<string> {
  const path = `${proj}/${id}-${file.name}`;
  if (!supabase) {
    await putBlob(path, file);
    return path;
  }
  await supabase.storage.from(FILES_BUCKET).upload(path, file, { upsert: true });
  return path;
}

export async function saveFileMeta(f: ProjectFile): Promise<void> {
  if (!supabase) return;
  await supabase.from("project_files").insert(fromFile(f));
}

export async function fileObjectUrl(path: string): Promise<string | null> {
  if (!supabase) {
    const blob = await getBlob(path);
    return blob ? URL.createObjectURL(blob) : null;
  }
  const { data } = await supabase.storage.from(FILES_BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function removeFile(f: ProjectFile): Promise<void> {
  if (!supabase) {
    await deleteBlob(f.path);
    return;
  }
  await Promise.all([
    supabase.storage.from(FILES_BUCKET).remove([f.path]),
    supabase.from("project_files").delete().eq("id", f.id),
  ]);
}
