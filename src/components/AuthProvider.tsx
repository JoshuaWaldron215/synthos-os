import { useEffect, type ReactNode } from "react";
import { useAuth } from "../lib/useAuth";
import { AuthContext } from "../lib/authContext";
import { applyTheme, watchSystemTheme } from "../lib/theme";
import { useStore } from "../store/useStore";
import { Login } from "../surfaces/Login";

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const theme = useStore((s) => s.theme);

  // resolve + apply the palette on <html>; track OS changes while on "system"
  useEffect(() => {
    applyTheme(theme);
    if (theme === "system") return watchSystemTheme(() => applyTheme("system"));
  }, [theme]);

  if (auth.loading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--cloud)",
          color: "rgba(var(--ink-rgb),.55)",
          fontSize: 13,
          letterSpacing: ".06em",
        }}
      >
        loading…
      </div>
    );
  }

  if (!auth.session) {
    return <Login local={auth.local} onSignIn={auth.signIn} />;
  }

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
