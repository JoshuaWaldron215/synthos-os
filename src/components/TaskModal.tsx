import { useState } from "react";
import { Icon } from "../lib/Icon";
import { COLS } from "../lib/board";
import { SM, priDot, priTint } from "../lib/style";
import { useDraft } from "../lib/useDraft";
import { useUser } from "../lib/useUser";
import { useStore } from "../store/useStore";
import type { Task } from "../types";
import { Avatar } from "./Avatar";
import { ConfirmDialog } from "./ConfirmDialog";
import { ResponsiveModal } from "./ResponsiveModal";

export function TaskModal() {
  const openTaskId = useStore((s) => s.openTaskId);
  const task = useStore((s) => s.tasks.find((x) => x.id === s.openTaskId));
  if (!openTaskId || !task) return null;
  // key by id so drafts reset when a different task is opened in-place
  return <TaskModalInner key={task.id} t={task} />;
}

function TaskModalInner({ t }: { t: Task }) {
  const projects = useStore((s) => s.projects);
  const colLabels = useStore((s) => s.colLabels);
  const closeTask = useStore((s) => s.closeTask);
  const patchTask = useStore((s) => s.patchTask);
  const cyclePri = useStore((s) => s.cyclePri);
  const cycleAssignTask = useStore((s) => s.cycleAssignTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const assignee = useUser(t.who);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const title = useDraft(t.title, (v) => patchTask(t.id, { title: v }));
  const notes = useDraft(t.notes, (v) => patchTask(t.id, { notes: v }));

  const colDef = COLS.find((c) => c.key === t.col) || COLS[0];
  const accent = SM[colDef.accent];
  const priLabel = t.pri === "high" ? "high priority" : t.pri === "med" ? "medium priority" : "low priority";
  const tint = priTint(t.pri);
  const projKnown = projects.some((p) => p.id === t.proj);

  return (
    <ResponsiveModal open onClose={closeTask} width={480} showHandle>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: accent.dot }} />
          <span style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", fontWeight: 600 }}>{colLabels[t.col]}</span>
        </div>
        <button onClick={closeTask} aria-label="close" style={{ display: "flex", background: "transparent", border: "none", padding: 2 }}>
          <Icon name="close" size={18} sw={1.8} color="rgba(var(--ink-rgb),.5)" />
        </button>
      </div>

      <textarea
        value={title.draft}
        onChange={(e) => title.onChange(e.target.value)}
        onBlur={title.flush}
        rows={2}
        placeholder="task title…"
        style={{ width: "100%", border: "none", resize: "none", fontSize: 19, fontWeight: 700, letterSpacing: "-.012em", lineHeight: 1.25, fontFamily: "inherit", color: "var(--ink)", background: "transparent", marginBottom: 4, padding: 0 }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0 18px" }}>
        <button onClick={() => cyclePri(t.id)} title="cycle priority" style={{ display: "flex", alignItems: "center", gap: 7, background: tint.bg, border: "none", borderRadius: 999, padding: "6px 13px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: tint.fg }}>
          <span style={priDot(t.pri)} />
          {priLabel}
        </button>
        <button onClick={() => cycleAssignTask(t.id)} title="reassign" style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(var(--ink-rgb),.04)", border: "none", borderRadius: 999, padding: "4px 12px 4px 4px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
          <Avatar id={t.who} size={28} />
          {assignee.name}
        </button>
        <button
          onClick={() => patchTask(t.id, { blocked: !t.blocked })}
          style={{ display: "flex", alignItems: "center", gap: 6, background: t.blocked ? "rgba(255,150,120,.18)" : "rgba(var(--ink-rgb),.04)", border: "none", borderRadius: 999, padding: "6px 13px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: t.blocked ? "#B5462A" : "rgba(var(--ink-rgb),.5)" }}
        >
          {t.blocked ? "blocked" : "mark blocked"}
        </button>
      </div>

      <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", fontWeight: 600, marginBottom: 8 }}>move to</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {COLS.map((c) => {
          const active = c.key === t.col;
          return (
            <button
              key={c.key}
              onClick={() => patchTask(t.id, { col: c.key })}
              style={{ display: "flex", alignItems: "center", gap: 6, border: active ? "1px solid rgba(96,200,255,.55)" : "1px solid rgba(var(--ink-rgb),.1)", background: active ? "rgba(96,200,255,.12)" : "var(--card)", borderRadius: 999, padding: "6px 12px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: SM[c.accent].dot }} />
              {colLabels[c.key]}
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", fontWeight: 600, marginBottom: 8 }}>project</div>
      <select
        value={t.proj}
        onChange={(e) => patchTask(t.id, { proj: e.target.value })}
        style={{ width: "100%", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 12, padding: "10px 12px", fontSize: 16, fontFamily: "inherit", color: "var(--ink)", marginBottom: 18, background: "var(--card)" }}
      >
        <option value="">no project</option>
        {!projKnown && t.proj !== "" && <option value={t.proj}>{t.proj}</option>}
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.client}</option>
        ))}
      </select>

      <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", fontWeight: 600, marginBottom: 8 }}>notes</div>
      <textarea
        value={notes.draft}
        onChange={(e) => notes.onChange(e.target.value)}
        onBlur={notes.flush}
        rows={4}
        placeholder="add notes, context, links…"
        style={{ width: "100%", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 13, padding: 12, fontSize: 16, lineHeight: 1.55, resize: "vertical", minHeight: 96, fontFamily: "inherit", color: "var(--ink)" }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 16 }}>
        <button onClick={() => setConfirmDelete(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", fontSize: 13, fontWeight: 600, color: "#B5462A", fontFamily: "inherit", padding: "6px 2px" }}>
          <Icon name="trash" size={16} sw={1.7} color="#B5462A" /> delete task
        </button>
        <button onClick={closeTask} style={{ background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>
          done
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="delete task"
        body={'"' + t.title + '" will be removed from the board.'}
        onConfirm={() => deleteTask(t.id)}
        onClose={() => setConfirmDelete(false)}
      />
    </ResponsiveModal>
  );
}
