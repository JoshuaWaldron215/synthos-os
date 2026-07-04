import { useRef, useState, type CSSProperties } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ProjectThumb } from "../components/ProjectThumb";
import { ProjectFiles } from "../components/ProjectFiles";
import { Icon } from "../lib/Icon";
import { fileToAvatarDataUrl } from "../lib/image";
import { USERS } from "../data/seed";
import { SM, priDot, statusKey } from "../lib/style";
import { whenLabel } from "../lib/time";
import { useIsMobile } from "../lib/useMediaQuery";
import { useStore } from "../store/useStore";
import { useUser } from "../lib/useUser";
import type { ProjectStatus, VaultKey } from "../types";

type Tab = "overview" | "tasks" | "vault" | "activity" | "files";
const TABS: Tab[] = ["overview", "tasks", "vault", "activity", "files"];
const STATUS: ProjectStatus[] = ["in progress", "in qa", "blocked", "shipped"];

function InlineText({
  value,
  onSave,
  placeholder,
  multiline,
  style,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  style?: CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    setEditing(false);
    const v = draft.trim();
    if (v !== value) onSave(v);
  };

  if (editing) {
    const shared: CSSProperties = {
      width: "100%",
      border: "1px solid rgba(96,200,255,.55)",
      borderRadius: 9,
      padding: "6px 9px",
      fontFamily: "inherit",
      color: "var(--ink)",
      ...style,
    };
    return multiline ? (
      <textarea
        autoFocus
        value={draft}
        rows={4}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditing(false);
        }}
        style={{ ...shared, resize: "vertical", lineHeight: 1.6 }}
      />
    ) : (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") setEditing(false);
        }}
        style={shared}
      />
    );
  }

  return (
    <span
      className="hov-rename"
      title="click to edit"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      style={{ cursor: "text", display: "inline-block", ...style }}
    >
      {value || <span style={{ color: "rgba(var(--ink-rgb),.55)" }}>{placeholder || "click to edit"}</span>}
    </span>
  );
}

const cardStyle: CSSProperties = {
  background: "var(--card)",
  border: "1px solid rgba(var(--ink-rgb),.06)",
  borderRadius: 18,
  padding: 22,
  boxShadow: "var(--shadow-card)",
};
const sectionLabel: CSSProperties = {
  fontSize: 11,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: "rgba(var(--ink-rgb),.55)",
  fontWeight: 600,
  marginBottom: 12,
};

