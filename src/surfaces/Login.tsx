import { useState, type CSSProperties, type FormEvent } from "react";
import appIcon from "../assets/app-icon.png";

interface LoginProps {
  local: boolean;
  onSignIn: (email: string, password: string) => Promise<{ error?: string }>;
}

export function Login({ local, onSignIn }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const field: CSSProperties = {
    width: "100%",
    border: "1px solid rgba(11,15,25,.1)",
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 16,
    fontFamily: "inherit",
    color: "#0B0F19",
    background: "#fff",
    boxSizing: "border-box",
  };
  const labelStyle: CSSProperties = {
    fontSize: 11,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    color: "rgba(11,15,25,.45)",
    fontWeight: 700,
    display: "block",
    marginBottom: 7,
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 18px",
        background: "linear-gradient(165deg,#F1ECFF 0%,#EAF2FF 48%,#FFF1EC 100%)",
        color: "#0B0F19",
      }}
    >
      <div
        className="anim-sc"
        style={{
          width: "100%",
          maxWidth: 380,
          background: "rgba(255,255,255,.72)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,.6)",
          borderRadius: 24,
          padding: 28,
          boxShadow: "0 30px 80px -30px rgba(11,15,25,.5)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 22 }}>
          <img src={appIcon} alt="synthos" style={{ width: 40, height: 40, borderRadius: 12, boxShadow: "0 0 0 4px rgba(200,198,255,.25)" }} />
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.03em" }}>synthos</span>
              <span style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: "rgba(11,15,25,.4)", fontWeight: 700 }}>os</span>
            </div>
          </div>
        </div>

        <h1 style={{ margin: "0 0 4px", fontSize: 25, fontWeight: 700, letterSpacing: "-.025em" }}>
          welcome <i style={{ fontWeight: 600 }}>back</i>
        </h1>
        <p style={{ margin: "0 0 22px", fontSize: 13.5, color: "rgba(11,15,25,.5)", lineHeight: 1.5 }}>
          sign in to your workspace. projects, tasks, the vault and files — all in one place.
        </p>

        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>email</label>
            <input
              type="email"
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@synthos.dev"
              style={field}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={field}
            />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: "#C5343A", background: "rgba(229,72,77,.1)", borderRadius: 10, padding: "9px 12px", marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%",
              background: "#0B0F19",
              color: "#fff",
              border: "none",
              borderRadius: 13,
              padding: "13px 16px",
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "inherit",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? "signing in…" : "sign in ↗"}
          </button>
        </form>

        {local && (
          <p style={{ margin: "16px 0 0", fontSize: 12, color: "rgba(11,15,25,.45)", lineHeight: 1.5, textAlign: "center" }}>
            local mode — sign in with your team email (e.g. josh@synthos.dev) to load your profile. connect Supabase to enable real team logins.
          </p>
        )}
      </div>
    </div>
  );
}
