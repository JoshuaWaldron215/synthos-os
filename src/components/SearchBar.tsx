import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../lib/Icon";
import { USERS } from "../data/seed";
import { effectiveUser } from "../lib/profile";
import { useStore } from "../store/useStore";
import { Avatar } from "./Avatar";
import { ResponsiveModal } from "./ResponsiveModal";

type ResultKind = "person" | "project" | "task" | "key" | "file" | "lead";
interface Result {
  kind: ResultKind;
  id: string;
  title: string;
  sub: string;
  avatarId?: number;
  go: () => void;
}

const KIND_LABEL: Record<ResultKind, string> = {
  person: "people",
  project: "projects",
  task: "tasks",
  key: "vault",
  file: "files",
  lead: "leads",
};
const KIND_ICON: Record<ResultKind, Parameters<typeof Icon>[0]["name"]> = {
  person: "team",
  project: "projects",
  task: "tasks",
  key: "vault",
  file: "note",
  lead: "bolt",
};

function useResults(query: string, onPicked: () => void): Result[] {
  const navigate = useNavigate();
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const keys = useStore((s) => s.keys);
  const files = useStore((s) => s.files);
  const leads = useStore((s) => s.leads);
  const profiles = useStore((s) => s.profiles);
  const openTask = useStore((s) => s.openTask);
  const openProfile = useStore((s) => s.openProfile);

  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const nameOf = (proj: string) => projects.find((p) => p.id === proj)?.client ?? proj;
    const out: Result[] = [];

    for (const seed of USERS) {
      const u = effectiveUser(seed.id, profiles);
      if (
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      ) {
        out.push({
          kind: "person",
          id: String(u.id),
          title: u.name,
          sub: "@" + u.username + " · " + u.role,
          avatarId: u.id,
          go: () => {
            openProfile(u.id);
            onPicked();
          },
        });
      }
    }

    for (const p of projects) {
      if (
        p.client.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.stack.some((s) => s.toLowerCase().includes(q))
      ) {
        out.push({
          kind: "project",
          id: p.id,
          title: p.client,
          sub: p.tagline || p.stack.join(" · "),
          go: () => {
            navigate("/project/" + p.id);
            onPicked();
          },
        });
      }
    }
    for (const t of tasks) {
      if (t.title.toLowerCase().includes(q)) {
        out.push({
          kind: "task",
          id: t.id,
          title: t.title,
          sub: nameOf(t.proj),
          go: () => {
            navigate("/tasks");
            openTask(t.id);
            onPicked();
          },
        });
      }
    }
    for (const k of keys) {
      if (k.label.toLowerCase().includes(q)) {
        out.push({
          kind: "key",
          id: k.id,
          title: k.label,
          sub: nameOf(k.proj),
          go: () => {
            // the vault scrolls to and flashes the matched row
            navigate("/vault", { state: { highlight: k.id } });
            onPicked();
          },
        });
      }
    }
    for (const f of files) {
      if (f.name.toLowerCase().includes(q)) {
        out.push({
          kind: "file",
          id: f.id,
          title: f.name,
          sub: nameOf(f.proj),
          go: () => {
            navigate("/project/" + f.proj + "?tab=files");
            onPicked();
          },
        });
      }
    }
    for (const l of leads) {
      if (
        l.name.toLowerCase().includes(q) ||
        l.contact.toLowerCase().includes(q) ||
        l.notes.toLowerCase().includes(q)
      ) {
        out.push({
          kind: "lead",
          id: l.id,
          title: l.name,
          sub: l.status + (l.contact ? " · " + l.contact : ""),
          go: () => {
            navigate("/leads");
            onPicked();
          },
        });
      }
    }
    return out.slice(0, 12);
  }, [query, projects, tasks, keys, files, leads, profiles, navigate, openTask, openProfile, onPicked]);
}

