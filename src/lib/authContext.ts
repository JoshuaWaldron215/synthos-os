import { createContext, useContext } from "react";
import type { AuthApi } from "./useAuth";

export const AuthContext = createContext<AuthApi | null>(null);

export function useAuthContext(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
