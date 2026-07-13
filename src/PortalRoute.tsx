import { Suspense, lazy } from "react";

// The client portal (/c/<token>) is the one PUBLIC surface — mounted outside
// AuthProvider (see main.tsx) so visitors never hit the login gate.
const Portal = lazy(() => import("./surfaces/Portal").then((m) => ({ default: m.Portal })));

export function PortalRoute() {
  return (
    <Suspense fallback={null}>
      <Portal />
    </Suspense>
  );
}
