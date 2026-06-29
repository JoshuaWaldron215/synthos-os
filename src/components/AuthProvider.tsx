import { type ReactNode } from "react";
import { useAuth } from "../lib/useAuth";
import { AuthContext } from "../lib/authContext";
import { Login } from "../surfaces/Login";

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (auth.loading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(165deg,#F1ECFF 0%,#EAF2FF 48%,#FFF1EC 100%)",
          color: "rgba(11,15,25,.4)",
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
