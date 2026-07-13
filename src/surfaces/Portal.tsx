import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import platesImg from "../assets/plates.png";
import { applyTheme, watchSystemTheme } from "../lib/theme";
import { timeAgo } from "../lib/time";

// The client-facing portal: a branded, read-mostly status page served to
// anyone holding the project's secret link (/c/<token>). Deliberately store-
// free — data comes from /api/portal (service role, whitelist-only), messages
// post through /api/portal-message. No login, no Supabase session.

interface PortalData {
  project: {
    client: string;
    tagline: string;
    status: string;
    shipped: boolean;
    progress: number;
    team: { name: string; role: string; avatar: string | null }[];
  };
  updates: { id: string; by: string; body: string; at: number }[];
  milestones: { title: string; done: boolean }[];
  files: { name: string; size: number; url: string }[];
  messages: { from: string; client: boolean; text: string; at: number }[];
}

const fmtSize = (n: number) => (n > 1e6 ? (n / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1000)) + " KB");

const card: CSSProperties = {
  background: "var(--card)",
  border: "1px solid rgba(var(--ink-rgb),.07)",
  borderRadius: 20,
  padding: "20px 22px",
  boxShadow: "var(--shadow-card)",
};
const label: CSSProperties = {
  fontSize: 11,
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: "rgba(var(--ink-rgb),.5)",
  fontWeight: 700,
  marginBottom: 14,
};

function Initials({ name, url }: { name: string; url?: string | null }) {
  if (url) {
    return <img src={url} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--card)" }} />;
  }
  const init = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, var(--lav-dot), var(--sky-dot))", color: "#0B0F19", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, border: "2px solid var(--card)" }}>
      {init}
    </span>
  );
}

