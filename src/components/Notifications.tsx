import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../lib/Icon";
import { whenLabel } from "../lib/time";
import { useIsMobile } from "../lib/useMediaQuery";
import { useStore } from "../store/useStore";
import { ResponsiveModal } from "./ResponsiveModal";
import type { NotifItem } from "../types";

function List({ items, onClear, onOpen }: { items: NotifItem[]; onClear: () => void; onOpen: (n: NotifItem) => void }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px 8px" }}>
        <span style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", fontWeight: 600 }}>notifications</span>
        {items.length > 0 && (
          <button onClick={onClear} style={{ background: "transparent", border: "none", fontSize: 11.5, fontWeight: 600, color: "rgba(var(--ink-rgb),.55)", fontFamily: "inherit" }}>clear all</button>
        )}
      </div>
      {items.length === 0 ? (
        <div style={{ padding: "26px 12px", textAlign: "center", fontSize: 13, color: "rgba(var(--ink-rgb),.55)" }}>you're all caught up ✦</div>
      ) : (
        items.map((n) => (
          // tapping jumps to where the event lives (task → /tasks, chat → /team, …)
          <button
            key={n.id}
            className="hov-soft"
            onClick={() => onOpen(n)}
            style={{ display: "flex", gap: 9, padding: "10px 10px", borderRadius: 11, background: n.read ? "transparent" : "rgba(96,200,255,.07)", border: "none", width: "100%", textAlign: "left", fontFamily: "inherit", cursor: n.url ? "pointer" : "default" }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: n.dot, marginTop: 6, flex: "0 0 auto" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, lineHeight: 1.4, color: "var(--ink)" }}>
                <b style={{ fontWeight: 600 }}>{n.title}</b> {n.body}
              </div>
              <div style={{ fontSize: 11, color: "rgba(var(--ink-rgb),.55)", marginTop: 2 }}>{whenLabel(n.at, n.time)}</div>
            </div>
            {n.url && <Icon name="chevron" size={13} sw={2} color="rgba(var(--ink-rgb),.3)" />}
          </button>
        ))
      )}
    </div>
  );
}

export function Notifications() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const notifOpen = useStore((s) => s.notifOpen);
  const toggleNotif = useStore((s) => s.toggleNotif);
  const notifications = useStore((s) => s.notifications);
  const markAllNotifsRead = useStore((s) => s.markAllNotifsRead);
  const markNotifRead = useStore((s) => s.markNotifRead);
  const clearNotifs = useStore((s) => s.clearNotifs);

  const openNotif = (n: NotifItem) => {
    markNotifRead(n.id);
    if (!n.url) return;
    navigate(n.url);
    toggleNotif();
  };

  // mark everything read shortly after opening
  useEffect(() => {
    if (!notifOpen) return;
    const t = setTimeout(() => markAllNotifsRead(), 900);
    return () => clearTimeout(t);
  }, [notifOpen, markAllNotifsRead]);

  // close on Escape
  useEffect(() => {
    if (!notifOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") toggleNotif();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notifOpen, toggleNotif]);

  if (!notifOpen) return null;

  if (isMobile) {
    return (
      <ResponsiveModal open={notifOpen} onClose={toggleNotif} maxHeight="80vh">
        <List items={notifications} onClear={clearNotifs} onOpen={openNotif} />
      </ResponsiveModal>
    );
  }

  return (
    <>
      <div onClick={toggleNotif} style={{ position: "absolute", inset: 0, zIndex: 31 }} />
      <div
        style={{
          position: "absolute",
          top: 58,
          right: 18,
          width: 320,
          maxHeight: "70vh",
          overflowY: "auto",
          background: "var(--card)",
          border: "1px solid rgba(var(--ink-rgb),.08)",
          borderRadius: 16,
          boxShadow: "0 20px 50px -14px rgba(11,15,25,.28)",
          padding: 8,
          animation: "scIn .16s ease",
          zIndex: 32,
        }}
      >
        <List items={notifications} onClear={clearNotifs} onOpen={openNotif} />
      </div>
    </>
  );
}

export function BellButton({ mobile }: { mobile?: boolean }) {
  const toggleNotif = useStore((s) => s.toggleNotif);
  const notifications = useStore((s) => s.notifications);
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <button
      className="hov-soft"
      onClick={toggleNotif}
      title="notifications"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--card)",
        border: "1px solid rgba(var(--ink-rgb),.07)",
        borderRadius: 11,
        padding: mobile ? 0 : 9,
        width: mobile ? 38 : undefined,
        height: mobile ? 38 : undefined,
        position: "relative",
        flex: "0 0 auto",
      }}
    >
      <Icon name="bell" size={18} color="rgba(var(--ink-rgb),.6)" />
      {unread > 0 && (
        <span
          style={{
            position: "absolute",
            top: mobile ? 5 : 5,
            right: mobile ? 5 : 5,
            minWidth: 15,
            height: 15,
            padding: "0 3px",
            borderRadius: 999,
            background: "#FF8A63",
            color: "#fff",
            fontSize: 9.5,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 0 2px #fff",
          }}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