function ResultRow({ r }: { r: Result }) {
  return (
    <button
      className="hov-row"
      onMouseDown={(e) => {
        e.preventDefault();
        r.go();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        width: "100%",
        border: "none",
        background: "transparent",
        padding: "10px 12px",
        borderRadius: 11,
        fontFamily: "inherit",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      {r.avatarId !== undefined ? (
        <Avatar id={r.avatarId} size={30} presence />
      ) : (
        <span style={{ display: "flex", width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 9, background: "rgba(var(--ink-rgb),.05)", flex: "0 0 auto" }}>
          <Icon name={KIND_ICON[r.kind]} size={15} color="rgba(var(--ink-rgb),.55)" />
        </span>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</span>
        <span style={{ display: "block", fontSize: 12, color: "rgba(var(--ink-rgb),.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.sub}</span>
      </span>
      <span style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.32)", fontWeight: 700, flex: "0 0 auto" }}>{KIND_LABEL[r.kind]}</span>
    </button>
  );
}

function ResultList({ query, results }: { query: string; results: Result[] }) {
  if (!query.trim()) {
    return (
      <div style={{ padding: "18px 12px", fontSize: 13, color: "rgba(var(--ink-rgb),.55)", textAlign: "center" }}>
        search people, projects, tasks, keys, files and leads
      </div>
    );
  }
  if (!results.length) {
    return (
      <div style={{ padding: "18px 12px", fontSize: 13, color: "rgba(var(--ink-rgb),.55)", textAlign: "center" }}>
        no matches for "{query.trim()}"
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {results.map((r) => (
        <ResultRow key={r.kind + r.id} r={r} />
      ))}
    </div>
  );
}

export function SearchBar({ mobile }: { mobile?: boolean }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const results = useResults(query, close);

  // Cmd/Ctrl+K opens or focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (mobile) setOpen(true);
        else inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        if (mobile) setOpen(false);
        else inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobile]);

  if (mobile) {
    return (
      <>
        <button
          className="hov-sky"
          onClick={() => setOpen(true)}
          title="search"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, border: "1px solid rgba(var(--ink-rgb),.08)", background: "var(--card)", borderRadius: 11, flex: "0 0 auto", padding: 0 }}
        >
          <Icon name="search" size={19} color="var(--ink)" />
        </button>
        <ResponsiveModal open={open} onClose={close} title="search" width={460}>
          <label style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(var(--ink-rgb),.04)", border: "1px solid rgba(var(--ink-rgb),.08)", borderRadius: 12, padding: "11px 13px", marginBottom: 10 }}>
            <Icon name="search" size={18} color="rgba(var(--ink-rgb),.4)" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="people, projects, tasks, keys…"
              style={{ border: "none", background: "transparent", fontSize: 16, color: "var(--ink)", flex: 1, minWidth: 0 }}
            />
          </label>
          <ResultList query={query} results={results} />
        </ResponsiveModal>
      </>
    );
  }

  const dropdownStyle: CSSProperties = {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    width: "100%",
    background: "var(--card)",
    border: "1px solid rgba(var(--ink-rgb),.08)",
    borderRadius: 14,
    boxShadow: "0 20px 50px -20px rgba(11,15,25,.4)",
    padding: 6,
    zIndex: 60,
    maxHeight: "60vh",
    overflowY: "auto",
  };

  return (
    <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
      <label style={{ display: "flex", alignItems: "center", gap: 9, background: "var(--card)", border: "1px solid rgba(var(--ink-rgb),.07)", borderRadius: 12, padding: "8px 12px" }}>
        <Icon name="search" size={17} color="rgba(var(--ink-rgb),.4)" />
        <input
          ref={inputRef}
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder="search projects, tasks, keys…"
          style={{ border: "none", background: "transparent", fontSize: 13.5, color: "var(--ink)", flex: 1, minWidth: 0 }}
        />
        <span style={{ fontSize: 11, color: "rgba(var(--ink-rgb),.34)", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 6, padding: "1px 6px", fontWeight: 600 }}>⌘K</span>
      </label>
      {open && (query.trim() !== "" || results.length > 0) && (
        <div style={dropdownStyle}>
          <ResultList query={query} results={results} />
        </div>
      )}
    </div>
  );
}
