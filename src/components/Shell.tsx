import type { CSSProperties } from "react";
import { Suspense, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useIsMobile } from "../lib/useMediaQuery";
import { useLiveNotifications } from "../lib/useLiveNotifications";
import { currentPermission } from "../lib/notifications";
import { useAuthContext } from "../lib/authContext";
import { useStore } from "../store/useStore";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { BottomTabs, MobileDrawer } from "./MobileDrawer";
import { Toast } from "./Toast";
import { TaskModal } from "./TaskModal";
import { AuditDrawer } from "./AuditDrawer";
import { AccountSheet } from "./AccountSheet";
import { ProfileCard } from "./ProfileCard";
import { Notifications } from "./Notifications";
import { SyncBanner } from "./SyncBanner";
import { ErrorBoundary } from "./ErrorBoundary";
import { RouteSkeleton } from "./RouteSkeleton";

export function Shell() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const collapsed = useStore((s) => s.sidebarCollapsed);
  const mobileNavOpen = useStore((s) => s.mobileNavOpen);
  const openTaskId = useStore((s) => s.openTaskId);
  const setNotifPermission = useStore((s) => s.setNotifPermission);
  const hydrate = useStore((s) => s.hydrate);
  const profiles = useStore((s) => s.profiles);
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const { session } = useAuthContext();

  useLiveNotifications();

  // keep stored permission in sync with the browser on mount
  useEffect(() => {
    setNotifPermission(currentPermission());
  }, [setNotifPermission]);

  // identify the signed-in teammate by their email (no manual role switching)
  useEffect(() => {
    const email = session?.email?.trim().toLowerCase();
    if (!email) return;
    const local = email.split("@")[0];
    const ids = Object.keys(profiles).map(Number);
    const byEmail = ids.find((id) => profiles[id].email.toLowerCase() === email);
    const byUsername = ids.find((id) => profiles[id].username.toLowerCase() === local);
    const match = byEmail ?? byUsername;
    if (match !== undefined) setCurrentUser(match);
  }, [session, profiles, setCurrentUser]);

  // pull shared data from the backend when Supabase is configured
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // The realtime socket dies while the tab sleeps (overnight laptop, phone in
  // pocket) and missed events are never replayed. Re-hydrate when the tab
  // comes back — hydrate is idempotent, reconciles, and catches the bell up.
  const lastFocusHydrate = useRef(Date.now());
  useEffect(() => {
    const maybeRehydrate = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastFocusHydrate.current < 60_000) return;
      lastFocusHydrate.current = Date.now();
      hydrate();
    };
    window.addEventListener("focus", maybeRehydrate);
    document.addEventListener("visibilitychange", maybeRehydrate);
    return () => {
      window.removeEventListener("focus", maybeRehydrate);
      document.removeEventListener("visibilitychange", maybeRehydrate);
    };
  }, [hydrate]);

  // background comes from .app-frame (aurora corner tints over cloud)
  const frameStyle: CSSProperties = isMobile
    ? {
        display: "grid",
        gridTemplateColumns: "1fr",
        gridTemplateRows: "auto 1fr auto",
        gridTemplateAreas: '"top" "main" "tabs"',
        width: "100%",
        height: "100dvh",
        color: "var(--ink)",
        overflow: "hidden",
        position: "relative",
      }
    : {
        display: "grid",
        gridTemplateColumns: (collapsed ? "74px" : "236px") + " 1fr",
        gridTemplateRows: "64px 1fr",
        gridTemplateAreas: '"side top" "side main"',
        width: "100%",
        height: "100dvh",
        color: "var(--ink)",
        overflow: "hidden",
        position: "relative",
      };

  const screenPad = isMobile ? "12px 12px 26px" : "34px 44px 60px";

  return (
    <div className="app-frame" style={frameStyle}>
      {!isMobile && <Sidebar />}
      <Topbar mobile={isMobile} />

      <section className="app-main" style={{ gridArea: "main", overflowY: "auto", overflowX: "hidden", position: "relative" }}>
        <div style={{ padding: screenPad }}>
          {/* keyed by path: a crashed surface resets when the user navigates away */}
          <ErrorBoundary scope="surface" key={location.pathname}>
            {/* lazy surfaces shimmer in place while their chunk loads */}
            <Suspense fallback={<RouteSkeleton />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </section>

      {isMobile && <BottomTabs />}
      {isMobile && mobileNavOpen && <MobileDrawer />}

      <Notifications />
      <AccountSheet />
      <ProfileCard />
      <AuditDrawer />
      {openTaskId && <TaskModal />}
      <SyncBanner />
      <Toast />
    </div>
  );
}
