import type { CSSProperties } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eyebrow } from "../components/Eyebrow";
import { Avatar } from "../components/Avatar";
import { Icon } from "../lib/Icon";
import { COLS } from "../lib/board";
import { SM, filterPill, priDot } from "../lib/style";
import { useIsMobile } from "../lib/useMediaQuery";
import { useStore } from "../store/useStore";
import type { ColKey, Task } from "../types";

function TaskCard({ task }: { task: Task }) {
  const navigate = useNavigate();
  const editingId = useStore((s) => s.editingId);
  const editText = useStore((s) => s.editText);
  const dragId = useStore((s) => s.dragId);
  const projExists = useStore((s) => s.projects.some((p) => p.id === task.proj));
  const projName = useStore((s) => s.projects.find((p) => p.id === task.proj)?.client ?? (task.proj || "unassigned"));
  const startEdit = useStore((s) => s.startEdit);
  const setEditText = useStore((s) => s.setEditText);
  const saveEdit = useStore((s) => s.saveEdit);
  const cancelEdit = useStore((s) => s.cancelEdit);
  const setDragId = useStore((s) => s.setDragId);
  const setDragOver = useStore((s) => s.setDragOver);
  const openTask = useStore((s) => s.openTask);

  const editing = editingId === task.id;
  const hasNotes = !!(task.notes && task.notes.trim());

  return (
    <div
      draggable
      onDragStart={(e) => {
        setDragId(task.id);
        try {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", task.id);
        } catch {
          /* noop */
        }
      }}
      onDragEnd={() => {
        setDragId(null);
        setDragOver(null);
      }}
      onClick={() => openTask(task.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openTask(task.id);
        }
      }}
      className="hov-task"
      style={{
        background: "var(--card)",
        border: "1px solid rgba(var(--ink-rgb),.06)",
        borderRadius: 14,
        padding: 13,
        boxShadow: "var(--shadow-task)",
        cursor: "pointer",
        opacity: dragId === task.id ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
        <span style={{ ...priDot(task.pri), marginTop: 6 }} />
        {editing ? (
          <input
            autoFocus
            value={editText}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                saveEdit();
              } else if (e.key === "Escape") {
                cancelEdit();
              }
            }}
            onBlur={saveEdit}
            style={{ flex: 1, minWidth: 0, border: "1px solid rgba(96,200,255,.55)", borderRadius: 7, padding: "4px 7px", fontSize: 13.5, fontWeight: 500, fontFamily: "inherit", lineHeight: 1.35, color: "var(--ink)" }}
          />
        ) : (
          <span
            className="hov-rename"
            title="click to rename"
            onClick={(e) => {
              e.stopPropagation();
              startEdit(task.id);
            }}
            style={{ fontSize: 13.5, lineHeight: 1.35, fontWeight: 500, flex: 1 }}
          >
            {task.title}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          <span
            className={projExists ? "hov-rename" : undefined}
            title={projExists ? "go to " + projName : "no project — assign one from the card"}
            onClick={(e) => {
              if (!projExists) return;
              e.stopPropagation();
              navigate("/project/" + task.proj);
            }}
            style={{ fontSize: 10.5, color: projExists ? "rgba(var(--ink-rgb),.5)" : "rgba(var(--ink-rgb),.32)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", cursor: projExists ? "pointer" : "default", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130 }}
          >
            {projName}
          </span>
          {task.blocked && (
            <span style={{ fontSize: 10, fontWeight: 600, color: "#B5462A", background: "rgba(255,150,120,.18)", padding: "2px 7px", borderRadius: 6 }}>blocked</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {hasNotes && (
            <span style={{ display: "flex", color: "rgba(var(--ink-rgb),.55)" }}>
              <Icon name="note" size={13} sw={1.6} />
            </span>
          )}
          <Avatar id={task.who} size={24} />
        </div>
      </div>
    </div>
  );
}

function Column({ colKey, accent, isMobile }: { colKey: ColKey; accent: (typeof SM)[keyof typeof SM]; isMobile: boolean }) {
  const tasks = useStore((s) => s.tasks);
  const boardProj = useStore((s) => s.boardProj);
  const colLabels = useStore((s) => s.colLabels);
  const editingCol = useStore((s) => s.editingCol);
  const editColText = useStore((s) => s.editColText);
  const dragOver = useStore((s) => s.dragOver);
  const composerCol = useStore((s) => s.composerCol);
  const composerText = useStore((s) => s.composerText);

  const startEditCol = useStore((s) => s.startEditCol);
  const setEditColText = useStore((s) => s.setEditColText);
  const saveEditCol = useStore((s) => s.saveEditCol);
  const cancelEditCol = useStore((s) => s.cancelEditCol);
  const setDragOver = useStore((s) => s.setDragOver);
  const dropOnCol = useStore((s) => s.dropOnCol);
  const openComposer = useStore((s) => s.openComposer);
  const setComposerText = useStore((s) => s.setComposerText);
  const saveComposer = useStore((s) => s.saveComposer);
  const closeComposer = useStore((s) => s.closeComposer);

  // null = follow default (open when the column has cards); otherwise an explicit toggle
  const [collapsed, setCollapsed] = useState<boolean | null>(null);

  const items = tasks.filter((t) => t.col === colKey && (boardProj === "all" || t.proj === boardProj));
  const colEditing = editingCol === colKey;
  const composerOpen = composerCol === colKey;
  const isOver = dragOver === colKey;
  const open = !isMobile || (collapsed === null ? items.length > 0 : !collapsed);

  const containerStyle: CSSProperties = {
    background: "rgba(var(--ink-rgb),.025)",
    borderRadius: 18,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    border: isOver ? "1.5px solid rgba(96,200,255,.55)" : "1.5px solid transparent",
    transition: "border-color .15s",
    ...(isMobile ? { width: "100%" } : { flex: "0 0 270px", minWidth: 270 }),
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(colKey);
      }}
      onDrop={(e) => {
        e.preventDefault();
        dropOnCol(colKey);
      }}
      style={containerStyle}
    >
      {isMobile ? (
        <button
          onClick={() => setCollapsed(open)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 2px", background: "transparent", border: "none", width: "100%", textAlign: "left", fontFamily: "inherit" }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: accent.dot, flex: "0 0 auto" }} />
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.01em" }}>{colLabels[colKey]}</span>
          <span style={{ fontSize: 12, color: "rgba(var(--ink-rgb),.55)", fontWeight: 600, background: "var(--card)", borderRadius: 999, padding: "1px 8px" }}>{items.length}</span>
          <span style={{ marginLeft: "auto", display: "flex", transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .18s", color: "rgba(var(--ink-rgb),.55)" }}>
            <Icon name="chevron" size={18} sw={2} />
          </span>
        </button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px 2px" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: accent.dot, flex: "0 0 auto" }} />
          {colEditing ? (
            <input
              autoFocus
              value={editColText}
              onChange={(e) => setEditColText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveEditCol();
                } else if (e.key === "Escape") {
                  cancelEditCol();
                }
              }}
              onBlur={saveEditCol}
              style={{ flex: 1, minWidth: 0, border: "1px solid rgba(96,200,255,.55)", borderRadius: 7, padding: "2px 7px", fontSize: 13.5, fontWeight: 700, letterSpacing: "-.01em", fontFamily: "inherit", color: "var(--ink)" }}
            />
          ) : (
            <span
              className="hov-rename"
              title="click to rename column"
              onClick={() => startEditCol(colKey)}
              style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: "-.01em", cursor: "text" }}
            >
              {colLabels[colKey]}
            </span>
          )}
          <span style={{ fontSize: 12, color: "rgba(var(--ink-rgb),.55)", fontWeight: 600, background: "var(--card)", borderRadius: 999, padding: "1px 8px", flex: "0 0 auto" }}>{items.length}</span>
        </div>
      )}

      {open && items.map((t) => (
        <TaskCard key={t.id} task={t} />
      ))}

      {open && (composerOpen ? (
        <div style={{ background: "var(--card)", border: "1px solid rgba(96,200,255,.5)", borderRadius: 14, padding: 11, boxShadow: "0 8px 22px -14px rgba(11,15,25,.3)" }}>
          <textarea
            autoFocus
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                saveComposer();
              } else if (e.key === "Escape") {
                closeComposer();
              }
            }}
            rows={2}
            placeholder="new task title… (enter to add)"
            style={{ width: "100%", border: "none", resize: "none", fontSize: 13.5, lineHeight: 1.4, fontFamily: "inherit", color: "var(--ink)", background: "transparent" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 4 }}>
            <button onClick={closeComposer} style={{ background: "transparent", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 12.5, fontWeight: 600, color: "rgba(var(--ink-rgb),.5)", fontFamily: "inherit" }}>cancel</button>
            <button onClick={saveComposer} style={{ background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 8, padding: "5px 13px", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit" }}>add</button>
          </div>
        </div>
      ) : (
        <button
          className="hov-dashed"
          onClick={() => openComposer(colKey)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", border: "1px dashed rgba(var(--ink-rgb),.16)", background: "transparent", borderRadius: 11, padding: "9px 11px", fontSize: 12.5, fontWeight: 600, color: "rgba(var(--ink-rgb),.5)", fontFamily: "inherit" }}
        >
          <Icon name="plus" size={14} sw={2} /> add task
        </button>
      ))}
    </div>
  );
}

