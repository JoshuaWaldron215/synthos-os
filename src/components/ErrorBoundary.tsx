import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** "app" wraps everything (reload to recover); "surface" wraps one route (nav stays alive) */
  scope?: "app" | "surface";
}

interface State {
  error: Error | null;
}

// One render error must not white-screen the workspace. The app-level boundary
// offers a reload; the surface-level one keeps the shell (nav, tabs) usable
// and resets automatically on navigation (keyed by pathname in Shell).
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[error-boundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const app = (this.props.scope ?? "surface") === "app";
    return (
      <div
        role="alert"
        style={{
          minHeight: app ? "100dvh" : 320,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: 32,
          background: app ? "#F6F8FA" : "transparent",
          color: "#0B0F19",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 34 }} aria-hidden>
          ✦
        </div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-.02em" }}>something broke</h1>
        <p style={{ margin: 0, fontSize: 13.5, color: "rgba(11,15,25,.55)", maxWidth: 380, lineHeight: 1.55 }}>
          {app
            ? "the workspace hit an unexpected error. your data is safe — reload to pick up where you left off."
            : "this view hit an unexpected error. your data is safe — try again, or switch to another view."}
        </p>
        <button
          onClick={() => (app ? window.location.reload() : this.setState({ error: null }))}
          style={{
            marginTop: 8,
            background: "#0B0F19",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "11px 22px",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          {app ? "reload" : "try again"}
        </button>
      </div>
    );
  }
}
