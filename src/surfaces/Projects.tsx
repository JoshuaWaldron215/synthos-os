import { useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Eyebrow } from "../components/Eyebrow";
import { Avatar } from "../components/Avatar";
import { ProjectThumb } from "../components/ProjectThumb";
import { ProjectFormModal } from "../components/ProjectFormModal";
import { SM, statusKey } from "../lib/style";
import { useIsMobile } from "../lib/useMediaQuery";
import { useStore } from "../store/useStore";
import type { Project } from "../types";

const STATUS_OPTS = ["all", "in progress", "in qa", "blocked", "shipped"];

function pillStyle(active: boolean): CSSProperties {
  return {
    border: "none",
    background: active ? "#fff" : "transparent",
    color: active ? "#0B0F19" : "rgba(11,15,25,.5)",
    fontSize: 12.5,
    fontWeight: 600,
    padding: "5px 11px",
    borderRadius: 8,
    fontFamily: "inherit",
    boxShadow: active ? "0 1px 2px rgba(11,15,25,.1)" : "none",
    whiteSpace: "nowrap",
  };
}

function FilterGroup({
  label,
  options,
  value,
  onPick,
  isMobile,
}: {
  label: string;
  options: string[];
  value: string;
  onPick: (v: string) => void;
  isMobile: boolean;
}) {
  const groupStyle: CSSProperties = isMobile
    ? { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 7, width: "100%", minWidth: 0 }
    : { display: "flex", alignItems: "center", gap: 8 };
  const pillsStyle: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    background: "rgba(11,15,25,.04)",
    borderRadius: 10,
    padding: 3,
  };
  return (
    <div style={groupStyle}>
      <span style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(11,15,25,.38)", fontWeight: 600 }}>{label}</span>
      <div style={pillsStyle}>
        {options.map((o) => (
          <button key={o} onClick={() => onPick(o)} style={pillStyle(value === o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ p }: { p: Project }) {
  const navigate = useNavigate();
  const showRevenue = useStore((s) => s.showRevenue);
  const sm = SM[statusKey(p.status)];
  const healthDot = SM[p.health].dot;

  return (
    <div
      className="hov-lift"
      onClick={() => navigate("/project/" + p.id)}
      style={{
        background: "#fff",
        border: "1px solid rgba(11,15,25,.06)",
        borderRadius: 18,
        padding: 18,
        cursor: "pointer",
        boxShadow: "0 1px 2px rgba(11,15,25,.04),0 14px 34px -22px rgba(11,15,25,.3)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <ProjectThumb project={p} size={38} radius={11} />
          <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: healthDot, flex: "0 0 auto", boxShadow: "0 0 0 4px rgba(11,15,25,.03)" }} />
            <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 700, letterSpacing: "-.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.client}</h3>
          </div>
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(11,15,25,.78)", background: sm.bg, padding: "4px 10px", borderRadius: 999, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", flex: "0 0 auto" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: sm.dot }} />
          {p.status}
        </span>
      </div>
      <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(11,15,25,.46)" }}>{p.tagline}</p>
      <div style={{ display: "flex", gap: 6, margin: "14px 0 16px", flexWrap: "wrap" }}>
        {p.stack.map((s) => (
          <span key={s} style={{ fontSize: 11, fontWeight: 600, color: "rgba(11,15,25,.55)", background: "rgba(11,15,25,.045)", padding: "3px 9px", borderRadius: 7 }}>{s}</span>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 14, borderTop: "1px solid rgba(11,15,25,.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "flex" }}>
            {p.builders.map((b, i) => (
              <Avatar key={b} id={b} size={28} i={i} />
            ))}
          </span>
          <span style={{ fontSize: 12.5, color: "rgba(11,15,25,.55)", fontWeight: 500 }}>{p.open} open</span>
        </div>
        <span style={{ fontSize: 12.5, color: "rgba(11,15,25,.34)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {showRevenue ? p.rev + " / mo" : "•••"}
        </span>
      </div>
    </div>
  );
}

export function Projects() {
  const isMobile = useIsMobile();
  const fStatus = useStore((s) => s.fStatus);
  const setFilter = useStore((s) => s.setFilter);
  const allProjects = useStore((s) => s.projects);
  const [formOpen, setFormOpen] = useState(false);

  const projects = allProjects.filter((p) => {
    if (fStatus !== "all" && p.status !== fStatus) return false;
    return true;
  });

  const filtersWrapStyle: CSSProperties = isMobile
    ? { display: "flex", flexDirection: "column", gap: 13, marginBottom: 18 }
    : { display: "flex", flexWrap: "wrap", gap: 18, alignItems: "center", marginBottom: 22, paddingBottom: 6 };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }} className="anim-sc">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <Eyebrow index="01" label="workspace" />
          <h1 style={{ margin: 0, fontSize: isMobile ? 23 : 32, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.08 }}>
            your <i style={{ fontWeight: 600 }}>projects</i>, at a glance
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "rgba(11,15,25,.5)", maxWidth: 440, lineHeight: 1.5 }}>
            {projects.length} active builds across the studio. health is live — green is calm, peach needs you.
          </p>
        </div>
        <button className="hov-soft" onClick={() => setFormOpen(true)} style={{ display: "flex", alignItems: "center", gap: 7, background: "#0B0F19", color: "#fff", border: "none", borderRadius: 12, padding: "10px 15px", fontSize: 13.5, fontWeight: 600 }}>
          new project <span style={{ fontSize: 14 }}>↗</span>
        </button>
      </div>

      <ProjectFormModal open={formOpen} onClose={() => setFormOpen(false)} />

      <div style={filtersWrapStyle}>
        <FilterGroup label="status" options={STATUS_OPTS} value={fStatus} onPick={(v) => setFilter("status", v)} isMobile={isMobile} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(282px,1fr))", gap: 16 }}>
        {projects.map((p) => (
          <ProjectCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}
