import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Eyebrow } from "../components/Eyebrow";
import { Icon } from "../lib/Icon";
import { fieldLabelStyle, fieldStyle } from "../lib/fields";
import { useIsMobile } from "../lib/useMediaQuery";
import { useStore } from "../store/useStore";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { ResponsiveModal } from "../components/ResponsiveModal";
import type { VaultKey, VaultLogin } from "../types";

function KeyRow({ k, projName, flash }: { k: VaultKey; projName: string; flash?: boolean }) {
  const revealed = useStore((s) => s.revealed);
  const reveal = useStore((s) => s.reveal);
  const hide = useStore((s) => s.hide);
  const copy = useStore((s) => s.copy);
  const deleteKey = useStore((s) => s.deleteKey);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const isRevealed = !!revealed[k.id];

  // arriving from global search: scroll to and briefly flash this row
  useEffect(() => {
    if (flash) rowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [flash]);

  return (
    <div
      ref={rowRef}
      style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 18px", borderBottom: "1px solid rgba(var(--ink-rgb),.05)", animation: flash ? "rowFlash 1.6s ease 1" : undefined }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".02em", fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
          {k.label}
          <span style={{ fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", background: "rgba(var(--ink-rgb),.05)", padding: "1px 6px", borderRadius: 5, fontFamily: "inherit" }}>{projName}</span>
        </div>
        <div style={{ fontSize: 13, color: "rgba(var(--ink-rgb),.55)", fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", marginTop: 3, letterSpacing: ".06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {isRevealed ? k.val : "••••••••••••••••"}
        </div>
      </div>
      <button className="hov-soft" onClick={() => (isRevealed ? hide(k.id) : reveal(k.id))} title="reveal" style={{ display: "flex", background: "transparent", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 9, padding: 8 }}>
        <Icon name={isRevealed ? "eyeoff" : "eye"} size={17} color="rgba(var(--ink-rgb),.55)" />
      </button>
      <button className="hov-soft" onClick={() => copy(k.val, "copied " + k.label)} title="copy" style={{ display: "flex", background: "transparent", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 9, padding: 8 }}>
        <Icon name="copy" size={16} color="rgba(var(--ink-rgb),.55)" />
      </button>
      <button className="hov-soft" onClick={() => setConfirmDelete(true)} title="delete" style={{ display: "flex", background: "transparent", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 9, padding: 8 }}>
        <Icon name="trash" size={16} color="rgba(var(--ink-rgb),.55)" />
      </button>
      <ConfirmDialog
        open={confirmDelete}
        title="delete key"
        body={k.label + " will be permanently removed from the vault. its value cannot be recovered."}
        onConfirm={() => deleteKey(k.id)}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function LoginRow({ l, projName }: { l: VaultLogin; projName: string }) {
  const revealed = useStore((s) => s.revealed);
  const reveal = useStore((s) => s.reveal);
  const hide = useStore((s) => s.hide);
  const copy = useStore((s) => s.copy);
  const deleteLogin = useStore((s) => s.deleteLogin);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isRevealed = !!revealed[l.id];
  const href = l.url ? (l.url.startsWith("http") ? l.url : "https://" + l.url) : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "15px 18px", borderBottom: "1px solid rgba(var(--ink-rgb),.05)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {l.tool}
          <span style={{ fontSize: 9.5, letterSpacing: ".08em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", background: "rgba(var(--ink-rgb),.05)", padding: "1px 6px", borderRadius: 5 }}>{projName}</span>
          {href && (
            <a href={href} target="_blank" rel="noreferrer" title={"open " + l.tool + " ↗"} style={{ fontSize: 11, fontWeight: 600, color: "#33ADEE", textDecoration: "none" }}>
              open ↗
            </a>
          )}
        </div>
        <button
          className="hov-rename"
          onClick={() => copy(l.username, "copied username")}
          title="copy username"
          style={{ display: "block", background: "transparent", border: "none", padding: 0, fontSize: 12.5, color: "rgba(var(--ink-rgb),.6)", fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", marginTop: 3, cursor: "pointer", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {l.username || "—"}
        </button>
        <div style={{ fontSize: 13, color: "rgba(var(--ink-rgb),.55)", fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", marginTop: 2, letterSpacing: ".06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {isRevealed ? l.password : "••••••••••••"}
        </div>
      </div>
      <button className="hov-soft" onClick={() => (isRevealed ? hide(l.id) : reveal(l.id))} title="reveal password" style={{ display: "flex", background: "transparent", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 9, padding: 8 }}>
        <Icon name={isRevealed ? "eyeoff" : "eye"} size={17} color="rgba(var(--ink-rgb),.55)" />
      </button>
      <button className="hov-soft" onClick={() => copy(l.password, "copied " + l.tool + " password")} title="copy password" style={{ display: "flex", background: "transparent", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 9, padding: 8 }}>
        <Icon name="copy" size={16} color="rgba(var(--ink-rgb),.55)" />
      </button>
      <button className="hov-soft" onClick={() => setConfirmDelete(true)} title="delete" style={{ display: "flex", background: "transparent", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 9, padding: 8 }}>
        <Icon name="trash" size={16} color="rgba(var(--ink-rgb),.55)" />
      </button>
      <ConfirmDialog
        open={confirmDelete}
        title="delete login"
        body={"the " + l.tool + " login will be permanently removed from the vault."}
        onConfirm={() => deleteLogin(l.id)}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function AddLoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const projects = useStore((s) => s.projects);
  const addLogin = useStore((s) => s.addLogin);
  const [tool, setTool] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [proj, setProj] = useState("shared");

  const field = fieldStyle;
  const lbl = fieldLabelStyle;
  const ok = tool.trim() && password.trim();

  const submit = () => {
    if (!ok) return;
    addLogin({ tool, username, password, url, proj });
    setTool("");
    setUsername("");
    setPassword("");
    setUrl("");
    setProj("shared");
    onClose();
  };

  return (
    <ResponsiveModal open={open} onClose={onClose} title="new login" width={440}>
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>tool / account</label>
        <input autoFocus value={tool} onChange={(e) => setTool(e.target.value)} placeholder="Instagram — @runsynthos" style={field} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>username / email</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="team@runsynthos.com" autoComplete="off" style={{ ...field, fontFamily: "ui-monospace,Menlo,monospace" }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" style={{ ...field, fontFamily: "ui-monospace,Menlo,monospace" }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>login url (optional)</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="instagram.com" style={field} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={lbl}>project</label>
        <select value={proj} onChange={(e) => setProj(e.target.value)} style={field}>
          <option value="shared">shared (team-wide)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.client}</option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 11, padding: "10px 16px", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>cancel</button>
        <button onClick={submit} disabled={!ok} style={{ background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 11, padding: "10px 18px", fontSize: 14, fontWeight: 600, fontFamily: "inherit", opacity: ok ? 1 : 0.5 }}>add login</button>
      </div>
    </ResponsiveModal>
  );
}

function AddKeyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const projects = useStore((s) => s.projects);
  const addKey = useStore((s) => s.addKey);
  const [label, setLabel] = useState("");
  const [val, setVal] = useState("");
  const [proj, setProj] = useState("shared");

  const field = fieldStyle;
  const lbl = fieldLabelStyle;

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
          <option value="shared">shared (team-wide)</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.client}</option>
          ))}
        </select>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 11, padding: "10px 16px", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>cancel</button>
        <button onClick={submit} disabled={!label.trim() || !val.trim()} style={{ background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 11, padding: "10px 18px", fontSize: 14, fontWeight: 600, fontFamily: "inherit", opacity: label.trim() && val.trim() ? 1 : 0.5 }}>add key</button>
      </div>
    </ResponsiveModal>
  );
}

export function Vault() {
  const isMobile = useIsMobile();
  const keys = useStore((s) => s.keys);
  const logins = useStore((s) => s.logins);
  const projects = useStore((s) => s.projects);
  const openAudit = useStore((s) => s.openAudit);
  const copyEnv = useStore((s) => s.copyEnv);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoginOpen, setAddLoginOpen] = useState(false);
  const [tab, setTab] = useState<"keys" | "logins">("keys");
  const location = useLocation();
  const highlightId = (location.state as { highlight?: string } | null)?.highlight;

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
          <Eyebrow index="08" label="secrets" />
          <h1 style={{ margin: 0, fontSize: isMobile ? 21 : 30, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.1 }}>
            the <i style={{ fontWeight: 600 }}>vault</i>
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(var(--ink-rgb),.5)" }}>api keys and shared tool logins — encrypted at rest, auto-hide on reveal, every action logged.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="hov-soft" onClick={openAudit} style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--card)", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 12, padding: "9px 14px", fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>
            audit log
          </button>
          {tab === "keys" ? (
            <>
              <button className="hov-soft" onClick={() => setAddOpen(true)} style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--card)", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 12, padding: "9px 14px", fontSize: 13, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }}>
                <Icon name="plus" size={15} sw={2} /> new key
              </button>
              <button onClick={copyEnv} style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 12, padding: "9px 14px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                copy as .env
              </button>
            </>
          ) : (
            <button onClick={() => setAddLoginOpen(true)} style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 12, padding: "9px 14px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", fontFamily: "inherit" }}>
              <Icon name="plus" size={15} sw={2} color="#fff" /> new login
            </button>
          )}
        </div>
      </div>

      {/* keys | logins */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {(["keys", "logins"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ background: tab === t ? "var(--btn-ink)" : "var(--card)", color: tab === t ? "#fff" : "rgba(var(--ink-rgb),.55)", border: tab === t ? "none" : "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 999, padding: "8px 16px", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}
          >
            {t === "keys" ? "api keys" : "logins"}
            <span style={{ marginLeft: 6, opacity: 0.6, fontWeight: 600 }}>{t === "keys" ? keys.length : logins.length}</span>
          </button>
        ))}
      </div>

      <AddKeyModal open={addOpen} onClose={() => setAddOpen(false)} />
      <AddLoginModal open={addLoginOpen} onClose={() => setAddLoginOpen(false)} />

      {tab === "logins" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {logins.length === 0 ? (
            <div style={{ background: "var(--card)", border: "1px dashed rgba(var(--ink-rgb),.14)", borderRadius: 18, padding: "44px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>no shared logins yet</div>
              <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "rgba(var(--ink-rgb),.5)" }}>IG, gmail, skool, canva — one place for the team's accounts. passwords are encrypted at rest.</p>
              <button className="hov-soft" onClick={() => setAddLoginOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 12, padding: "10px 16px", fontSize: 13.5, fontWeight: 600, fontFamily: "inherit" }}>
                <Icon name="plus" size={15} sw={2.2} color="#fff" /> add your first login
              </button>
            </div>
          ) : (
            <div style={{ background: "var(--card)", border: "1px solid rgba(var(--ink-rgb),.06)", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 2px rgba(11,15,25,.04),0 18px 40px -28px rgba(11,15,25,.3)" }}>
              {logins.map((l) => (
                <LoginRow key={l.id} l={l} projName={nameOf(l.proj)} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "keys" && (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {groups.map((g) => (
          <div key={g.id}>
            <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", fontWeight: 700, margin: "0 4px 8px" }}>
              {g.name} · {g.keys.length}
            </div>
            <div style={{ background: "var(--card)", border: "1px solid rgba(var(--ink-rgb),.06)", borderRadius: 18, overflow: "hidden", boxShadow: "0 1px 2px rgba(11,15,25,.04),0 18px 40px -28px rgba(11,15,25,.3)" }}>
              {g.keys.map((k) => (
                <KeyRow key={k.id} k={k} projName={g.name} flash={k.id === highlightId} />
              ))}
            </div>
          </div>
        ))}
        {keys.length === 0 && (
          <div style={{ background: "var(--card)", border: "1px dashed rgba(var(--ink-rgb),.14)", borderRadius: 18, padding: "44px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>the vault is empty</div>
            <p style={{ margin: "0 0 16px", fontSize: 13.5, color: "rgba(var(--ink-rgb),.5)" }}>store API keys and secrets here — shared team-wide or scoped to a project.</p>
            <button className="hov-soft" onClick={() => setAddOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 12, padding: "10px 16px", fontSize: 13.5, fontWeight: 600, fontFamily: "inherit" }}>
              <Icon name="plus" size={15} sw={2.2} color="#fff" /> add your first key
            </button>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
