import { useMemo, useState, type CSSProperties } from "react";
import { Avatar } from "../components/Avatar";
import { Eyebrow } from "../components/Eyebrow";
import { LeadFormModal } from "../components/LeadFormModal";
import { Icon } from "../lib/Icon";
import { LEAD_QUALITIES, LEAD_STATUSES, fmtDay, leadPill, nextOf, startOfToday } from "../lib/leads";
import { useIsMobile } from "../lib/useMediaQuery";
import { useStore } from "../store/useStore";
import type { Lead } from "../types";

function pillStyle(key: string, small = false): CSSProperties {
  const meta = leadPill(key);
  return {
    display: "inline-flex",
    alignItems: "center",
    background: meta.bg,
    color: meta.color,
    borderRadius: 999,
    padding: small ? "3px 10px" : "5px 12px",
    fontSize: small ? 11.5 : 12.5,
    fontWeight: 600,
    border: "none",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    cursor: "pointer",
  };
}

const filterPill = (on: boolean): CSSProperties => ({
  border: "none",
  background: on ? "var(--card)" : "transparent",
  boxShadow: on ? "0 1px 2px rgba(11,15,25,.12)" : "none",
  borderRadius: 8,
  padding: "6px 11px",
  fontSize: 12.5,
  fontWeight: 600,
  color: on ? "var(--ink)" : "rgba(var(--ink-rgb),.55)",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
});

export function Leads() {
  const isMobile = useIsMobile();
  const leads = useStore((s) => s.leads);
  const fStatus = useStore((s) => s.fLeadStatus);
  const fQuality = useStore((s) => s.fLeadQuality);
  const setLeadFilter = useStore((s) => s.setLeadFilter);
  const updateLead = useStore((s) => s.updateLead);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);

  const today = startOfToday();

  const filtered = useMemo(() => {
    return leads
      .filter((l) => (fStatus === "all" || l.status === fStatus) && (fQuality === "all" || l.quality === fQuality))
      .sort((a, b) => (a.nextFollowUp ?? Infinity) - (b.nextFollowUp ?? Infinity) || b.createdAt - a.createdAt);
  }, [leads, fStatus, fQuality]);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setModalOpen(true);
  };

  const followUpBadge = (l: Lead) => {
    if (l.nextFollowUp === null) return <span style={{ fontSize: 12.5, color: "rgba(var(--ink-rgb),.35)" }}>—</span>;
    const isOverdue = l.nextFollowUp < today && l.status !== "won" && l.status !== "lost";
    const isToday = l.nextFollowUp >= today && l.nextFollowUp < today + 86400000;
    return (
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: isOverdue ? "var(--danger)" : isToday ? "#F5A524" : "rgba(var(--ink-rgb),.6)",
          whiteSpace: "nowrap",
        }}
      >
        {isOverdue ? "overdue · " : isToday ? "today · " : ""}
        {fmtDay(l.nextFollowUp)}
      </span>
    );
  };

  return (
    <div className="anim-sc">
      <Eyebrow index="08" label="outbound" color="#FF8A63" />
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ margin: "0 0 18px", fontSize: isMobile ? 21 : 30, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.1 }}>
            client <i style={{ fontWeight: 600 }}>crm</i>
          </h1>
        </div>
        <button
          onClick={openNew}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 12, padding: "11px 16px", fontSize: 14, fontWeight: 600, fontFamily: "inherit", boxShadow: "0 14px 30px -14px rgba(11,15,25,.55)" }}
        >
          <Icon name="plus" size={16} sw={2} color="#fff" /> new lead
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", fontWeight: 600 }}>status</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, background: "rgba(var(--ink-rgb),.04)", borderRadius: 10, padding: 3 }}>
          {["all", ...LEAD_STATUSES].map((s) => (
            <button key={s} onClick={() => setLeadFilter("status", s)} style={filterPill(fStatus === s)}>{s}</button>
          ))}
        </div>
        <span style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", fontWeight: 600, marginLeft: isMobile ? 0 : 6 }}>quality</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, background: "rgba(var(--ink-rgb),.04)", borderRadius: 10, padding: 3 }}>
          {["all", ...LEAD_QUALITIES].map((q) => (
            <button key={q} onClick={() => setLeadFilter("quality", q)} style={filterPill(fQuality === q)}>{q}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: "var(--card)", border: "1px dashed rgba(var(--ink-rgb),.14)", borderRadius: 16, padding: "32px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>
            {leads.length === 0 ? "no leads yet ✦" : "nothing matches those filters"}
          </div>
          <div style={{ fontSize: 13, color: "rgba(var(--ink-rgb),.55)" }}>
            {leads.length === 0
              ? "add your first prospect — name, where they came from, and when to follow up."
              : "clear a filter or two to see the rest of the pipeline."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((l) => {
            const closed = l.status === "won" || l.status === "lost";
            return (
              <button
                key={l.id}
                className="hov-lift"
                onClick={() => openEdit(l)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  textAlign: "left",
                  background: "var(--card)",
                  border: "1px solid rgba(var(--ink-rgb),.06)",
                  borderRadius: 15,
                  padding: isMobile ? "12px 14px" : "12px 18px",
                  fontFamily: "inherit",
                  boxShadow: "var(--shadow-card)",
                  opacity: closed && l.status === "lost" ? 0.6 : 1,
                  flexWrap: isMobile ? "wrap" : "nowrap",
                  cursor: "pointer",
                }}
              >
                <div style={{ flex: isMobile ? "1 1 100%" : 2, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</span>
                    {l.contact && (
                      <span style={{ fontSize: 12, color: "rgba(var(--ink-rgb),.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.contact}</span>
                    )}
                  </div>
                  {l.notes && (
                    <div style={{ fontSize: 12.5, color: "rgba(var(--ink-rgb),.55)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.notes}
                    </div>
                  )}
                </div>

                <span style={pillStyle(l.from, true)}>{l.from}</span>

                <span
                  role="button"
                  title="cycle quality"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateLead(l.id, { quality: nextOf(LEAD_QUALITIES, l.quality) });
                  }}
                  style={pillStyle(l.quality, true)}
                >
                  {l.quality}
                </span>

                <span
                  role="button"
                  title="cycle status"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateLead(l.id, { status: nextOf(LEAD_STATUSES, l.status) });
                  }}
                  style={pillStyle(l.status, true)}
                >
                  {l.status}
                </span>

                <div style={{ minWidth: isMobile ? undefined : 96, textAlign: isMobile ? "left" : "right" }}>{followUpBadge(l)}</div>

                <Avatar id={l.who} size={28} />
              </button>
            );
          })}
        </div>
      )}

      <LeadFormModal open={modalOpen} onClose={() => setModalOpen(false)} lead={editing} />
    </div>
  );
}
