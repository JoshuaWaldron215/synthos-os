import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import platesImg from "../assets/plates.png";
import { applyTheme, watchSystemTheme } from "../lib/theme";
import { timeAgo } from "../lib/time";

// The outreach console: a scoped, standalone surface for a contractor who
// only inputs outbound leads. Deliberately store-free and session-free —
// everything goes through /api/outreach, which is the only thing with
// database access. No Supabase session exists here, so nothing else in the
// workspace is reachable even from devtools.

const STATUSES = ["new", "contacted", "call booked", "proposal", "won", "lost"] as const;
const QUALITIES = ["cold", "warm", "hot"] as const;
type Status = (typeof STATUSES)[number];
type Quality = (typeof QUALITIES)[number];

const STATUS_COLOR: Record<Status, string> = {
  new: "#8A84F0",
  contacted: "#33ADEE",
  "call booked": "#2FC197",
  proposal: "#F0A94B",
  won: "#2FC197",
  lost: "#C6663F",
};
const QUALITY_COLOR: Record<Quality, string> = { cold: "#8FA3BF", warm: "#F0A94B", hot: "#FF6B4A" };

interface OutreachLead {
  id: string;
  name: string;
  company: string;
  website: string;
  social: string;
  email: string;
  contact: string;
  from: string;
  quality: Quality;
  status: Status;
  notes: string;
  nextFollowUp: number | null;
  createdAt: number;
}
interface Stats {
  total: number;
  today: number;
  week: number;
  replied: number;
}
interface DupMatch {
  company: string;
  status: string;
  via: string | null;
  createdAt: number;
}

const TOKEN_KEY = "synthos-outreach-token";

const card: CSSProperties = {
  background: "var(--card)",
  border: "1px solid rgba(var(--ink-rgb),.07)",
  borderRadius: 18,
  boxShadow: "var(--shadow-card)",
};
const label: CSSProperties = {
  fontSize: 10.5,
  letterSpacing: ".14em",
  textTransform: "uppercase",
  color: "rgba(var(--ink-rgb),.5)",
  fontWeight: 700,
  marginBottom: 6,
  display: "block",
};
const input: CSSProperties = {
  width: "100%",
  border: "1px solid rgba(var(--ink-rgb),.12)",
  borderRadius: 11,
  padding: "11px 13px",
  fontSize: 15,
  fontFamily: "inherit",
  background: "var(--card)",
  color: "var(--ink)",
  boxSizing: "border-box",
};

