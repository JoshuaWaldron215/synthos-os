import { useMemo, useState, type CSSProperties } from "react";
import { Eyebrow } from "../components/Eyebrow";
import { Icon } from "../lib/Icon";
import { useIsMobile } from "../lib/useMediaQuery";
import { useStore } from "../store/useStore";
import { ResponsiveModal } from "../components/ResponsiveModal";
import type { VaultKey } from "../types";

function KeyRow({ k, projName }: { k: VaultKey; projName: string }) {
  const revealed = useStore((s) => s.revealed);
  const reveal = useStore((s) => s.reveal);
  const hide = useStore((s) => s.hide);
  const copy = useStore((s) => s.copy);
  const deleteKey = useStore((s) => s.deleteKey);
  const isRevealed = !!revealed[k.id];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 18px", borderBottom: "1px solid rgba(11,15,25,.05)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".02em", fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", color: "#0B0F19", display: "flex", alignItems: "center", gap: 8 }}>
          {k.label}
          <span style={{ fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(11,15,25,.42)", background: "rgba(11,15,25,.05)", padding: "1px 6px", borderRadius: 5, fontFamily: "inherit" }}>{projName}</span>
        </div>
        <div style={{ fontSize: 13, color: "rgba(11,15,25,.55)", fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", marginTop: 3, letterSpacing: ".06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {isRevealed ? k.val : "••••••••••••••••"}
        </div>
      </div>
      <button className="hov-soft" onClick={() => (isRevealed ? hide(k.id) : reveal(k.id))} title="reveal" style={{ display: "flex", background: "transparent", border: "1px solid rgba(11,15,25,.1)", borderRadius: 9, padding: 8 }}>
        <Icon name={isRevealed ? "eyeoff" : "eye"} size={17} color="rgba(11,15,25,.55)" />
      </button>
      <button className="hov-soft" onClick={() => copy(k.val, "copied " + k.label)} title="copy" style={{ display: "flex", background: "transparent", border: "1px solid rgba(11,15,25,.1)", borderRadius: 9, padding: 8 }}>
        <Icon name="copy" size={16} color="rgba(11,15,25,.55)" />
      </button>
      <button className="hov-soft" onClick={() => deleteKey(k.id)} title="delete" style={{ display: "flex", background: "transparent", border: "1px solid rgba(11,15,25,.1)", borderRadius: 9, padding: 8 }}>
        <Icon name="trash" size={16} color="rgba(11,15,25,.55)" />
      </button>
    </div>
  );
}

function AddKeyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const projects = useStore((s) => s.projects);
  const addKey = useStore((s) => s.addKey);
  const [label, setLabel] = useState("");
  const [val, setVal] = useState("");
  const [proj, setProj] = useState("shared");

  const field: CSSProperties = { width: "100%", border: "1px solid rgba(11,15,25,.1)", borderRadius: 12, padding: "11px 13px", fontSize: 16, fontFamily: "inherit", color: "#0B0F19", boxSizing: "border-box" };
  const lbl: CSSProperties = { fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(11,15,25,.45)", fontWeight: 700, display: "block", marginBottom: 7 };

  const submit = () => {
    if (!label.trim() || !val.trim()) return;
    addKey({ label, val, proj });
    setLabel("");
    setVal("");
    setProj("shared");
    onClose();
  };

  return (
    <ResponsiveModal open={open} onClose={onClose} title="new key" width={440}>
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>key name</label>
        <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} placeholder="STRIPE_SECRET_KEY" style={{ ...field, fontFamily: "ui-monospace,Menlo,monospace" }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>value</label>
        <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="sk_live_…" style={{ ...field, fontFamily: "ui-monospace,Menlo,monospace" }} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={lbl}>project</label>
        <select value={proj} onChange={(e) => setProj(e.target.value)} style={field}>
          <option value="shared">shared (studio-wide)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.client}</option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(11,15,25,.1)", borderRadius: 11, padding: "10px 16px", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>cancel</button>
        <button onClick={submit} disabled={!label.trim() || !val.trim()} style={{ background: "#0B0F19", color: "#fff", border: "none", borderRadius: 11, padding: "10px 18px", fontSize: 14, fontWeight: 600, fontFamily: "inherit", opacity: label.trim() && val.trim() ? 1 : 0.5 }}>add key</button>
      </div>
    </ResponsiveModal>
  );
}

export function Vault() {
  const isMobile = useIsMobile();
  const keys = useStore((s) => s.keys);
  const projects = useStore((s) => s.projects);
  const openAudit = useStore((s) => s.openAudit);
  const copyEnv = useStore((s) => s.copyEnv);
  const [addOpen, setAddOpen] = useState(false);

  const nameOf = (proj: string) => (proj === "shared" ? "shared" : projects.find((p) => p.id === proj)?.client ?? proj);

  const groups = useMemo(() => {
    const map = new Map<string, VaultKey[]>();
    for (const k of keys) {
      const arr = map.get(k.proj) ?? [];
      arr.push(k);
      map.set(k.proj, arr);
    }
    // shared first, then projects in their listed order
    const order = ["shared", ...projects.map((p) => p.id)];
    return order
      .filter((id) => map.has(id))
      .map((id) => ({ id, name: nameOf(id), keys: map.get(id)! }))
      .concat(
        [...map.keys()].filter((id) => !order.includes(id)).map((id) => ({ id, name: nameOf(id), keys: map.get(id)! }))
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys, projects]);

  return (
    <div style={{ maxWidth: 880, margin: "0 auto" }} className="anim-sc">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <Eyebrow index="04" label="secrets" />
          <h1 style={{ margin: 0, fontSize: isMobile ? 21 : 30, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.1 }}>
            the <i style={{ fontWeight: 600 }}>vault</i>
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(11,15,25,.5)" }}>keys grouped by project. revealed keys auto-hide after a few seconds; every action is logged.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="hov-soft" onClick={openAudit} style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: "1px solid rgba(11,15,25,.1)", borderRadius: 12, padding: "9px 14px", fontSize: 13, fontWeight: 600, color: "#0B0F19", whiteSpace: "nowrap" }}>
            audit log ↗
          </button>
          <button className="hov-soft" onClick={() => setAddOpen(true)} style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff", border: "1px solid rgba(11,15,25,.1)", borderRadius: 12, padding: "9px 14px", fontSize: 13, fontWeight: 600, color: "#0B0F19", whiteSpace: "nowrap" }}>
            <Icon name="plus" size={15} sw={2} /> new key
          </button>
          <button onClick={copyEnv} style={{ display: "flex", alignItems: "center", gap: 7, background: "#0B0F19", color: "#fff", border: "none", borderRadius: 12, padding: "9px 14px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
            copy as .env
          </button>
        </div>
      </div>

      <AddKeyModal open={addOpen} onClose={() => setAddOpen(false)} />

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {groups.map((g) => (
          <div key={g.id}>
            <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(11,15,25,.4)", fontWeight: 700, margin: "0 4px 8px" }}>
              {g.name} · {g.keys.length}
            </div>
            <div style={{ background: "#fff", border: "1px solid rgba(11,15,25,.06)", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 2px rgba(11,15,25,.04),0 18px 40px -28px rgba(11,15,25,.3)" }}>
              {g.keys.map((k) => (
                <KeyRow key={k.id} k={k} projName={g.name} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
