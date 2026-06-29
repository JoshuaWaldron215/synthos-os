import { Icon } from "../lib/Icon";
import { COLS } from "../lib/board";
import { SM, priDot, priTint } from "../lib/style";
import { useUser } from "../lib/useUser";
import { useStore } from "../store/useStore";
import { Avatar } from "./Avatar";
import { ResponsiveModal } from "./ResponsiveModal";

export function TaskModal() {
  const openTaskId = useStore((s) => s.openTaskId);
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const colLabels = useStore((s) => s.colLabels);
  const closeTask = useStore((s) => s.closeTask);
  const patchTask = useStore((s) => s.patchTask);
  const cyclePri = useStore((s) => s.cyclePri);
  const cycleAssignTask = useStore((s) => s.cycleAssignTask);
  const deleteTask = useStore((s) => s.deleteTask);

  const t = tasks.find((x) => x.id === openTaskId);
  const assignee = useUser(t ? t.who : 0);
  if (!t) return null;

  const colDef = COLS.find((c) => c.key === t.col) || COLS[0];
  const accent = SM[colDef.accent];
  const priLabel = t.pri === "high" ? "high priority" : t.pri === "med" ? "medium priority" : "low priority";
  const tint = priTint(t.pri);

  return (
    <ResponsiveModal open={!!t} onClose={closeTask} width={480} showHandle>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: accent.dot }} />
          <span style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(11,15,25,.4)", fontWeight: 600 }}>{colLabels[t.col]}</span>
        </div>
        <button onClick={closeTask} style={{ display: "flex", background: "transparent", border: "none", padding: 2 }}>
          <Icon name="close" size={18} sw={1.8} color="rgba(11,15,25,.5)" />
        </button>
      </div>

      <textarea
        value={t.title}
        onChange={(e) => patchTask(t.id, { title: e.target.value })}
        rows={2}
        placeholder="task title…"
        style={{ width: "100%", border: "none", resize: "none", fontSize: 19, fontWeight: 700, letterSpacing: "-.012em", lineHeight: 1.25, fontFamily: "inherit", color: "#0B0F19", background: "transparent", marginBottom: 4, padding: 0 }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0 18px" }}>
        <button onClick={() => cyclePri(t.id)} title="cycle priority" style={{ display: "flex", alignItems: "center", gap: 7, background: tint.bg, border: "none", borderRadius: 999, padding: "6px 13px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: tint.fg }}>
          <span style={priDot(t.pri)} />
          {priLabel}
        </button>
        <button onClick={() => cycleAssignTask(t.id)} title="reassign" style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(11,15,25,.04)", border: "none", borderRadius: 999, padding: "4px 12px 4px 4px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: "#0B0F19" }}>
          <Avatar id={t.who} size={28} />
          {assignee.name}
        </button>
        <button
          onClick={() => patchTask(t.id, { blocked: !t.blocked })}
          style={{ display: "flex", alignItems: "center", gap: 6, background: t.blocked ? "rgba(255,150,120,.18)" : "rgba(11,15,25,.04)", border: "none", borderRadius: 999, padding: "6px 13px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: t.blocked ? "#B5462A" : "rgba(11,15,25,.5)" }}
        >
          {t.blocked ? "blocked" : "mark blocked"}
        </button>
      </div>

      <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(11,15,25,.4)", fontWeight: 600, marginBottom: 8 }}>move to</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {COLS.map((c) => {
          const active = c.key === t.col;
          return (
            <button
              key={c.key}
              onClick={() => patchTask(t.id, { col: c.key })}
              style={{ display: "flex", alignItems: "center", gap: 6, border: active ? "1px solid rgba(96,200,255,.55)" : "1px solid rgba(11,15,25,.1)", background: active ? "rgba(96,200,255,.12)" : "#fff", borderRadius: 999, padding: "6px 12px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: "#0B0F19" }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: SM[c.accent].dot }} />
              {colLabels[c.key]}
            </button>
          );
        })}
      </div>

      <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(11,15,25,.4)", fontWeight: 600, marginBottom: 8 }}>project</div>
      <select
        value={t.proj}
        onChange={(e) => patchTask(t.id, { proj: e.target.value })}
        style={{ width: "100%", border: "1px solid rgba(11,15,25,.1)", borderRadius: 12, padding: "10px 12px", fontSize: 16, fontFamily: "inherit", color: "#0B0F19", marginBottom: 18, background: "#fff" }}
      >
        {projects.every((p) => p.id !== t.proj) && <option value={t.proj}>{t.proj}</option>}
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.client}</option>
        ))}
      </select>

      <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(11,15,25,.4)", fontWeight: 600, marginBottom: 8 }}>notes</div>
      <textarea
        value={t.notes}
        onChange={(e) => patchTask(t.id, { notes: e.target.value })}
        rows={4}
        placeholder="add notes, context, links…"
        style={{ width: "100%", border: "1px solid rgba(11,15,25,.1)", borderRadius: 13, padding: 12, fontSize: 16, lineHeight: 1.55, resize: "vertical", minHeight: 96, fontFamily: "inherit", color: "#0B0F19" }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 16 }}>
        <button onClick={() => deleteTask(t.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", fontSize: 13, fontWeight: 600, color: "#B5462A", fontFamily: "inherit", padding: "6px 2px" }}>
          <Icon name="trash" size={16} sw={1.7} color="#B5462A" /> delete task
        </button>
        <button onClick={closeTask} style={{ background: "#0B0F19", color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>
          done
        </button>
      </div>
    </ResponsiveModal>
  );
}
