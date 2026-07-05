import { useEffect, useState } from "react";
import { USERS } from "../data/seed";
import { fieldLabelStyle, fieldStyle } from "../lib/fields";
import { LEAD_QUALITIES, LEAD_SOURCES, LEAD_STATUSES, leadPill } from "../lib/leads";
import { useStore } from "../store/useStore";
import { Avatar } from "./Avatar";
import { ConfirmDialog } from "./ConfirmDialog";
import { ResponsiveModal } from "./ResponsiveModal";
import type { Lead, LeadQuality, LeadSource, LeadStatus } from "../types";

const field = fieldStyle;
const labelStyle = fieldLabelStyle;

// date <input> ↔ epoch ms (noon local, so timezone shifts can't move the day)
const toDateInput = (ms: number | null) => (ms ? new Date(ms).toISOString().slice(0, 10) : "");
const fromDateInput = (v: string) => (v ? new Date(v + "T12:00:00").getTime() : null);

function PillRow<T extends string>({ options, value, onPick }: { options: readonly T[]; value: T; onPick: (v: T) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((opt) => {
        const on = value === opt;
        const meta = leadPill(opt);
        return (
          <button
            key={opt}
            onClick={() => onPick(opt)}
            style={{
              border: on ? `1px solid ${meta.color}` : "1px solid rgba(var(--ink-rgb),.1)",
              background: on ? meta.bg : "var(--card)",
              color: on ? meta.color : "rgba(var(--ink-rgb),.6)",
              borderRadius: 999,
              padding: "6px 13px",
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: "inherit",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function LeadFormModal({ open, onClose, lead }: { open: boolean; onClose: () => void; lead?: Lead | null }) {
  const currentUserId = useStore((s) => s.currentUserId);
  const addLead = useStore((s) => s.addLead);
  const updateLead = useStore((s) => s.updateLead);
  const deleteLead = useStore((s) => s.deleteLead);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [from, setFrom] = useState<LeadSource>("outbound");
  const [quality, setQuality] = useState<LeadQuality>("warm");
  const [status, setStatus] = useState<LeadStatus>("new");
  const [notes, setNotes] = useState("");
  const [lastFU, setLastFU] = useState("");
  const [nextFU, setNextFU] = useState("");
  const [who, setWho] = useState(currentUserId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(lead?.name ?? "");
    setContact(lead?.contact ?? "");
    setFrom(lead?.from ?? "outbound");
    setQuality(lead?.quality ?? "warm");
    setStatus(lead?.status ?? "new");
    setNotes(lead?.notes ?? "");
    setLastFU(toDateInput(lead?.lastFollowUp ?? null));
    setNextFU(toDateInput(lead?.nextFollowUp ?? null));
    setWho(lead?.who ?? currentUserId);
    setConfirmDelete(false);
  }, [open, lead, currentUserId]);

  const save = () => {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      contact: contact.trim(),
      from,
      quality,
      status,
      notes: notes.trim(),
      lastFollowUp: fromDateInput(lastFU),
      nextFollowUp: fromDateInput(nextFU),
      who,
    };
    if (lead) updateLead(lead.id, data);
    else addLead(data);
    onClose();
  };

  return (
    <ResponsiveModal open={open} onClose={onClose} title={lead ? "edit lead" : "new lead"} width={470}>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>name</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maya @ Acme Dental" style={field} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>contact</label>
        <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="email · phone · @handle" style={field} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>from</label>
        <PillRow options={LEAD_SOURCES} value={from} onPick={setFrom} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>lead quality</label>
        <PillRow options={LEAD_QUALITIES} value={quality} onPick={setQuality} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>status</label>
        <PillRow options={LEAD_STATUSES} value={status} onPick={setStatus} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>notes / pain points</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="what hurts, what they asked for, objections…" style={{ ...field, resize: "vertical", lineHeight: 1.45 }} />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={labelStyle}>last follow-up</label>
          <input type="date" value={lastFU} onChange={(e) => setLastFU(e.target.value)} style={field} />
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={labelStyle}>next follow-up</label>
          <input type="date" value={nextFU} onChange={(e) => setNextFU(e.target.value)} style={field} />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>owner</label>
        <div style={{ display: "flex", gap: 7 }}>
          {USERS.map((u) => {
            const on = who === u.id;
            return (
              <button
                key={u.id}
                onClick={() => setWho(u.id)}
                title={u.name}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 2,
                  borderRadius: "50%",
                  boxShadow: on ? "0 0 0 2px var(--sky-dot)" : "none",
                }}
              >
                <Avatar id={u.id} size={34} />
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {lead && (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ background: "transparent", border: "1px solid rgba(229,72,77,.4)", color: "var(--danger)", borderRadius: 12, padding: "11px 16px", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}
          >
            delete
          </button>
        )}
        <button
          onClick={save}
          disabled={!name.trim()}
          style={{ flex: 1, background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 16px", fontSize: 14.5, fontWeight: 600, fontFamily: "inherit", opacity: name.trim() ? 1 : 0.6 }}
        >
          {lead ? "save lead" : "add lead ✦"}
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="delete this lead?"
        body={`"${name}" and its notes will be removed for the whole team.`}
        onConfirm={() => {
          if (lead) deleteLead(lead.id);
          onClose();
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </ResponsiveModal>
  );
}
