import { useRef, useState } from "react";
import { Avatar } from "./Avatar";
import { Icon } from "../lib/Icon";
import * as repo from "../data/repo";
import { useStore } from "../store/useStore";
import type { ProjectFile } from "../types";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function kindOf(file: File): string {
  if (file.type) return file.type.split("/").pop() || file.type;
  const ext = file.name.split(".").pop();
  return ext ? ext.toLowerCase() : "file";
}

function fmtDate(ms: number): string {
  try {
    return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function ProjectFiles({ projId }: { projId: string }) {
  const allFiles = useStore((s) => s.files);
  const files = allFiles.filter((f) => f.proj === projId);
  const addFile = useStore((s) => s.addFile);
  const deleteFile = useStore((s) => s.deleteFile);
  const currentUserId = useStore((s) => s.currentUserId);
  const showToast = useStore((s) => s.showToast);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const handleFiles = async (list: FileList | null) => {
    if (!list || !list.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(list)) {
        const id = "f" + Date.now() + Math.random().toString(36).slice(2, 6);
        const path = await repo.uploadFileBlob(projId, id, file);
        const meta: ProjectFile = {
          id,
          proj: projId,
          name: file.name,
          kind: kindOf(file),
          size: file.size,
          path,
          who: currentUserId,
          createdAt: Date.now(),
        };
        addFile(meta);
      }
      showToast(list.length > 1 ? list.length + " files uploaded" : "file uploaded");
    } catch {
      showToast("upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const open = async (f: ProjectFile) => {
    const url = await repo.fileObjectUrl(f.path);
    if (url) window.open(url, "_blank", "noopener");
    else showToast("file unavailable");
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: "1.5px dashed " + (drag ? "rgba(96,200,255,.7)" : "rgba(11,15,25,.16)"),
          background: drag ? "rgba(96,200,255,.08)" : "rgba(11,15,25,.015)",
          borderRadius: 16,
          padding: "26px 18px",
          textAlign: "center",
          cursor: "pointer",
          marginBottom: 16,
          transition: "border-color .15s, background .15s",
        }}
      >
        <input ref={inputRef} type="file" multiple onChange={(e) => handleFiles(e.target.files)} style={{ display: "none" }} />
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8, color: "rgba(11,15,25,.45)" }}>
          <Icon name="download" size={22} sw={1.7} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0B0F19" }}>
          {busy ? "uploading…" : "drop files or click to upload"}
        </div>
        <div style={{ fontSize: 12.5, color: "rgba(11,15,25,.45)", marginTop: 3 }}>
          SOPs, scopes, briefs, contracts — anything the team needs
        </div>
      </div>

      {files.length === 0 ? (
        <div style={{ fontSize: 13.5, color: "rgba(11,15,25,.45)", textAlign: "center", padding: "18px 0" }}>
          no files yet.
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid rgba(11,15,25,.06)", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
          {files.map((f) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 16px", borderBottom: "1px solid rgba(11,15,25,.05)" }}>
              <span style={{ display: "flex", width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 10, background: "rgba(11,15,25,.05)", flex: "0 0 auto" }}>
                <Icon name="note" size={18} color="rgba(11,15,25,.55)" />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                <div style={{ fontSize: 12, color: "rgba(11,15,25,.45)", marginTop: 1 }}>
                  {f.kind} · {fmtSize(f.size)} · {fmtDate(f.createdAt)}
                </div>
              </div>
              <Avatar id={f.who} size={24} />
              <button className="hov-soft" onClick={() => open(f)} title="open" style={{ display: "flex", background: "transparent", border: "1px solid rgba(11,15,25,.1)", borderRadius: 9, padding: 8 }}>
                <Icon name="download" size={16} color="rgba(11,15,25,.55)" />
              </button>
              <button
                className="hov-soft"
                onClick={() => deleteFile(f)}
                title="delete"
                style={{ display: "flex", background: "transparent", border: "1px solid rgba(11,15,25,.1)", borderRadius: 9, padding: 8 }}
              >
                <Icon name="trash" size={16} color="rgba(11,15,25,.55)" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
