import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent } from "react";
import appIcon from "../assets/app-icon.png";

interface LoginProps {
  local: boolean;
  onSignIn: (email: string, password: string) => Promise<{ error?: string }>;
}

// the things the workspace holds — cycled in the subtitle
const WORDS = ["projects", "tasks", "secrets", "wins", "messages"];

export function Login({ local, onSignIn }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wordIdx, setWordIdx] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setWordIdx((i) => (i + 1) % WORDS.length), 2400);
    return () => clearInterval(t);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await onSignIn(email, password);
    if (error) {
      setError(error);
      setBusy(false);
    }
  };

  // specular glow + a whisper of 3D tilt follow the cursor across the glass
  const onGlow = (e: MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    el.style.setProperty("--mx", x + "px");
    el.style.setProperty("--my", y + "px");
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const ry = (x / r.width - 0.5) * 5;
      const rx = (0.5 - y / r.height) * 5;
      el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    }
  };
  const onLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.removeProperty("--mx");
    el.style.transform = "";
  };

  const labelStyle: CSSProperties = {
    fontSize: 11,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    color: "rgba(var(--ink-rgb),.55)",
    fontWeight: 700,
    display: "block",
    marginBottom: 7,
  };

  return (
    <div className="lg-scene">
      {/* aurora */}
      <div className="lg-blob lg-blob--lav" aria-hidden />
      <div className="lg-blob lg-blob--sky" aria-hidden />
      <div className="lg-blob lg-blob--blush" aria-hidden />
      <div className="lg-blob lg-blob--mint" aria-hidden />
      <div className="lg-halo" aria-hidden />

      {/* drifting satellites — the four status dots + sparks */}
      <span className="lg-dot" aria-hidden style={{ width: 10, height: 10, background: "var(--sky-dot)", top: "22%", left: "16%", opacity: 0.5, animationDelay: "-1s" }} />
      <span className="lg-dot" aria-hidden style={{ width: 7, height: 7, background: "var(--mint-dot)", top: "68%", left: "24%", opacity: 0.45, animationDelay: "-3.2s" }} />
      <span className="lg-dot" aria-hidden style={{ width: 8, height: 8, background: "var(--blush-dot)", top: "30%", right: "18%", opacity: 0.45, animationDelay: "-2.1s" }} />
      <span className="lg-dot" aria-hidden style={{ width: 12, height: 12, background: "var(--lav-dot)", top: "74%", right: "22%", opacity: 0.4, animationDelay: "-4.6s" }} />
      <span className="lg-spark" aria-hidden style={{ top: "18%", right: "30%", animationDelay: "-1.4s" }}>✦</span>
      <span className="lg-spark" aria-hidden style={{ top: "62%", left: "12%", fontSize: 11, animationDelay: "-2.8s" }}>✦</span>

      <div
        ref={cardRef}
        className="lg-card"
        onMouseMove={onGlow}
        onMouseLeave={onLeave}
      >
        <div className="lg-stagger" style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <img src={appIcon} alt="synthos" className="lg-mark" />
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-.03em" }}>synthos</span>
              <span style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", fontWeight: 700 }}>os</span>
            </div>
          </div>

          <div>
            <h1 style={{ margin: "0 0 6px", fontSize: 27, fontWeight: 700, letterSpacing: "-.028em", lineHeight: 1.12 }}>
              welcome <i style={{ fontWeight: 600 }}>back</i>
            </h1>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "rgba(var(--ink-rgb),.52)", lineHeight: 1.55 }}>
              your{" "}
              <b className="lg-word" key={WORDS[wordIdx]} style={{ fontWeight: 700 }}>
                {WORDS[wordIdx]}
              </b>
              , right where you left them.
            </p>
          </div>

          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>email</label>
              <input
                type="email"
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@runsynthos.com"
                className="lg-field"
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>password</label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="lg-field"
              />
            </div>

            {error && (
              <div
                role="alert"
                style={{ fontSize: 13, color: "#C5343A", background: "rgba(229,72,77,.1)", borderRadius: 10, padding: "9px 12px", marginBottom: 14 }}
              >
                {error}
              </div>
            )}

            <button type="submit" disabled={busy} className="lg-cta">
              {busy ? "signing in…" : "sign in ✦"}
            </button>
          </form>

          {local && (
            <p style={{ margin: "16px 0 0", fontSize: 12, color: "rgba(var(--ink-rgb),.55)", lineHeight: 1.5, textAlign: "center" }}>
              local mode — sign in with your team email (e.g. josh@runsynthos.com) to load your profile. connect Supabase to enable real team logins.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