export function Tasks() {
  const isMobile = useIsMobile();
  const projects = useStore((s) => s.projects);
  const boardProj = useStore((s) => s.boardProj);
  const setBoardProj = useStore((s) => s.setBoardProj);
  const boardEmpty = useStore((s) => !s.tasks.some((t) => boardProj === "all" || t.proj === boardProj));

  return (
    <div className="anim-sc">
      <Eyebrow index="02" label="flow" />
      <h1 style={{ margin: "0 0 4px", fontSize: isMobile ? 21 : 30, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.1 }}>
        tasks, <i style={{ fontWeight: 600 }}>build to ship</i>
      </h1>
      <p style={{ margin: "0 0 16px", fontSize: 14, color: "rgba(var(--ink-rgb),.5)" }}>
        {isMobile ? "tap a card to open & move it" : "drag to move · click a card to open"}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", fontWeight: 600 }}>project</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, background: "rgba(var(--ink-rgb),.04)", borderRadius: 10, padding: 3 }}>
          <button onClick={() => setBoardProj("all")} style={filterPill(boardProj === "all")}>all</button>
          {projects.map((p) => (
            <button key={p.id} onClick={() => setBoardProj(p.id)} style={filterPill(boardProj === p.id)}>{p.client}</button>
          ))}
        </div>
      </div>

      {boardEmpty && (
        <div style={{ background: "var(--card)", border: "1px dashed rgba(var(--ink-rgb),.14)", borderRadius: 16, padding: "26px 20px", textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>the board is clear ✦</div>
          <div style={{ fontSize: 13, color: "rgba(var(--ink-rgb),.55)" }}>
            add a task with the + in any lane, or paste a scope into intake to draft a batch.
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 10 : 14,
          overflowX: isMobile ? "visible" : "auto",
          paddingBottom: 10,
          alignItems: isMobile ? "stretch" : "flex-start",
        }}
      >
        {COLS.map((c) => (
          <Column key={c.key} colKey={c.key} accent={SM[c.accent]} isMobile={isMobile} />
        ))}
      </div>
    </div>
  );
}