export function ProjectDetail() {
  const { id } = useParams();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const project = useStore((s) => s.projects.find((p) => p.id === id));
  const showRevenue = useStore((s) => s.showRevenue);
  const showToast = useStore((s) => s.showToast);
  const updateProject = useStore((s) => s.updateProject);
  const setProjectImage = useStore((s) => s.setProjectImage);
  const deleteProject = useStore((s) => s.deleteProject);

  // the tab lives in the URL, so back/forward and shared links stay in sync
  const rawTab = params.get("tab") as Tab | null;
  const tab: Tab = rawTab && TABS.includes(rawTab) ? rawTab : "overview";
  const imgInput = useRef<HTMLInputElement>(null);
  const [confirmProjDelete, setConfirmProjDelete] = useState(false);

  const taskCount = useStore((s) => s.tasks.reduce((n, t) => n + (t.proj === id && t.col !== "done" ? 1 : 0), 0));
  const keyCount = useStore((s) => s.keys.reduce((n, k) => n + (k.proj === id ? 1 : 0), 0));
  const fileCount = useStore((s) => s.files.reduce((n, f) => n + (f.proj === id ? 1 : 0), 0));

  if (!project) return <Navigate to="/projects" replace />;
  const pid = project.id;

  const sm = SM[statusKey(project.status)];

  const pickTab = (t: Tab) => {
    params.set("tab", t);
    setParams(params, { replace: true });
  };

  const onImage = async (file?: File) => {
    if (!file) return;
    try {
      const url = await fileToAvatarDataUrl(file, 256);
      setProjectImage(pid, url);
      showToast("project image updated");
    } catch {
      showToast("could not read image");
    }
  };

  const setStatus = (s: ProjectStatus) => updateProject(pid, { status: s, health: statusKey(s) });
  const toggleBuilder = (uid: number) => {
    const has = project.builders.includes(uid);
    updateProject(pid, {
      builders: has ? project.builders.filter((b) => b !== uid) : project.builders.concat(uid),
    });
  };
  const removeTool = (t: string) => updateProject(pid, { stack: project.stack.filter((x) => x !== t) });
  const addTool = (t: string) => {
    const v = t.trim();
    if (v && !project.stack.includes(v)) updateProject(pid, { stack: project.stack.concat(v) });
  };

  // glanceable counts next to the data-bearing tabs
  const tabCounts: Partial<Record<Tab, number>> = { tasks: taskCount, vault: keyCount, files: fileCount };

  const tabBtn = (t: Tab) => {
    const active = tab === t;
    const count = tabCounts[t];
    return (
      <button
        key={t}
        onClick={() => pickTab(t)}
        style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "transparent", padding: "10px 14px", fontSize: 14, fontWeight: 600, fontFamily: "inherit", color: active ? "var(--ink)" : "rgba(var(--ink-rgb),.45)", borderBottom: active ? "2px solid #0B0F19" : "2px solid transparent", marginBottom: -1, whiteSpace: "nowrap" }}
      >
        {t}
        {count !== undefined && count > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: active ? "var(--ink)" : "rgba(var(--ink-rgb),.4)", background: "rgba(var(--ink-rgb),.06)", borderRadius: 999, padding: "1px 7px" }}>
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }} className="anim-sc">
      <button
        onClick={() => navigate("/projects")}
        style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", padding: 0, fontSize: 12.5, fontWeight: 600, color: "rgba(var(--ink-rgb),.5)", fontFamily: "inherit", marginBottom: 14 }}
      >
        <span style={{ transform: "rotate(180deg)", display: "flex" }}>
          <Icon name="arrowr" size={15} color="rgba(var(--ink-rgb),.5)" />
        </span>
        projects
      </button>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
        <div style={{ position: "relative", cursor: "pointer" }} onClick={() => imgInput.current?.click()} title="change image">
          <ProjectThumb project={project} size={56} radius={15} />
          <span style={{ position: "absolute", right: -4, bottom: -4, display: "flex", width: 22, height: 22, alignItems: "center", justifyContent: "center", borderRadius: "50%", background: "var(--btn-ink)", boxShadow: "0 0 0 2px #F6F8FA" }}>
            <Icon name="camera" size={12} color="#fff" />
          </span>
          <input ref={imgInput} type="file" accept="image/*" onChange={(e) => onImage(e.target.files?.[0])} style={{ display: "none" }} />
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
            <span style={{ width: 11, height: 11, borderRadius: "50%", background: SM[project.health].dot, flex: "0 0 auto" }} />
            <InlineText
              value={project.client}
              onSave={(v) => updateProject(pid, { client: v || project.client })}
              style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.1 }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(var(--ink-rgb),.78)", background: sm.bg, padding: "5px 12px", borderRadius: 999, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: sm.dot }} />
              {project.status}
            </span>
          </div>
          <div style={{ margin: "8px 0 0", fontSize: 14, color: "rgba(var(--ink-rgb),.5)" }}>
            <InlineText value={project.tagline} onSave={(v) => updateProject(pid, { tagline: v })} placeholder="add a tagline" />
          </div>
        </div>

        <button
          className="hov-soft"
          onClick={() => setConfirmProjDelete(true)}
          title="delete project"
          style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--card)", border: "1px solid rgba(229,72,77,.3)", color: "#C5343A", borderRadius: 11, padding: "8px 12px", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}
        >
          <Icon name="trash" size={15} color="#C5343A" /> delete
        </button>
      </div>

      <ConfirmDialog
        open={confirmProjDelete}
        title="delete project"
        body={"delete " + project.client + "? this also removes its tasks, keys and files."}
        onConfirm={() => {
          deleteProject(pid);
          navigate("/projects");
        }}
        onClose={() => setConfirmProjDelete(false)}
      />

      {/* links */}
      <LinksRow projId={pid} />

      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid rgba(var(--ink-rgb),.08)", margin: "22px 0", overflowX: "auto" }}>
        {TABS.map(tabBtn)}
      </div>

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={cardStyle}>
              <div style={sectionLabel}>brief</div>
              <div style={{ fontSize: 15, lineHeight: 1.6, color: "rgba(var(--ink-rgb),.78)" }}>
                <InlineText
                  value={project.description}
                  onSave={(v) => updateProject(pid, { description: v })}
                  placeholder="add a project brief — scope, goals, timeline…"
                  multiline
                  style={{ width: "100%", fontSize: 15 }}
                />
              </div>

              <div style={{ display: "flex", gap: 22, marginTop: 20, flexWrap: "wrap" }}>
                <div>
                  <div style={{ ...sectionLabel, marginBottom: 6 }}>builders</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {USERS.map((u) => {
                      const on = project.builders.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          onClick={() => toggleBuilder(u.id)}
                          title={on ? "remove" : "add"}
                          style={{ display: "flex", alignItems: "center", gap: 6, border: on ? "1px solid rgba(96,200,255,.55)" : "1px dashed rgba(var(--ink-rgb),.18)", background: on ? "rgba(96,200,255,.1)" : "transparent", padding: "3px 9px 3px 3px", borderRadius: 999, fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: on ? "var(--ink)" : "rgba(var(--ink-rgb),.5)" }}
                        >
                          <Avatar id={u.id} size={22} />
                          {u.first}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div style={{ ...sectionLabel, marginBottom: 6 }}>monthly retainer</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {showRevenue ? (
                      <>
                        <InlineText value={project.rev} onSave={(v) => updateProject(pid, { rev: v })} placeholder="$0" style={{ fontSize: 18, fontWeight: 700 }} />
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(var(--ink-rgb),.55)" }}> / mo</span>
                      </>
                    ) : (
                      "•••"
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ ...sectionLabel, marginBottom: 6 }}>total earned</div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {showRevenue ? (
                      <InlineText value={project.earned} onSave={(v) => updateProject(pid, { earned: v })} placeholder="$0" style={{ fontSize: 18, fontWeight: 700 }} />
                    ) : (
                      "•••"
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={sectionLabel}>status</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {STATUS.map((s) => {
                  const on = project.status === s;
                  const c = SM[statusKey(s)];
                  return (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      style={{ display: "flex", alignItems: "center", gap: 6, border: on ? "1px solid " + c.dot : "1px solid rgba(var(--ink-rgb),.1)", background: on ? c.bg : "var(--card)", color: "var(--ink)", fontSize: 13, fontWeight: 600, padding: "7px 12px", borderRadius: 999, fontFamily: "inherit" }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={sectionLabel}>tools</div>
            <ToolsEditor tools={project.stack} onAdd={addTool} onRemove={removeTool} />
          </div>
        </div>
      )}

      {tab === "tasks" && <ProjectTasks projId={pid} />}
      {tab === "vault" && <ProjectVault projId={pid} />}
      {tab === "activity" && <ProjectActivity projId={pid} />}
      {tab === "files" && <ProjectFiles projId={pid} />}
    </div>
  );
}

// ---- links -----------------------------------------------------------------

function LinksRow({ projId }: { projId: string }) {
  const project = useStore((s) => s.projects.find((p) => p.id === projId));
  const updateProject = useStore((s) => s.updateProject);
  const showToast = useStore((s) => s.showToast);
  const [editing, setEditing] = useState(false);
  if (!project) return null;

  const setLink = (lid: string, patch: { label?: string; url?: string }) =>
    updateProject(projId, { links: project.links.map((l) => (l.id === lid ? { ...l, ...patch } : l)) });
  const removeLink = (lid: string) => updateProject(projId, { links: project.links.filter((l) => l.id !== lid) });
  const addLink = () =>
    updateProject(projId, { links: project.links.concat({ id: "l" + Date.now(), label: "link", url: "" }) });

  const open = (url: string) => {
    const v = url.trim();
    if (!v) {
      showToast("add a url first");
      return;
    }
    // saved values like "github.com/acme/site" should still open correctly
    const full = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : "https://" + v;
    window.open(full, "_blank", "noopener");
  };

  if (editing) {
    return (
      <div style={{ ...cardStyle, marginTop: 18, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={sectionLabel as CSSProperties}>edit links</span>
          <button onClick={() => setEditing(false)} style={{ background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 9, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit" }}>done</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {project.links.map((l) => (
            <div key={l.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input value={l.label} onChange={(e) => setLink(l.id, { label: e.target.value })} placeholder="label" style={{ width: 110, border: "1px solid rgba(var(--ink-rgb),.12)", borderRadius: 9, padding: "8px 10px", fontFamily: "inherit", fontSize: 14 }} />
              <input value={l.url} onChange={(e) => setLink(l.id, { url: e.target.value })} placeholder="https://…" style={{ flex: 1, minWidth: 0, border: "1px solid rgba(var(--ink-rgb),.12)", borderRadius: 9, padding: "8px 10px", fontFamily: "inherit", fontSize: 14 }} />
              <button onClick={() => removeLink(l.id)} title="remove" style={{ display: "flex", background: "transparent", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 9, padding: 8 }}>
                <Icon name="trash" size={15} color="rgba(var(--ink-rgb),.5)" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addLink} className="hov-dashed" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, border: "1px dashed rgba(var(--ink-rgb),.18)", background: "transparent", borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "rgba(var(--ink-rgb),.55)", fontFamily: "inherit" }}>
          <Icon name="plus" size={14} sw={2} /> add link
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18, alignItems: "center" }}>
      {project.links.map((l) => (
        <button key={l.id} className="hov-link" onClick={() => open(l.url)} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--card)", border: "1px solid rgba(var(--ink-rgb),.08)", borderRadius: 11, padding: "8px 13px", fontSize: 13, fontWeight: 600, color: l.url ? "var(--ink)" : "rgba(var(--ink-rgb),.4)", fontFamily: "inherit" }}>
          {l.label}
          <span style={{ fontSize: 12, color: "rgba(var(--ink-rgb),.55)" }}>↗</span>
        </button>
      ))}
      <button onClick={() => setEditing(true)} className="hov-soft" title="edit links" style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px dashed rgba(var(--ink-rgb),.18)", borderRadius: 11, padding: "8px 12px", fontSize: 13, fontWeight: 600, color: "rgba(var(--ink-rgb),.5)", fontFamily: "inherit" }}>
        <Icon name="link" size={14} color="rgba(var(--ink-rgb),.5)" /> edit links
      </button>
    </div>
  );
}

// ---- tools editor ----------------------------------------------------------

function ToolsEditor({ tools, onAdd, onRemove }: { tools: string[]; onAdd: (t: string) => void; onRemove: (t: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {tools.length === 0 && <span style={{ fontSize: 13, color: "rgba(var(--ink-rgb),.55)" }}>no tools yet</span>}
        {tools.map((t) => (
          <span key={t} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "rgba(var(--ink-rgb),.62)", background: "rgba(var(--ink-rgb),.045)", padding: "5px 6px 5px 10px", borderRadius: 8 }}>
            {t}
            <button onClick={() => onRemove(t)} title="remove" style={{ display: "flex", background: "transparent", border: "none", padding: 0, cursor: "pointer" }}>
              <Icon name="close" size={13} sw={2} color="rgba(var(--ink-rgb),.4)" />
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAdd(val);
              setVal("");
            }
          }}
          placeholder="add a tool…"
          style={{ flex: 1, minWidth: 0, border: "1px solid rgba(var(--ink-rgb),.12)", borderRadius: 10, padding: "9px 11px", fontFamily: "inherit", fontSize: 14 }}
        />
        <button
          onClick={() => {
            onAdd(val);
            setVal("");
          }}
          style={{ background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 10, padding: "0 14px", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}
        >
          add
        </button>
      </div>
    </div>
  );
}

// ---- tasks tab -------------------------------------------------------------

function ProjectTasks({ projId }: { projId: string }) {
  const allTasks = useStore((s) => s.tasks);
  const tasks = allTasks.filter((t) => t.proj === projId);
  const addTask = useStore((s) => s.addTask);
  const openTask = useStore((s) => s.openTask);
  const [title, setTitle] = useState("");

  const submit = () => {
    const v = title.trim();
    if (!v) return;
    addTask({ title: v, proj: projId });
    setTitle("");
  };

  return (
    <div style={{ ...cardStyle, padding: 10 }}>
      {tasks.length === 0 && (
        <div style={{ fontSize: 13.5, color: "rgba(var(--ink-rgb),.55)", textAlign: "center", padding: "16px 0" }}>no tasks yet — add the first one below.</div>
      )}
      {tasks.map((t) => (
        <div
          key={t.id}
          role="button"
          tabIndex={0}
          onClick={() => openTask(t.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openTask(t.id);
            }
          }}
          className="hov-row"
          style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 12px", borderBottom: "1px solid rgba(var(--ink-rgb),.05)", cursor: "pointer", borderRadius: 10 }}
        >
          <span style={priDot(t.pri)} />
          <span style={{ fontSize: 14, flex: 1 }}>{t.title}</span>
          {t.blocked && <span style={{ fontSize: 10.5, fontWeight: 600, color: "#B5462A", background: "rgba(255,150,120,.18)", padding: "2px 8px", borderRadius: 6 }}>blocked</span>}
          <span style={{ fontSize: 11, color: "rgba(var(--ink-rgb),.55)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600 }}>{t.col}</span>
          <Avatar id={t.who} size={24} />
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, padding: "12px 8px 6px" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="new task for this project…"
          style={{ flex: 1, minWidth: 0, border: "1px solid rgba(var(--ink-rgb),.12)", borderRadius: 10, padding: "10px 12px", fontFamily: "inherit", fontSize: 14 }}
        />
        <button onClick={submit} style={{ background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 10, padding: "0 16px", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>add</button>
      </div>
    </div>
  );
}

// ---- vault tab -------------------------------------------------------------

function ProjectVault({ projId }: { projId: string }) {
  const allKeys = useStore((s) => s.keys);
  const keys = allKeys.filter((k) => k.proj === projId || k.proj === "shared");
  const revealed = useStore((s) => s.revealed);
  const reveal = useStore((s) => s.reveal);
  const hide = useStore((s) => s.hide);
  const copy = useStore((s) => s.copy);
  const addKey = useStore((s) => s.addKey);
  const deleteKey = useStore((s) => s.deleteKey);
  const [label, setLabel] = useState("");
  const [val, setVal] = useState("");
  const [pendingDelete, setPendingDelete] = useState<VaultKey | null>(null);

  const submit = () => {
    if (!label.trim() || !val.trim()) return;
    addKey({ label, val, proj: projId });
    setLabel("");
    setVal("");
  };

  return (
    <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
      {keys.length === 0 && <div style={{ fontSize: 13.5, color: "rgba(var(--ink-rgb),.55)", textAlign: "center", padding: "18px 0" }}>no keys for this project yet.</div>}
      {keys.map((k) => {
        const isRevealed = !!revealed[k.id];
        return (
          <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid rgba(var(--ink-rgb),.05)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "ui-monospace,Menlo,monospace", color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
                {k.label}
                {k.proj === "shared" && <span style={{ fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", background: "rgba(var(--ink-rgb),.05)", padding: "1px 6px", borderRadius: 5 }}>shared</span>}
              </div>
              <div style={{ fontSize: 13, color: "rgba(var(--ink-rgb),.55)", fontFamily: "ui-monospace,Menlo,monospace", marginTop: 3, letterSpacing: ".06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {isRevealed ? k.val : "••••••••••••••••"}
              </div>
            </div>
            <button className="hov-soft" onClick={() => (isRevealed ? hide(k.id) : reveal(k.id))} title="reveal" style={{ display: "flex", background: "transparent", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 9, padding: 8 }}>
              <Icon name={isRevealed ? "eyeoff" : "eye"} size={16} color="rgba(var(--ink-rgb),.55)" />
            </button>
            <button className="hov-soft" onClick={() => copy(k.val, "copied " + k.label)} title="copy" style={{ display: "flex", background: "transparent", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 9, padding: 8 }}>
              <Icon name="copy" size={15} color="rgba(var(--ink-rgb),.55)" />
            </button>
            {k.proj !== "shared" && (
              <button className="hov-soft" onClick={() => setPendingDelete(k)} title="delete" style={{ display: "flex", background: "transparent", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 9, padding: 8 }}>
                <Icon name="trash" size={15} color="rgba(var(--ink-rgb),.55)" />
              </button>
            )}
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 8, padding: 12, flexWrap: "wrap" }}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="KEY_NAME" style={{ flex: "1 1 140px", minWidth: 0, border: "1px solid rgba(var(--ink-rgb),.12)", borderRadius: 10, padding: "10px 12px", fontFamily: "ui-monospace,Menlo,monospace", fontSize: 13 }} />
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="value" style={{ flex: "2 1 180px", minWidth: 0, border: "1px solid rgba(var(--ink-rgb),.12)", borderRadius: 10, padding: "10px 12px", fontFamily: "ui-monospace,Menlo,monospace", fontSize: 13 }} />
        <button onClick={submit} style={{ background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 10, padding: "0 16px", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>add key</button>
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="delete key"
        body={pendingDelete ? pendingDelete.label + " will be permanently removed. its value cannot be recovered." : undefined}
        onConfirm={() => pendingDelete && deleteKey(pendingDelete.id)}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

// ---- activity tab ----------------------------------------------------------

function ActivityRow({ who, action, target, when }: { who: number; action: string; target: string; when: string }) {
  const u = useUser(who);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 0", borderBottom: "1px solid rgba(var(--ink-rgb),.05)" }}>
      <Avatar id={who} size={24} />
      <span style={{ fontSize: 13.5, flex: 1 }}>
        <b style={{ fontWeight: 600 }}>{u.name}</b> {action} <span style={{ color: "rgba(var(--ink-rgb),.5)" }}>{target}</span>
      </span>
      <span style={{ fontSize: 12, color: "rgba(var(--ink-rgb),.55)" }}>{when}</span>
    </div>
  );
}

function ProjectActivity({ projId }: { projId: string }) {
  const allActivity = useStore((s) => s.activity);
  const activity = allActivity.filter((a) => a.proj === projId);
  return (
    <div style={{ ...cardStyle, padding: "14px 18px" }}>
      {activity.length === 0 ? (
        <div style={{ fontSize: 13.5, color: "rgba(var(--ink-rgb),.55)", textAlign: "center", padding: "14px 0" }}>no activity yet for this project.</div>
      ) : (
        activity.map((a) => <ActivityRow key={a.id} who={a.who} action={a.action} target={a.target} when={whenLabel(a.at, a.time)} />)
      )}
    </div>
  );
}
