import { Fragment, useMemo, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { Avatar } from "../components/Avatar";
import { Eyebrow } from "../components/Eyebrow";
import { LeadFormModal } from "../components/LeadFormModal";
import { USERS } from "../data/seed";
import { Icon } from "../lib/Icon";
import { LEAD_QUALITIES, LEAD_STATUSES, fmtDay, leadPill, nextOf, startOfToday, webHref, webLabel } from "../lib/leads";
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
  padding: "7px 12px", // comfortable touch target on mobile rails
  fontSize: 12.5,
  fontWeight: 600,
  color: on ? "var(--ink)" : "rgba(var(--ink-rgb),.55)",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
  flex: "0 0 auto",
  transition: "background .15s, color .15s",
});

/** who a lead is credited to — an outreach login wins over the builder slot,
 *  since outreach leads land on a builder as owner but weren't added by them */
const creditOf = (l: Lead): string => l.via || String(l.who);

const linkStyle: CSSProperties = { color: "#33ADEE", fontWeight: 600, textDecoration: "none" };

/** website + email are real links; the card's click-through is suppressed on them */
function ContactLine({ lead, style }: { lead: Lead; style: CSSProperties }) {
  const stop = (e: MouseEvent) => e.stopPropagation();
  const bits: ReactNode[] = [];
  if (lead.website)
    bits.push(
      <a key="w" href={webHref(lead.website)} target="_blank" rel="noreferrer" onClick={stop} title={lead.website} style={linkStyle}>
        {webLabel(lead.website)} ↗
      </a>,
    );
  if (lead.email)
    bits.push(
      <a key="e" href={"mailto:" + lead.email} onClick={stop} title={"email " + lead.email} style={linkStyle}>
        {lead.email}
      </a>,
    );
  if (lead.contact) bits.push(<span key="c">{lead.contact}</span>);
  if (bits.length === 0) return null;
  return (
    <span style={{ display: "block", minWidth: 0, ...style }}>
      {bits.map((bit, i) => (
        <Fragment key={i}>
          {i > 0 && <span style={{ opacity: 0.45 }}> · </span>}
          {bit}
        </Fragment>
      ))}
    </span>
  );
}

/** who submitted it, when it came in through an outreach console login */
function ViaBadge({ via }: { via: string }) {
  return (
    <span
      title={"submitted by " + via + " (outreach)"}
      style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase", color: "#1F8F6E", background: "rgba(126,230,193,.2)", padding: "2px 7px", borderRadius: 5, flex: "0 0 auto" }}
    >
      via {via}
    </span>
  );
}

