import { useEffect, useState, type CSSProperties } from "react";
import { USERS } from "../data/seed";
import { useStore } from "../store/useStore";
import { Avatar } from "./Avatar";
import { ResponsiveModal } from "./ResponsiveModal";
import type { Win } from "../types";

const TAGS = ["shipped", "milestone", "performance", "kudos", "revenue", "launch"];

const field: CSSProperties = {
  width: "100%",
  border: "1px solid rgba(11,15,25,.1)",
  borderRadius: 12,
  padding: "11px 13px",
  fontSize: 16,
  fontFamily: "inherit",
  color: "#0B0F19",
  boxSizing: "border-box",
};
const labelStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "rgba(11,15,25,.45)",
  fontWeight: 700,
  display: "block",
  marginBottom: 7,
};

export function WinFormModal({ open, onClose, win }: { open: boolean; onClose: () => void; win?: Win | null }) {
  const projects = useStore((s) => s.projects);
  const currentUserId = useStore((s) => s.currentUserId);
  const addWin = useStore((s) => s.addWin);
  const updateWin = useStore((s) => s.updateWin);

  const [title, setTitle] = useState("");
  const [who, setWho] = useState(currentUserId);
  const [tag, setTag] = useState("shipped");
  const [amount, setAmount] = useState("");
  const [proj, setProj] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(win?.title ?? "");
    setWho(win?.who ?? currentUserId);
    setTag(win?.tag ?? "shipped");
    setAmount(win?.amount ?? "");
    setProj(win?.proj ?? "");
    setNote(win?.note ?? "");
  }, [open, win, currentUserId]);

  const save = () => {
    if (!title.trim()) return;
    if (win) updateWin(win.id, { title: title.trim(), who, tag: tag.trim(), amount: amount.trim(), proj, note: note.trim() });
    else addWin({ title, who, tag, amount, proj, note });
    onClose();
  };

  return (
    <ResponsiveModal open={open} onClose={onClose} title={win ? "edit win" : "log a win"} width={470}>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>what happened</label>
        <textarea autoFocus value={title} onChange={(e) => setTitle(e.target.value)} rows={2} placeholder="e.g. shipped the new headless store" style={{ ...field, resize: "none", lineHeight: 1.4 }} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>who</label>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {USERS.map((u) => {
            const on = who === u.id;
            return (
              <button key={u.id} onClick={() => setWho(u.id)} style={{ display: "flex", alignItems: "center", gap: 7, border: on ? "1px solid rgba(96,200,255,.55)" : "1px solid rgba(11,15,25,.08)", background: on ? "rgba(96,200,255,.12)" : "#fff", padding: "4px 12px 4px 4px", borderRadius: 999, fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#0B0F19" }}>
                <Avatar id={u.id} size={26} />
                {u.first}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>category</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TAGS.map((t) => {
            const on = tag === t;
            return (
              <button key={t} onClick={() => setTag(t)} style={{ border: on ? "1px solid rgba(47,193,151,.6)" : "1px solid rgba(11,15,25,.1)", background: on ? "rgba(126,230,193,.2)" : "#fff", color: "#0B0F19", fontSize: 13, fontWeight: 600, padding: "6px 12px", borderRadius: 999, fontFamily: "inherit" }}>
                {t}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 140px" }}>
          <label style={labelStyle}>amount (optional)</label>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$22k" style={field} />
        </div>
        <div style={{ flex: "1 1 160px" }}>
          <label style={labelStyle}>project (optional)</label>
          <select value={proj} onChange={(e) => setProj(e.target.value)} style={field}>
            <option value="">none</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.client}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>note (optional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="9-day build · design · infra…" style={field} />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(11,15,25,.1)", borderRadius: 11, padding: "10px 16px", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>cancel</button>
        <button onClick={save} disabled={!title.trim()} style={{ background: "#0B0F19", color: "#fff", border: "none", borderRadius: 11, padding: "10px 18px", fontSize: 14, fontWeight: 600, fontFamily: "inherit", opacity: title.trim() ? 1 : 0.5 }}>
          {win ? "save win" : "log win ✦"}
        </button>
      </div>
    </ResponsiveModal>
  );
}
