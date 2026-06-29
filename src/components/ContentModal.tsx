import { Icon } from "../lib/Icon";
import { CONTENT_KINDS, CONTENT_LANES } from "../lib/board";
import { SM } from "../lib/style";
import { useUser } from "../lib/useUser";
import { useStore } from "../store/useStore";
import { Avatar } from "./Avatar";
import { ResponsiveModal } from "./ResponsiveModal";

export function ContentModal() {
  const openContentId = useStore((s) => s.openContentId);
  const content = useStore((s) => s.content);
  const closeContent = useStore((s) => s.closeContent);
  const patchContent = useStore((s) => s.patchContent);
  const cycleContentAssignee = useStore((s) => s.cycleContentAssignee);
  const deleteContent = useStore((s) => s.deleteContent);

  const c = content.find((x) => x.id === openContentId);
  const assignee = useUser(c ? c.who : 0);
  if (!c) return null;

  const laneDef = CONTENT_LANES.find((l) => l.key === c.lane) || CONTENT_LANES[0];
  const accent = SM[laneDef.accent];

  return (
    <ResponsiveModal open={!!c} onClose={closeContent} width={480} showHandle>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: accent.dot }} />
          <span style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(11,15,25,.4)", fontWeight: 600 }}>{laneDef.label}</span>
        </div>
        <button onClick={closeContent} style={{ display: "flex", background: "transparent", border: "none", padding: 2 }}>
          <Icon name="close" size={18} sw={1.8} color="rgba(11,15,25,.5)" />
        </button>
      </div>

      <textarea
        value={c.title}
        onChange={(e) => patchContent(c.id, { title: e.target.value })}
        rows={2}
        placeholder="content idea / title…"
        style={{ width: "100%", border: "none", resize: "none", fontSize: 19, fontWeight: 700, letterSpacing: "-.012em", lineHeight: 1.25, fontFamily: "inherit", color: "#0B0F19", background: "transparent", marginBottom: 4, padding: 0 }}
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0 18px" }}>
        <button onClick={() => cycleContentAssignee(c.id)} title="reassign" style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(11,15,25,.04)", border: "none", borderRadius: 999, padding: "4px 12px 4px 4px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: "#0B0F19" }}>
          <Avatar id={c.who} size={28} />
          {assignee.name}
        </button>
      </div>

      <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(11,15,25,.4)", fontWeight: 600, marginBottom: 8 }}>format</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {CONTENT_KINDS.map((k) => {
          const active = c.kind === k;
          return (
            <button
              key={k}
              onClick={() => patchContent(c.id, { kind: k })}
              style={{ border: active ? "1px solid rgba(96,200,255,.55)" : "1px solid rgba(11,15,25,.1)", background: active ? "rgba(96,200,255,.12)" : "#fff", borderRadius: 999, padding: "6px 12px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: "#0B0F19" }}
            >
              {k}
            </button>
          );
        })}
      </div>
      <input
        value={c.kind}
        onChange={(e) => patchContent(c.id, { kind: e.target.value })}
        placeholder="or type a custom format…"
        style={{ width: "100%", border: "1px solid rgba(11,15,25,.1)", borderRadius: 12, padding: "10px 12px", fontSize: 16, fontFamily: "inherit", color: "#0B0F19", marginBottom: 18, background: "#fff", boxSizing: "border-box" }}
      />

      <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(11,15,25,.4)", fontWeight: 600, marginBottom: 8 }}>move to</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {CONTENT_LANES.map((l) => {
          const active = l.key === c.lane;
          return (
            <button
              key={l.key}
              onClick={() => patchContent(c.id, { lane: l.key })}
              style={{ display: "flex", alignItems: "center", gap: 6, border: active ? "1px solid rgba(96,200,255,.55)" : "1px solid rgba(11,15,25,.1)", background: active ? "rgba(96,200,255,.12)" : "#fff", borderRadius: 999, padding: "6px 12px", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, color: "#0B0F19" }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: SM[l.accent].dot }} />
              {l.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 4 }}>
        <button onClick={() => deleteContent(c.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", fontSize: 13, fontWeight: 600, color: "#B5462A", fontFamily: "inherit", padding: "6px 2px" }}>
          <Icon name="trash" size={16} sw={1.7} color="#B5462A" /> delete
        </button>
        <button onClick={closeContent} style={{ background: "#0B0F19", color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>
          done
        </button>
      </div>
    </ResponsiveModal>
  );
}
