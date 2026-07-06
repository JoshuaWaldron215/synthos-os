import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { Eyebrow } from "../components/Eyebrow";
import { Icon } from "../lib/Icon";
import { LEAD_STATUSES, fmtDay, leadPill } from "../lib/leads";
import { perMonth, sumMoney } from "../lib/money";
import { effectiveUser } from "../lib/profile";
import { SM, priDot } from "../lib/style";
import { useIsMobile } from "../lib/useMediaQuery";
import { useUser } from "../lib/useUser";
import { useStore } from "../store/useStore";
import { fullLayout, type WidgetKey } from "../store/slices/dashboard";

const DAY = 86400000;
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const WIDGET_TITLES: Record<WidgetKey, string> = {
  ask: "ask ai",
  today: "today",
  tasks: "my tasks",
  pipeline: "pipeline",
  projects: "projects",
  team: "team chat",
  wins: "momentum",
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  width: "100%",
  border: "none",
  background: "transparent",
  padding: "8px 6px",
  borderRadius: 10,
  fontFamily: "inherit",
  fontSize: 13.5,
  color: "var(--ink)",
  textAlign: "left",
  cursor: "pointer",
};

const emptyStyle: CSSProperties = { fontSize: 13, color: "rgba(var(--ink-rgb),.45)", padding: "10px 6px" };

function WidgetCard({
  widget,
  first,
  last,
  children,
  onOpen,
}: {
  widget: WidgetKey;
  first: boolean;
  last: boolean;
  children: ReactNode;
  onOpen?: () => void;
}) {
  const isMobile = useIsMobile();
  const editing = useStore((s) => s.dashEditing);
  const moveWidget = useStore((s) => s.moveWidget);
  const toggleWidget = useStore((s) => s.toggleWidget);

  // edit controls need real thumb room on touch screens
  const ctlSize = isMobile ? 34 : 26;
  const ctl: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: ctlSize,
    height: ctlSize,
    border: "1px solid rgba(var(--ink-rgb),.1)",
    background: "var(--card)",
    borderRadius: 9,
    fontFamily: "inherit",
    fontSize: isMobile ? 15 : 13,
    color: "rgba(var(--ink-rgb),.6)",
    padding: 0,
  };

  return (
    <div
      style={{
        background: "var(--card)",
        border: editing ? "1px dashed rgba(96,200,255,.5)" : "1px solid rgba(var(--ink-rgb),.06)",
        borderRadius: 18,
        padding: "16px 16px 12px",
        boxShadow: "var(--shadow-card)",
        breakInside: "avoid",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", fontWeight: 600, flex: 1 }}>
          {WIDGET_TITLES[widget]}
        </span>
        {editing ? (
          <div style={{ display: "flex", gap: isMobile ? 8 : 5 }}>
            <button title="move up" onClick={() => moveWidget(widget, -1)} disabled={first} style={{ ...ctl, opacity: first ? 0.3 : 1 }}>↑</button>
            <button title="move down" onClick={() => moveWidget(widget, 1)} disabled={last} style={{ ...ctl, opacity: last ? 0.3 : 1 }}>↓</button>
            <button title="hide widget" onClick={() => toggleWidget(widget)} style={{ ...ctl, color: "var(--danger)" }}>✕</button>
          </div>
        ) : (
          onOpen && (
            <button title="open" onClick={onOpen} className="hov-sky" style={{ ...ctl, border: "none", background: "transparent" }}>
              <Icon name="arrowr" size={15} sw={1.8} color="rgba(var(--ink-rgb),.45)" />
            </button>
          )
        )}
      </div>
      {children}
    </div>
  );
}

const ASK_HINTS = ["assign a task", "what's blocked?", "any updates today?"];

function AskWidget() {
  const navigate = useNavigate();
  const ask = useStore((s) => s.ask);
  const [text, setText] = useState("");

  const send = (q: string) => {
    const v = q.trim();
    if (!v) return;
    setText("");
    ask(v);
    navigate("/ask");
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(var(--ink-rgb),.04)", border: "1px solid rgba(var(--ink-rgb),.08)", borderRadius: 12, padding: "4px 4px 4px 12px", marginBottom: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send(text);
          }}
          placeholder="assign a task, ask about a project…"
          style={{ flex: 1, minWidth: 0, border: "none", background: "transparent", fontSize: 13.5, fontFamily: "inherit", color: "var(--ink)", padding: "8px 0" }}
        />
        <button onClick={() => send(text)} title="ask" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "var(--btn-ink)", border: "none", borderRadius: 9, flex: "0 0 auto", cursor: "pointer" }}>
          <Icon name="send" size={14} sw={1.8} color="#fff" />
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {ASK_HINTS.map((h) => (
          <button key={h} className="hov-soft" onClick={() => send(h)} style={{ background: "transparent", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 999, padding: "5px 11px", fontSize: 11.5, fontWeight: 600, color: "rgba(var(--ink-rgb),.55)", fontFamily: "inherit", cursor: "pointer" }}>
            {h}
          </button>
        ))}
      </div>
    </div>
  );
}