const api = async (body: Record<string, unknown>) => {
  const res = await fetch("/api/outreach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data } as { ok: boolean; status: number; data: Record<string, never> & Record<string, unknown> };
};

const blank = {
  company: "",
  website: "",
  social: "",
  email: "",
  name: "",
  contact: "",
  quality: "warm" as Quality,
  notes: "",
  nextFollowUp: "",
};

export function Outreach() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [name, setName] = useState("");
  const [leads, setLeads] = useState<OutreachLead[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, today: 0, week: 0, replied: 0 });
  const [form, setForm] = useState({ ...blank });
  const [dup, setDup] = useState<DupMatch | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [booted, setBooted] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);

  // login form
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  useEffect(() => {
    applyTheme("system");
    return watchSystemTheme(() => applyTheme("system"));
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const load = useCallback(async (t: string) => {
    const { ok, status, data } = await api({ action: "list", token: t });
    if (status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setBooted(true);
      return;
    }
    if (ok) {
      setLeads((data.leads as OutreachLead[]) ?? []);
      setStats((data.stats as Stats) ?? { total: 0, today: 0, week: 0, replied: 0 });
      setName((data.name as string) ?? "");
    }
    setBooted(true);
  }, []);

  useEffect(() => {
    if (token) load(token);
    else setBooted(true);
  }, [token, load]);

  // duplicate check, debounced — the point is to never double-contact a business
  useEffect(() => {
    if (!token) return;
    const { company, website, email } = form;
    if (!company.trim() && !website.trim() && !email.trim()) {
      setDup(null);
      return;
    }
    const id = setTimeout(async () => {
      const { ok, data } = await api({ action: "check", token, company, website, email });
      if (ok) setDup((data.match as DupMatch | null) ?? null);
    }, 500);
    return () => clearTimeout(id);
  }, [form.company, form.website, form.email, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async () => {
    if (!u.trim() || !p || authBusy) return;
    setAuthBusy(true);
    setAuthErr("");
    const { ok, data } = await api({ action: "login", username: u.trim(), password: p });
    setAuthBusy(false);
    if (!ok) {
      setAuthErr((data.error as string) ?? "could not sign in");
      return;
    }
    localStorage.setItem(TOKEN_KEY, data.token as string);
    setName((data.name as string) ?? "");
    setP("");
    setToken(data.token as string);
  };

  const submit = async () => {
    if (!token || saving) return;
    const business = form.company.trim() || form.name.trim();
    if (!business) return;
    setSaving(true);
    const { ok, data } = await api({
      action: "save",
      token,
      lead: {
        ...form,
        from: "outbound",
        status: "new",
        nextFollowUp: form.nextFollowUp ? new Date(form.nextFollowUp + "T12:00:00").getTime() : null,
      },
    });
    setSaving(false);
    if (!ok) {
      flash((data.error as string) ?? "could not save");
      return;
    }
    const lead = data.lead as OutreachLead;
    setLeads((l) => [lead, ...l]);
    setStats((s) => ({ ...s, total: s.total + 1, today: s.today + 1, week: s.week + 1 }));
    setForm({ ...blank });
    setDup(null);
    flash("lead added ✦");
    firstField.current?.focus();
  };

  const cycleStatus = async (lead: OutreachLead) => {
    if (!token) return;
    const next = STATUSES[(STATUSES.indexOf(lead.status) + 1) % STATUSES.length];
    setLeads((l) => l.map((x) => (x.id === lead.id ? { ...x, status: next } : x)));
    const { ok } = await api({ action: "save", token, lead: { ...lead, status: next } });
    if (!ok) {
      setLeads((l) => l.map((x) => (x.id === lead.id ? { ...x, status: lead.status } : x)));
      flash("could not update");
    }
  };

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setLeads([]);
  };

  // ---- login ---------------------------------------------------------------
  if (!token) {
    return (
      <div className="app-frame" style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 22 }}>
        <div style={{ ...card, width: "100%", maxWidth: 380, padding: "34px 28px", textAlign: "center" }} className="anim-sc">
          <img src={platesImg} alt="" style={{ width: 96, marginBottom: 4 }} />
          <div style={{ fontSize: 10.5, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.5)", fontWeight: 700, marginBottom: 8 }}>
            synthos <span style={{ color: "var(--sky-dot)" }}>os</span> · outreach
          </div>
          <h1 style={{ margin: "0 0 22px", fontSize: 23, fontWeight: 700, letterSpacing: "-.025em" }}>
            log your <i style={{ fontWeight: 600 }}>leads</i>
          </h1>
          <div style={{ textAlign: "left", display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={label}>username</label>
              <input autoFocus autoCapitalize="none" autoCorrect="off" value={u} onChange={(e) => setU(e.target.value)} onKeyDown={(e) => e.key === "Enter" && signIn()} placeholder="jalen" style={input} />
            </div>
            <div>
              <label style={label}>password</label>
              <input type="password" value={p} onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === "Enter" && signIn()} placeholder="••••••••" style={input} />
            </div>
            {authErr && <div style={{ fontSize: 13, color: "#C6663F", fontWeight: 600 }}>{authErr}</div>}
            <button
              onClick={signIn}
              disabled={authBusy || !u.trim() || !p}
              style={{ background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 16px", fontSize: 14.5, fontWeight: 700, fontFamily: "inherit", marginTop: 4, opacity: authBusy || !u.trim() || !p ? 0.5 : 1 }}
            >
              {authBusy ? "…" : "sign in ✦"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!booted) {
    return (
      <div className="app-frame" style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(var(--ink-rgb),.5)", fontSize: 13, letterSpacing: ".08em" }}>
        loading…
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const shown = q
    ? leads.filter((l) => [l.company, l.name, l.website, l.email, l.social, l.notes].some((v) => v?.toLowerCase().includes(q)))
    : leads;
  const dueFollowUps = leads.filter((l) => l.nextFollowUp && l.nextFollowUp <= Date.now() && !["won", "lost"].includes(l.status));

  const set = (k: keyof typeof blank, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="app-frame app-main" style={{ minHeight: "100dvh", overflowY: "auto" }}>
      {toast && (
        <div style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", top: 18, zIndex: 40, background: "var(--btn-ink)", color: "#fff", borderRadius: 999, padding: "9px 18px", fontSize: 13.5, fontWeight: 700, boxShadow: "0 12px 30px -12px rgba(11,15,25,.5)", animation: "toastIn .2s ease" }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 620, margin: "0 auto", padding: "26px 16px 70px" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 18 }} className="anim-sc">
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.5)", fontWeight: 700 }}>
              synthos <span style={{ color: "var(--sky-dot)" }}>os</span> · outreach
            </div>
            <h1 style={{ margin: "4px 0 0", fontSize: 25, fontWeight: 700, letterSpacing: "-.03em", lineHeight: 1.1 }}>
              hey <i style={{ fontWeight: 600 }}>{(name || "there").toLowerCase()}</i>
            </h1>
          </div>
          <button onClick={signOut} className="hov-soft" style={{ background: "transparent", border: "1px solid rgba(var(--ink-rgb),.12)", borderRadius: 10, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, color: "rgba(var(--ink-rgb),.6)", fontFamily: "inherit", flex: "0 0 auto" }}>
            sign out
          </button>
        </div>

        {/* stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
          {[
            { k: "today", v: stats.today, l: "today", c: "#2FC197" },
            { k: "week", v: stats.week, l: "this week", c: "#33ADEE" },
            { k: "total", v: stats.total, l: "all time", c: "#8A84F0" },
            { k: "replied", v: stats.replied, l: "in play", c: "#F0A94B" },
          ].map((s) => (
            <div key={s.k} style={{ ...card, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", color: s.c, fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
              <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.5)", fontWeight: 700, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {dueFollowUps.length > 0 && (
          <div style={{ ...card, padding: "12px 15px", marginBottom: 14, borderColor: "rgba(240,169,75,.4)", background: "rgba(240,169,75,.08)" }}>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>⏰ {dueFollowUps.length} follow-up{dueFollowUps.length === 1 ? "" : "s"} due</span>
            <span style={{ fontSize: 13, color: "rgba(var(--ink-rgb),.6)" }}> — {dueFollowUps.slice(0, 3).map((l) => l.company || l.name).join(", ")}</span>
          </div>
        )}

        {/* add form */}
        <div style={{ ...card, padding: "18px 18px 16px", marginBottom: 18 }}>
          <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: "-.01em", marginBottom: 14 }}>add a lead</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={label}>business name *</label>
              <input ref={firstField} autoFocus value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Joe's Plumbing" style={input} />
            </div>

            {dup && (
              <div style={{ background: "rgba(240,120,90,.12)", border: "1px solid rgba(240,120,90,.4)", borderRadius: 11, padding: "10px 13px", fontSize: 13, lineHeight: 1.45 }}>
                <b>already in the pipeline</b> — {dup.company} ({dup.status})
                {dup.via ? " · added by " + dup.via : ""} · {timeAgo(dup.createdAt)}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={label}>website</label>
                <input value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="joesplumbing.com" autoCapitalize="none" style={input} />
              </div>
              <div>
                <label style={label}>social</label>
                <input value={form.social} onChange={(e) => set("social", e.target.value)} placeholder="@joesplumbing" autoCapitalize="none" style={input} />
              </div>
            </div>

            <div>
              <label style={label}>email</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="joe@joesplumbing.com" autoCapitalize="none" style={input} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={label}>contact name</label>
                <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Joe" style={input} />
              </div>
              <div>
                <label style={label}>phone / handle</label>
                <input value={form.contact} onChange={(e) => set("contact", e.target.value)} placeholder="(570) 555-0134" style={input} />
              </div>
            </div>

            <div>
              <label style={label}>how warm?</label>
              <div style={{ display: "flex", gap: 7 }}>
                {QUALITIES.map((qy) => (
                  <button
                    key={qy}
                    onClick={() => setForm((f) => ({ ...f, quality: qy }))}
                    style={{
                      flex: 1,
                      background: form.quality === qy ? QUALITY_COLOR[qy] + "22" : "transparent",
                      border: "1px solid " + (form.quality === qy ? QUALITY_COLOR[qy] : "rgba(var(--ink-rgb),.12)"),
                      color: form.quality === qy ? QUALITY_COLOR[qy] : "rgba(var(--ink-rgb),.55)",
                      borderRadius: 10,
                      padding: "9px 0",
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: "inherit",
                    }}
                  >
                    {qy}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={label}>notes</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="what they need, what you noticed on their site…" style={{ ...input, resize: "none" }} />
            </div>

            <div>
              <label style={label}>follow up on (optional)</label>
              <input type="date" value={form.nextFollowUp} onChange={(e) => set("nextFollowUp", e.target.value)} style={input} />
            </div>

            <button
              onClick={submit}
              disabled={saving || !(form.company.trim() || form.name.trim())}
              style={{ background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 12, padding: "13px 16px", fontSize: 15, fontWeight: 700, fontFamily: "inherit", marginTop: 2, opacity: saving || !(form.company.trim() || form.name.trim()) ? 0.5 : 1 }}
            >
              {saving ? "saving…" : "add lead ✦"}
            </button>
          </div>
        </div>

        {/* his leads */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, margin: "0 4px 10px" }}>
          <span style={{ ...label, marginBottom: 0 }}>your leads · {leads.length}</span>
          {leads.length > 4 && (
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="search…" style={{ ...input, width: 150, padding: "7px 11px", fontSize: 13 }} />
          )}
        </div>

        {shown.length === 0 ? (
          <div style={{ ...card, border: "1px dashed rgba(var(--ink-rgb),.14)", padding: "30px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4 }}>{leads.length === 0 ? "no leads yet" : "nothing matches"}</div>
            <div style={{ fontSize: 13, color: "rgba(var(--ink-rgb),.5)" }}>
              {leads.length === 0 ? "add your first one above — the team sees it instantly ✦" : "try a different search"}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {shown.map((l) => (
              <div key={l.id} style={{ ...card, padding: "13px 15px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-.01em", flex: 1, minWidth: 0 }}>{l.company || l.name}</span>
                  <button
                    onClick={() => cycleStatus(l)}
                    title="tap to move it along"
                    style={{ background: STATUS_COLOR[l.status] + "22", color: STATUS_COLOR[l.status], border: "none", borderRadius: 999, padding: "4px 11px", fontSize: 11, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", fontFamily: "inherit" }}
                  >
                    {l.status}
                  </button>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 5, fontSize: 12.5, color: "rgba(var(--ink-rgb),.6)" }}>
                  {l.website && (
                    <a href={l.website.startsWith("http") ? l.website : "https://" + l.website} target="_blank" rel="noreferrer" style={{ color: "#33ADEE", textDecoration: "none", fontWeight: 600 }}>
                      {l.website.replace(/^https?:\/\//, "")} ↗
                    </a>
                  )}
                  {l.email && <span>{l.email}</span>}
                  {l.social && <span>{l.social}</span>}
                  {l.contact && <span>{l.contact}</span>}
                </div>
                <div style={{ fontSize: 11.5, color: "rgba(var(--ink-rgb),.4)", marginTop: 4 }}>
                  {l.quality} · added {timeAgo(l.createdAt)}
                  {l.nextFollowUp ? " · follow up " + new Date(l.nextFollowUp).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}
                </div>
                {l.notes && <div style={{ fontSize: 12.5, color: "rgba(var(--ink-rgb),.55)", marginTop: 5, lineHeight: 1.45 }}>{l.notes}</div>}
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 26, fontSize: 10.5, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.32)", fontWeight: 700 }}>
          synthos <span style={{ color: "var(--sky-dot)" }}>os</span> ✦
        </div>
      </div>
    </div>
  );
}