export function Leads() {
  const isMobile = useIsMobile();
  const leads = useStore((s) => s.leads);
  const fStatus = useStore((s) => s.fLeadStatus);
  const fQuality = useStore((s) => s.fLeadQuality);
  const fDate = useStore((s) => s.fLeadDate);
  const fWho = useStore((s) => s.fLeadWho);
  const setLeadFilter = useStore((s) => s.setLeadFilter);
  const updateLead = useStore((s) => s.updateLead);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);

  const today = startOfToday();
  const DAY = 86400000;

  // next follow-up buckets — "open" means the lead is still in play
  const matchesDate = (l: Lead): boolean => {
    const open = l.status !== "won" && l.status !== "lost";
    switch (fDate) {
      case "overdue":
        return l.nextFollowUp !== null && l.nextFollowUp < today && open;
      case "today":
        return l.nextFollowUp !== null && l.nextFollowUp >= today && l.nextFollowUp < today + DAY;
      case "this week":
        return l.nextFollowUp !== null && l.nextFollowUp >= today && l.nextFollowUp < today + 7 * DAY;
      case "no date":
        return l.nextFollowUp === null;
      default:
        return true;
    }
  };

  const filtered = useMemo(() => {
    return leads
      .filter(
        (l) =>
          (fStatus === "all" || l.status === fStatus) &&
          (fQuality === "all" || l.quality === fQuality) &&
          (fWho === "all" || creditOf(l) === fWho) &&
          matchesDate(l),
      )
      .sort((a, b) => (a.nextFollowUp ?? Infinity) - (b.nextFollowUp ?? Infinity) || b.createdAt - a.createdAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, fStatus, fQuality, fDate, fWho]);

  // builders always show; outreach logins appear once they've submitted something
  const whoOptions = useMemo(() => {
    const vias = [...new Set(leads.map((l) => l.via).filter((v): v is string => !!v))].sort();
    return [
      { value: "all", label: "all" },
      ...USERS.map((u) => ({ value: String(u.id), label: u.first.toLowerCase() })),
      ...vias.map((v) => ({ value: v, label: v })),
    ];
  }, [leads]);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (lead: Lead) => {
    setEditing(lead);
    setModalOpen(true);
  };

  // the card holds real links now, so it can't be a <button> (no interactive
  // descendants) — role + key handling keep it operable from the keyboard
  const cardProps = (l: Lead) => ({
    role: "button",
    tabIndex: 0,
    onClick: () => openEdit(l),
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openEdit(l);
      }
    },
  });

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
      <Eyebrow index="01" label="outbound" color="#FF8A63" />
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

      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center", gap: isMobile ? 8 : 14, marginBottom: 16, flexWrap: isMobile ? "nowrap" : "wrap" }}>
        {(
          [
            { label: "status", options: ["all", ...LEAD_STATUSES].map((o) => ({ value: o, label: o })), active: fStatus, group: "status" as const },
            { label: "quality", options: ["all", ...LEAD_QUALITIES].map((o) => ({ value: o, label: o })), active: fQuality, group: "quality" as const },
            { label: "due", options: ["all", "overdue", "today", "this week", "no date"].map((o) => ({ value: o, label: o })), active: fDate, group: "date" as const },
            { label: "added by", options: whoOptions, active: fWho, group: "who" as const },
          ]
        ).map((g) => (
          <div key={g.group} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", fontWeight: 600, flex: "0 0 auto", width: isMobile ? 76 : undefined }}>
              {g.label}
            </span>
            {/* one rail per group — scrolls sideways on mobile instead of wrapping */}
            <div style={{ display: "flex", gap: 4, background: "rgba(var(--ink-rgb),.04)", borderRadius: 10, padding: 3, overflowX: isMobile ? "auto" : undefined, flexWrap: isMobile ? "nowrap" : "wrap", maxWidth: "100%", WebkitOverflowScrolling: "touch" }}>
              {g.options.map((opt) => (
                <button key={opt.value} onClick={() => setLeadFilter(g.group, opt.value)} style={filterPill(g.active === opt.value)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
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
            const qualityPill = (
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
            );
            const statusPill = (
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
            );
            const cardStyle = {
              width: "100%",
              textAlign: "left" as const,
              background: "var(--card)",
              border: "1px solid rgba(var(--ink-rgb),.06)",
              borderRadius: 15,
              fontFamily: "inherit",
              boxShadow: "var(--shadow-card)",
              opacity: l.status === "lost" ? 0.6 : 1,
              cursor: "pointer",
            };

            if (isMobile) {
              // stacked card: identity row → notes → pills + follow-up
              return (
                <div key={l.id} {...cardProps(l)} style={{ ...cardStyle, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 8, padding: "13px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.company || l.name}</div>
                        {l.via && <ViaBadge via={l.via} />}
                      </div>
                      <ContactLine lead={l} style={{ fontSize: 12, color: "rgba(var(--ink-rgb),.5)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} />
                    </div>
                    <Avatar id={l.who} size={30} />
                  </div>
                  {l.notes && (
                    <div style={{ fontSize: 12.5, color: "rgba(var(--ink-rgb),.55)", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {l.notes}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={pillStyle(l.from, true)}>{l.from}</span>
                    {qualityPill}
                    {statusPill}
                    <span style={{ marginLeft: "auto" }}>{followUpBadge(l)}</span>
                  </div>
                </div>
              );
            }

            // desktop: single scannable row
            return (
              <div key={l.id} className="hov-lift" {...cardProps(l)} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12, padding: "12px 18px" }}>
                <div style={{ flex: 2, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "0 1 auto" }}>{l.company || l.name}</span>
                    {l.via && <ViaBadge via={l.via} />}
                    <ContactLine lead={l} style={{ fontSize: 12, color: "rgba(var(--ink-rgb),.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} />
                  </div>
                  {l.notes && (
                    <div style={{ fontSize: 12.5, color: "rgba(var(--ink-rgb),.55)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {l.notes}
                    </div>
                  )}
                </div>
                <span style={pillStyle(l.from, true)}>{l.from}</span>
                {qualityPill}
                {statusPill}
                <div style={{ minWidth: 96, textAlign: "right" }}>{followUpBadge(l)}</div>
                <Avatar id={l.who} size={28} />
              </div>
            );
          })}
        </div>
      )}

      <LeadFormModal open={modalOpen} onClose={() => setModalOpen(false)} lead={editing} />
    </div>
  );
}