function TodayWidget() {
  const navigate = useNavigate();
  const me = useStore((s) => s.currentUserId);
  const tasks = useStore((s) => s.tasks);
  const leads = useStore((s) => s.leads);
  const openTask = useStore((s) => s.openTask);
  const today = startOfToday();

  const dueTasks = tasks
    .filter((t) => t.who === me && t.col !== "done" && t.due != null && t.due < today + DAY)
    .sort((a, b) => (a.due ?? 0) - (b.due ?? 0));
  const dueLeads = leads
    .filter((l) => l.who === me && l.status !== "won" && l.status !== "lost" && l.nextFollowUp != null && l.nextFollowUp < today + DAY)
    .sort((a, b) => (a.nextFollowUp ?? 0) - (b.nextFollowUp ?? 0));

  if (!dueTasks.length && !dueLeads.length) {
    return <div style={emptyStyle}>clear runway — nothing due today ✦</div>;
  }
  const badge = (ms: number) => (
    <span style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", color: ms < today ? "var(--danger)" : "#F5A524" }}>
      {ms < today ? "overdue · " + fmtDay(ms) : "today"}
    </span>
  );
  return (
    <div>
      {dueTasks.slice(0, 4).map((t) => (
        <button key={t.id} className="hov-soft dash-row" style={rowStyle} onClick={() => { navigate("/tasks"); openTask(t.id); }}>
          <span style={priDot(t.pri)} />
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
          {badge(t.due!)}
        </button>
      ))}
      {dueLeads.slice(0, 3).map((l) => (
        <button key={l.id} className="hov-soft dash-row" style={rowStyle} onClick={() => navigate("/leads")}>
          <Icon name="bolt" size={14} sw={1.8} color="#FF8A63" />
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            follow up · {l.name}
          </span>
          {badge(l.nextFollowUp!)}
        </button>
      ))}
    </div>
  );
}

