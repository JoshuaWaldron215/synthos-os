import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eyebrow } from "../components/Eyebrow";
import { Avatar } from "../components/Avatar";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { WinFormModal } from "../components/WinFormModal";
import { Icon } from "../lib/Icon";
import { sumMoney } from "../lib/money";
import { timeAgo } from "../lib/time";
import { useIsMobile } from "../lib/useMediaQuery";
import { useStore } from "../store/useStore";
import type { Win } from "../types";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: "1 1 150px", background: "var(--card)", border: "1px solid rgba(var(--ink-rgb),.06)", borderRadius: 16, padding: "16px 18px", boxShadow: "var(--shadow-card)" }}>
      <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", marginTop: 4 }}>{value}</div>
    </div>
  );
}

function WinRow({ win, num, onEdit }: { win: Win; num: number; onEdit: (w: Win) => void }) {
  const navigate = useNavigate();
  const projName = useStore((s) => s.projects.find((p) => p.id === win.proj)?.client);
  const deleteWin = useStore((s) => s.deleteWin);
  const showRevenue = useStore((s) => s.showRevenue);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const meta = [win.note, projName].filter(Boolean).join(" · ");

  return (
    <div className="hov-task" style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--card)", border: "1px solid rgba(var(--ink-rgb),.06)", borderRadius: 16, padding: "16px 18px", boxShadow: "var(--shadow-card)" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(var(--ink-rgb),.28)", fontVariantNumeric: "tabular-nums", letterSpacing: ".04em", flex: "0 0 auto" }}>{String(num).padStart(2, "0")}</span>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#2FC197", boxShadow: "0 0 0 4px rgba(126,230,193,.22)", flex: "0 0 auto" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.01em" }}>{win.title}</span>
          {win.tag && <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#1F8F6E", background: "rgba(126,230,193,.22)", padding: "2px 8px", borderRadius: 6 }}>{win.tag}</span>}
          {win.amount && showRevenue && <span style={{ fontSize: 12.5, fontWeight: 700, color: "#1F8F6E", fontVariantNumeric: "tabular-nums" }}>+{win.amount}</span>}
        </div>
        <div style={{ fontSize: 12.5, color: "rgba(var(--ink-rgb),.55)", marginTop: 2 }}>
          {meta}
          {meta && " · "}
          {timeAgo(win.createdAt)}
        </div>
      </div>
      {win.proj && projName && (
        <button className="hov-soft" onClick={() => navigate("/project/" + win.proj)} title={"go to " + projName} style={{ display: "flex", background: "transparent", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 9, padding: 8 }}>
          <Icon name="arrowr" size={15} color="rgba(var(--ink-rgb),.5)" />
        </button>
      )}
      <Avatar id={win.who} size={28} />
      <button className="hov-soft" onClick={() => onEdit(win)} title="edit" style={{ display: "flex", background: "transparent", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 9, padding: 8 }}>
        <Icon name="note" size={15} color="rgba(var(--ink-rgb),.5)" />
      </button>
      <button className="hov-soft" onClick={() => setConfirmDelete(true)} title="delete" style={{ display: "flex", background: "transparent", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 9, padding: 8 }}>
        <Icon name="trash" size={15} color="rgba(var(--ink-rgb),.5)" />
      </button>
      <ConfirmDialog
        open={confirmDelete}
        title="delete win"
        body={'"' + win.title + '" will be removed from the list.'}
        onConfirm={() => deleteWin(win.id)}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

export function Wins() {
  const isMobile = useIsMobile();
  const projects = useStore((s) => s.projects);
  const wins = useStore((s) => s.wins);
  const showRevenue = useStore((s) => s.showRevenue);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Win | null>(null);

  const mrr = sumMoney(projects.map((p) => p.rev));
  const earned = sumMoney([...projects.map((p) => p.earned), ...wins.map((w) => w.amount)]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (w: Win) => {
    setEditing(w);
    setFormOpen(true);
  };

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }} className="anim-sc">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <Eyebrow index="07" label="momentum" color="#2FC197" />
          <h1 style={{ margin: "0 0 4px", fontSize: isMobile ? 21 : 30, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.1 }}>
            recent <i style={{ fontWeight: 600 }}>wins</i>
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(var(--ink-rgb),.5)" }}>the stuff worth celebrating. shipped, fixed, and crossed.</p>
        </div>
        <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 12, padding: "10px 15px", fontSize: 13.5, fontWeight: 600, fontFamily: "inherit", whiteSpace: "nowrap" }}>
          <Icon name="plus" size={16} sw={2} color="#fff" /> log a win
        </button>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 22 }}>
        <StatCard label="monthly retainers" value={showRevenue ? mrr + " / mo" : "•••"} />
        <StatCard label="total earned" value={showRevenue ? earned : "•••"} />
        <StatCard label="active projects" value={String(projects.filter((p) => p.status !== "shipped").length)} />
      </div>

      <WinFormModal open={formOpen} onClose={() => setFormOpen(false)} win={editing} />

      {wins.length === 0 ? (
        <div style={{ background: "var(--card)", border: "1px dashed rgba(var(--ink-rgb),.14)", borderRadius: 16, padding: "32px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 4 }}>no wins logged yet</div>
          <div style={{ fontSize: 13, color: "rgba(var(--ink-rgb),.55)" }}>ship something, then come back and brag a little.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {wins.map((w, i) => (
            <WinRow key={w.id} win={w} num={i + 1} onEdit={openEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
