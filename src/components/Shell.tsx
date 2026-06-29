import type { CSSProperties } from "react";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
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

export function Shell() {
  const isMobile = useIsMobile();
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

  const frameStyle: CSSProperties = isMobile
    ? {
        display: "grid",
        gridTemplateColumns: "1fr",
        gridTemplateRows: "auto 1fr auto",
        gridTemplateAreas: '"top" "main" "tabs"',
        width: "100%",
        height: "100dvh",
        background: "#F6F8FA",
        color: "#0B0F19",
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
        background: "#F6F8FA",
        color: "#0B0F19",
        overflow: "hidden",
        position: "relative",
      };

  const screenPad = isMobile ? "16px 14px 28px" : "34px 44px 60px";

  return (
    <div style={frameStyle}>
      {!isMobile && <Sidebar />}
      <Topbar mobile={isMobile} />

      <section style={{ gridArea: "main", overflowY: "auto", overflowX: "hidden", position: "relative" }}>
        <div style={{ padding: screenPad }}>
          <Outlet />
        </div>
      </section>

      {isMobile && <BottomTabs />}
      {isMobile && mobileNavOpen && <MobileDrawer />}

      <Notifications />
      <AccountSheet />
      <ProfileCard />
      <AuditDrawer />
      {openTaskId && <TaskModal />}
      <Toast />
    </div>
  );
}