function TasksWidget() {
  const navigate = useNavigate();
  const me = useStore((s) => s.currentUserId);
  const tasks = useStore((s) => s.tasks);
  const openTask = useStore((s) => s.openTask);
  const mine = tasks.filter((t) => t.who === me && t.col !== "done");
  const counts = { build: 0, qa: 0, ship: 0 } as Record<string, number>;
  for (const t of mine) counts[t.col] = (counts[t.col] ?? 0) + 1;

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
        {(["build", "qa", "ship"] as const).map((c, i) => (
          <span key={c} style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(var(--ink-rgb),.6)", background: "rgba(var(--ink-rgb),.05)", padding: "4px 10px", borderRadius: 999, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: [SM.sky.dot, SM.lav.dot, SM.blush.dot][i] }} />
            {c} · {counts[c] ?? 0}
          </span>
        ))}
      </div>
      {mine.length === 0 ? (
        <div style={emptyStyle}>no open tasks on your plate ✦</div>
      ) : (
        mine
          .sort((a, b) => (a.due ?? Infinity) - (b.due ?? Infinity))
          .slice(0, 4)
          .map((t) => (
            <button key={t.id} className="hov-soft dash-row" style={rowStyle} onClick={() => { navigate("/tasks"); openTask(t.id); }}>
              <span style={priDot(t.pri)} />
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
              <span style={{ fontSize: 11, color: "rgba(var(--ink-rgb),.45)", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>{t.col}</span>
            </button>
          ))
      )}
    </div>
  );
}

function PipelineWidget() {
  const navigate = useNavigate();
  const leads = useStore((s) => s.leads);
  const openCount = leads.filter((l) => l.status !== "won" && l.status !== "lost").length;
  const hot = leads.filter((l) => l.quality === "hot" && l.status !== "won" && l.status !== "lost").length;

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {LEAD_STATUSES.map((st) => {
          const n = leads.filter((l) => l.status === st).length;
          if (!n) return null;
          const meta = leadPill(st);
          return (
            <button key={st} onClick={() => navigate("/leads")} style={{ background: meta.bg, color: meta.color, border: "none", borderRadius: 999, padding: "4px 11px", fontSize: 11.5, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>
              {st} · {n}
            </button>
          );
        })}
      </div>
      {leads.length === 0 ? (
        <div style={emptyStyle}>no leads yet — go hunting ✦</div>
      ) : (
        <div style={{ fontSize: 13, color: "rgba(var(--ink-rgb),.55)", padding: "2px 6px 4px" }}>
          {openCount} in play{hot ? " · " : ""}
          {hot ? <b style={{ color: "#E5484D", fontWeight: 600 }}>{hot} hot</b> : null}
        </div>
      )}
    </div>
  );
}

function ProjectsWidget() {
  const navigate = useNavigate();
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const active = projects.filter((p) => p.status !== "shipped").slice(0, 4);

  if (!projects.length) return <div style={emptyStyle}>no projects yet — create the first ✦</div>;
  return (
    <div>
      {active.map((p) => {
        const open = tasks.filter((t) => t.proj === p.id && t.col !== "done").length;
        return (
          <button key={p.id} className="hov-soft dash-row" style={rowStyle} onClick={() => navigate("/project/" + p.id)}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: SM[p.health].dot, flex: "0 0 auto" }} />
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>{p.client}</span>
            <span style={{ fontSize: 11.5, color: "rgba(var(--ink-rgb),.5)" }}>{open} open</span>
          </button>
        );
      })}
    </div>
  );
}

function TeamWidget() {
  const navigate = useNavigate();
  const teamMsgs = useStore((s) => s.teamMsgs);
  const conversations = useStore((s) => s.conversations);
  const profiles = useStore((s) => s.profiles);

  const latest = useMemo(() => {
    const all: Array<{ convo: string; who: number; text: string; at: number }> = [];
    for (const [convo, msgs] of Object.entries(teamMsgs)) {
      for (const m of msgs) if (m.at) all.push({ convo, who: m.who, text: m.text || "📎 attachment", at: m.at });
    }
    return all.sort((a, b) => b.at - a.at).slice(0, 3);
  }, [teamMsgs]);

  const label = (id: string) => {
    const c = conversations.find((x) => x.id === id);
    return !c ? id : c.type === "dm" ? "dm" : "#" + c.name;
  };

  if (!latest.length) return <div style={emptyStyle}>quiet in here — say hello 👋</div>;
  return (
    <div>
      {latest.map((m, i) => (
        <button key={i} className="hov-soft dash-row" style={rowStyle} onClick={() => navigate("/team?c=" + m.convo)}>
          <Avatar id={m.who} size={24} />
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <b style={{ fontWeight: 600 }}>{effectiveUser(m.who, profiles).first}</b>
            <span style={{ color: "rgba(var(--ink-rgb),.55)" }}> · {m.text}</span>
          </span>
          <span style={{ fontSize: 11, color: "rgba(var(--ink-rgb),.4)", textTransform: "uppercase", letterSpacing: ".04em", fontWeight: 600, whiteSpace: "nowrap" }}>{label(m.convo)}</span>
        </button>
      ))}
    </div>
  );
}

