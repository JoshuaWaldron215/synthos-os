import { persistSnapshot, useStore, type PersistedState, type StoreState } from "../store/useStore";

// JSON backup of the persisted workspace. Primarily a safety net for local
// mode (localStorage is the only copy) and a manual migration path between
// browsers. In shared mode the server remains the source of truth — an import
// restores this device, then hydrate/realtime reconcile with the backend.

const BACKUP_MARKER = "synthos-os-backup";

interface WorkspaceBackup {
  app: typeof BACKUP_MARKER;
  version: 1;
  exportedAt: number;
  data: PersistedState;
}

export function exportWorkspace(): void {
  const backup: WorkspaceBackup = {
    app: BACKUP_MARKER,
    version: 1,
    exportedAt: Date.now(),
    data: persistSnapshot(useStore.getState()),
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `synthos-os-backup-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse + loosely validate a backup file; throws with a friendly message. */
export function parseWorkspaceBackup(text: string): PersistedState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("that file isn't valid JSON");
  }
  const b = parsed as Partial<WorkspaceBackup>;
  if (b?.app !== BACKUP_MARKER || typeof b.data !== "object" || b.data === null) {
    throw new Error("that file isn't a Synthos OS backup");
  }
  return b.data;
}

/** Apply a backup to the store — only keys the persisted shape knows about. */
export function importWorkspace(data: PersistedState): void {
  const allowed = new Set(Object.keys(persistSnapshot(useStore.getState())));
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (allowed.has(k) && v !== undefined && v !== null) patch[k] = v;
  }
  useStore.setState(patch as Partial<StoreState>);
}
