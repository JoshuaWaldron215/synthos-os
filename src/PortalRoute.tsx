import { Suspense, lazy } from "react";

// The client portal (/c/<token>) is the one PUBLIC surface — mounted outside
// AuthProvider (see main.tsx) so visitors never hit the login gate.
const Portal = lazy(() => import("./surfaces/Portal").then((m) => ({ default: m.Portal })));
const Outreach = lazy(() => import("./surfaces/Outreach").then((m) => ({ default: m.Outreach })));

export function PortalRoute() {
  return (
    <Suspense fallback={null}>
      <Portal />
    </Suspense>
  );
}

/** /outreach — scoped lead-entry console for outreach contractors (own login) */
export function OutreachRoute() {
  return (
    <Suspense fallback={null}>
      <Outreach />
    </Suspense>
  );
}
