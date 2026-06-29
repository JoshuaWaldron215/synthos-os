import { useNavigate } from "react-router-dom";
import { statusMeta } from "../lib/profile";
import { Icon } from "../lib/Icon";
import { requestNotificationPermission, showOSNotification } from "../lib/notifications";
import { subscribeToPush, unsubscribeFromPush } from "../lib/push";
import { useStore } from "../store/useStore";
import { useUser } from "../lib/useUser";
import { useAuthContext } from "../lib/authContext";
import { Avatar } from "./Avatar";
import { ResponsiveModal } from "./ResponsiveModal";

export function AccountSheet() {
  const navigate = useNavigate();
  const open = useStore((s) => s.accountSheetOpen);
  const close = useStore((s) => s.closeAccountSheet);
  const openProfile = useStore((s) => s.openProfile);
  const currentUserId = useStore((s) => s.currentUserId);
  const prefs = useStore((s) => s.prefs);
  const updatePrefs = useStore((s) => s.updatePrefs);
  const setNotifPermission = useStore((s) => s.setNotifPermission);
  const showToast = useStore((s) => s.showToast);

  const { signOut } = useAuthContext();
  const me = useUser(currentUserId);
  const myPrefs = prefs[currentUserId];
  const status = statusMeta(me.status);

  const goto = (path: string) => {
    close();
    navigate(path);
  };

  const togglePush = async () => {
    if (!myPrefs.pushEnabled) {
      const perm = await requestNotificationPermission();
      setNotifPermission(perm);
      updatePrefs(currentUserId, { pushEnabled: true });
      if (perm === "granted") {
        showOSNotification("notifications on", "you'll get live studio updates here ✦", "welcome");
        try {
          await subscribeToPush();
          showToast("push notifications enabled ✦");
        } catch {
          showToast("push on (local). run the push server for real delivery");
        }
      } else {
        showToast("enable notifications in your browser to get push");
      }
    } else {
      updatePrefs(currentUserId, { pushEnabled: false });
      try {
        await unsubscribeFromPush();
      } catch {
        /* noop */
      }
      showToast("push paused");
    }
  };

  const rowBtn = (icon: Parameters<typeof Icon>[0]["name"], label: string, onClick: () => void) => (
    <button
      className="hov-row"
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", border: "none", background: "transparent", padding: "12px 12px", borderRadius: 12, fontFamily: "inherit", fontSize: 14.5, fontWeight: 500, color: "#0B0F19", textAlign: "left" }}
    >
      <span style={{ display: "flex", width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 10, background: "rgba(11,15,25,.05)" }}>
        <Icon name={icon} size={18} color="rgba(11,15,25,.6)" />
      </span>
      {label}
    </button>
  );

  return (
    <ResponsiveModal open={open} onClose={close} width={420}>
      <button
        className="hov-row"
        onClick={() => openProfile(currentUserId)}
        title="view profile"
        style={{ display: "flex", alignItems: "center", gap: 13, padding: "8px 6px", margin: "-4px 0 10px", width: "100%", border: "none", background: "transparent", borderRadius: 14, textAlign: "left", fontFamily: "inherit", cursor: "pointer" }}
      >
        <Avatar id={currentUserId} size={52} presence />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.01em", color: "#0B0F19" }}>{me.name}</div>
          <div style={{ fontSize: 13, color: "rgba(11,15,25,.5)" }}>@{me.username} · {me.role}</div>
          <div style={{ fontSize: 12.5, color: "rgba(11,15,25,.45)", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: status.color }} />
            {status.label} · {me.email}
          </div>
        </div>
        <Icon name="arrowr" size={16} color="rgba(11,15,25,.3)" />
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 }}>
        {rowBtn("settings", "profile & settings", () => goto("/settings"))}

        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 12px" }}>
          <span style={{ display: "flex", width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 10, background: "rgba(11,15,25,.05)" }}>
            <Icon name={myPrefs.pushEnabled ? "bell" : "belloff"} size={18} color="rgba(11,15,25,.6)" />
          </span>
          <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500 }}>push notifications</span>
          <button
            onClick={togglePush}
            aria-label="toggle push"
            style={{ width: 44, height: 26, borderRadius: 999, border: "none", padding: 3, background: myPrefs.pushEnabled ? "#2FC197" : "rgba(11,15,25,.18)", display: "flex", justifyContent: myPrefs.pushEnabled ? "flex-end" : "flex-start", transition: "background .15s" }}
          >
            <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(11,15,25,.3)" }} />
          </button>
        </div>
      </div>

      <div style={{ marginTop: 6, paddingTop: 10, borderTop: "1px solid rgba(11,15,25,.06)" }}>
        {rowBtn("logout", "sign out", async () => {
          close();
          await signOut();
        })}
      </div>
    </ResponsiveModal>
  );
}