function WinsWidget() {
  const navigate = useNavigate();
  const projects = useStore((s) => s.projects);
  const wins = useStore((s) => s.wins);
  const showRevenue = useStore((s) => s.showRevenue);
  const mrr = sumMoney(projects.map((p) => p.rev));
  const latest = wins[0];

  return (
    <div>
      <div style={{ display: "flex", gap: 16, padding: "2px 6px 10px" }}>
        <div>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.5)", fontWeight: 600 }}>retainers</div>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-.02em" }}>{showRevenue ? perMonth(mrr) : "•••"}</div>
        </div>
        <div>
          <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.5)", fontWeight: 600 }}>wins logged</div>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-.02em" }}>{wins.length}</div>
        </div>
      </div>
      {latest ? (
        <button className="hov-soft dash-row" style={rowStyle} onClick={() => navigate("/wins")}>
          <span style={{ fontSize: 14 }}>🎉</span>
          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{latest.title}</span>
          {latest.amount && showRevenue && <span style={{ fontSize: 12, fontWeight: 600, color: "#2FC197" }}>{latest.amount}</span>}
        </button>
      ) : (
        <div style={emptyStyle}>first win coming soon ✦</div>
      )}
    </div>
  );
}

const WIDGETS: Record<WidgetKey, { component: () => ReactNode; path: string }> = {
  ask: { component: AskWidget, path: "/ask" },
  today: { component: TodayWidget, path: "/tasks" },
  tasks: { component: TasksWidget, path: "/tasks" },
  pipeline: { component: PipelineWidget, path: "/leads" },
  projects: { component: ProjectsWidget, path: "/projects" },
  team: { component: TeamWidget, path: "/team" },
  wins: { component: WinsWidget, path: "/wins" },
};

export function Home() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const me = useStore((s) => s.currentUserId);
  const user = useUser(me);
  const layout = useStore((s) => fullLayout(s.dashboards[s.currentUserId]));
  const editing = useStore((s) => s.dashEditing);
  const setDashEditing = useStore((s) => s.setDashEditing);
  const toggleWidget = useStore((s) => s.toggleWidget);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "up late" : hour < 12 ? "good morning" : hour < 18 ? "good afternoon" : "good evening";
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const visible = layout.filter((w) => w.on);
  const hidden = layout.filter((w) => !w.on);

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }} className="anim-sc">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <Eyebrow index="00" label="today" color="#8A84F0" />
          <h1 style={{ margin: 0, fontSize: isMobile ? 23 : 32, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.08 }}>
            {greeting}, <i style={{ fontWeight: 600 }}>{user.first.toLowerCase()}</i>
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "rgba(var(--ink-rgb),.5)" }}>{dateLabel.toLowerCase()}</p>
        </div>
        <button
          onClick={() => setDashEditing(!editing)}
          className="hov-soft"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: editing ? "var(--btn-ink)" : "var(--card)",
            color: editing ? "#fff" : "rgba(var(--ink-rgb),.65)",
            border: editing ? "none" : "1px solid rgba(var(--ink-rgb),.1)",
            borderRadius: 11,
            padding: "9px 14px",
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "inherit",
          }}
        >
          <Icon name="settings" size={15} sw={1.8} color={editing ? "#fff" : "rgba(var(--ink-rgb),.55)"} />
          {editing ? "done" : "customize"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(330px, 1fr))", gap: 14 }}>
        {visible.map((w, i) => {
          const W = WIDGETS[w.key];
          return (
            <WidgetCard key={w.key} widget={w.key} first={i === 0} last={i === visible.length - 1} onOpen={() => navigate(W.path)}>
              <W.component />
            </WidgetCard>
          );
        })}
      </div>

      {editing && hidden.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.5)", fontWeight: 600, marginBottom: 8 }}>
            hidden widgets
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {hidden.map((w) => (
              <button
                key={w.key}
                onClick={() => toggleWidget(w.key)}
                className="hov-dashed"
                style={{ border: "1px dashed rgba(var(--ink-rgb),.2)", background: "transparent", borderRadius: 999, padding: "7px 14px", fontSize: 12.5, fontWeight: 600, color: "rgba(var(--ink-rgb),.55)", fontFamily: "inherit" }}
              >
                + {WIDGET_TITLES[w.key]}
              </button>
            ))}
          </div>
        </div>
      )}

      {visible.length === 0 && (
        <div style={{ background: "var(--card)", border: "1px dashed rgba(var(--ink-rgb),.14)", borderRadius: 16, padding: "32px 20px", textAlign: "center", marginTop: 4 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>a very zen dashboard ✦</div>
          <div style={{ fontSize: 13, color: "rgba(var(--ink-rgb),.55)" }}>everything is hidden — tap customize to bring widgets back.</div>
        </div>
      )}
    </div>
  );
}