export function Portal() {
  const { token } = useParams();
  const [data, setData] = useState<PortalData | null>(null);
  const [gone, setGone] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem("synthos-portal-name") ?? "");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const threadEnd = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);

  // public page, no store: follow the visitor's OS theme
  useEffect(() => {
    applyTheme("system");
    return watchSystemTheme(() => applyTheme("system"));
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/portal?token=" + encodeURIComponent(token ?? ""));
      if (res.status === 404) {
        setGone(true);
        return;
      }
      if (!res.ok) return;
      setData((await res.json()) as PortalData);
    } catch {
      /* transient — next poll retries */
    }
  }, [token]);

  useEffect(() => {
    load();
    const id = setInterval(load, 25_000);
    return () => clearInterval(id);
  }, [load]);

  // keep the thread pinned to the newest message
  useEffect(() => {
    if (!data?.messages.length) return;
    threadEnd.current?.scrollIntoView({ behavior: firstLoad.current ? "auto" : "smooth", block: "nearest" });
    firstLoad.current = false;
  }, [data?.messages.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !name.trim() || sending) return;
    setSending(true);
    localStorage.setItem("synthos-portal-name", name.trim());
    try {
      const res = await fetch("/api/portal-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), text }),
      });
      if (res.ok) {
        setDraft("");
        await load();
      }
    } finally {
      setSending(false);
    }
  };

  // ---- dead / revoked link ---------------------------------------------------
  if (gone) {
    return (
      <div className="app-frame" style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ ...card, maxWidth: 420, textAlign: "center", padding: "40px 30px" }} className="anim-sc">
          <img src={platesImg} alt="" style={{ width: 110, marginBottom: 8 }} />
          <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, letterSpacing: "-.02em" }}>
            this portal is no longer <i style={{ fontWeight: 600 }}>active</i>
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(var(--ink-rgb),.55)", lineHeight: 1.6 }}>
            the link may have been retired or replaced. reach out to your Synthos team for a fresh one.
          </p>
          <div style={{ marginTop: 22, fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.4)", fontWeight: 700 }}>
            synthos <span style={{ color: "var(--sky-dot)" }}>os</span>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="app-frame" style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(var(--ink-rgb),.5)", fontSize: 13, letterSpacing: ".08em" }}>
        loading your portal…
      </div>
    );
  }

  const p = data.project;
  const doneCount = data.milestones.filter((m) => m.done).length;
  const stagger = (i: number): CSSProperties => ({ animation: `msgIn .4s ${0.06 * i}s ease backwards` });

  return (
    <div className="app-frame app-main" style={{ minHeight: "100dvh", overflowY: "auto" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "34px 18px 80px" }}>
        {/* branded header */}
        <div style={{ textAlign: "center", marginBottom: 26 }} className="anim-sc">
          <img src={platesImg} alt="" style={{ width: 120, marginBottom: 4 }} />
          <div style={{ fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.5)", fontWeight: 700, marginBottom: 10 }}>
            synthos <span style={{ color: "var(--sky-dot)" }}>os</span> · client portal
          </div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.1 }}>
            {p.shipped ? (
              <>
                {p.client.toLowerCase()} — <i style={{ fontWeight: 600 }}>shipped ✦</i>
              </>
            ) : (
              <>
                building <i style={{ fontWeight: 600 }}>{p.client.toLowerCase()}</i>
              </>
            )}
          </h1>
          {p.tagline && <p style={{ margin: "8px 0 0", fontSize: 14.5, color: "rgba(var(--ink-rgb),.55)" }}>{p.tagline.toLowerCase()}</p>}
        </div>

        {/* progress */}
        <div style={{ ...card, marginBottom: 14, ...stagger(1) }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <span style={label}>progress</span>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums", color: p.shipped ? "var(--mint-dot)" : "var(--ink)" }}>
              {p.progress}%
            </span>
          </div>
          <div style={{ position: "relative", height: 14, borderRadius: 999, background: "rgba(var(--ink-rgb),.08)", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: "0 auto 0 0", width: Math.max(2, p.progress) + "%", borderRadius: 999, background: "linear-gradient(90deg, var(--lav-dot), var(--sky-dot), var(--mint-dot))", transition: "width 1.2s cubic-bezier(.22,1,.36,1)", overflow: "hidden" }}>
              <span className="fit-shine" style={{ position: "absolute", inset: 0, width: "38%", background: "linear-gradient(90deg, transparent, rgba(var(--card-rgb),.55), transparent)", animation: "fit-shine 3s ease-in-out infinite" }} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12.5, color: "rgba(var(--ink-rgb),.5)", fontWeight: 600 }}>
            <span>
              status · <span style={{ color: "var(--ink)" }}>{p.status}</span>
            </span>
            {data.milestones.length > 0 && (
              <span>
                {doneCount}/{data.milestones.length} milestones
              </span>
            )}
          </div>
        </div>

        {/* team */}
        {p.team.length > 0 && (
          <div style={{ ...card, marginBottom: 14, display: "flex", alignItems: "center", gap: 12, ...stagger(2) }}>
            <div style={{ display: "flex" }}>
              {p.team.map((t, i) => (
                <span key={i} style={{ marginLeft: i ? -8 : 0, display: "flex" }}>
                  <Initials name={t.name} url={t.avatar} />
                </span>
              ))}
            </div>
            <div style={{ fontSize: 13, color: "rgba(var(--ink-rgb),.6)", lineHeight: 1.45 }}>
              <b style={{ color: "var(--ink)" }}>{p.team.map((t) => t.name.split(" ")[0].toLowerCase()).join(", ")}</b>
              <br />
              your synthos build team
            </div>
          </div>
        )}

        {/* updates */}
        <div style={{ ...card, marginBottom: 14, ...stagger(3) }}>
          <div style={label}>updates from the team</div>
          {data.updates.length === 0 ? (
            <div style={{ fontSize: 13.5, color: "rgba(var(--ink-rgb),.45)" }}>first update coming soon ✦</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {data.updates.map((u, i) => (
                <div key={u.id} style={{ display: "flex", gap: 13 }}>
                  {/* timeline rail */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: i === 0 ? "var(--sky-dot)" : "rgba(var(--ink-rgb),.18)", marginTop: 5, boxShadow: i === 0 ? "0 0 0 4px rgba(51,173,238,.18)" : "none", flex: "0 0 auto" }} />
                    {i < data.updates.length - 1 && <span style={{ width: 1.5, flex: 1, background: "rgba(var(--ink-rgb),.09)", margin: "4px 0" }} />}
                  </div>
                  <div style={{ paddingBottom: i < data.updates.length - 1 ? 16 : 0, minWidth: 0 }}>
                    <div style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{u.body}</div>
                    <div style={{ fontSize: 11.5, color: "rgba(var(--ink-rgb),.42)", marginTop: 3 }}>
                      {u.by.toLowerCase()} · {timeAgo(u.at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* milestones */}
        {data.milestones.length > 0 && (
          <div style={{ ...card, marginBottom: 14, ...stagger(4) }}>
            <div style={label}>milestones</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {data.milestones.map((m, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", flex: "0 0 auto", background: m.done ? "var(--mint-dot)" : "transparent", border: m.done ? "none" : "2px solid rgba(var(--ink-rgb),.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {m.done && (
                      <svg width="12" height="12" viewBox="0 0 24 24">
                        <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#0B0F19" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span style={{ fontSize: 14, color: m.done ? "rgba(var(--ink-rgb),.45)" : "var(--ink)", textDecoration: m.done ? "line-through" : "none" }}>{m.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* files */}
        {data.files.length > 0 && (
          <div style={{ ...card, marginBottom: 14, ...stagger(5) }}>
            <div style={label}>shared files</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {data.files.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noreferrer" className="hov-soft" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(var(--ink-rgb),.08)", textDecoration: "none", color: "var(--ink)" }}>
                  <span style={{ fontSize: 16 }}>📎</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  <span style={{ fontSize: 11.5, color: "rgba(var(--ink-rgb),.45)" }}>{fmtSize(f.size)} ↓</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* messages */}
        <div style={{ ...card, ...stagger(6) }}>
          <div style={label}>message the team</div>
          {data.messages.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 360, overflowY: "auto", marginBottom: 14, paddingRight: 4 }}>
              {data.messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.client ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "82%", padding: "10px 13px", fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", borderRadius: m.client ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: m.client ? "var(--btn-ink)" : "rgba(var(--ink-rgb),.055)", color: m.client ? "#fff" : "var(--ink)" }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", opacity: 0.62, marginBottom: 3 }}>
                      {m.from.toLowerCase()} {m.client ? "" : "· synthos"}
                    </div>
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={threadEnd} />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="your name"
              style={{ border: "1px solid rgba(var(--ink-rgb),.12)", borderRadius: 11, padding: "10px 13px", fontSize: 14, fontFamily: "inherit", background: "var(--card)", color: "var(--ink)", width: 180 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="questions, feedback, anything — the team gets pinged instantly"
                rows={2}
                style={{ flex: 1, border: "1px solid rgba(var(--ink-rgb),.12)", borderRadius: 12, padding: "10px 13px", fontSize: 14, fontFamily: "inherit", background: "var(--card)", color: "var(--ink)", resize: "none" }}
              />
              <button
                onClick={send}
                disabled={sending || !draft.trim() || !name.trim()}
                style={{ alignSelf: "flex-end", background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 12, padding: "11px 17px", fontSize: 13.5, fontWeight: 700, fontFamily: "inherit", opacity: sending || !draft.trim() || !name.trim() ? 0.5 : 1 }}
              >
                {sending ? "…" : "send ✦"}
              </button>
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{ textAlign: "center", marginTop: 30, fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.35)", fontWeight: 700 }}>
          built by synthos <span style={{ color: "var(--sky-dot)" }}>os</span> ✦
        </div>
      </div>
    </div>
  );
}
