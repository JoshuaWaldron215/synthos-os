import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "../lib/Icon";
import { NAV_ITEMS, activeKeyFor } from "../lib/nav";
import { useStore } from "../store/useStore";
import { useUser } from "../lib/useUser";
import { Avatar } from "./Avatar";
import appIcon from "../assets/app-icon.png";

export function MobileDrawer() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeKey = activeKeyFor(location.pathname);

  const closeMobileNav = useStore((s) => s.closeMobileNav);
  const currentUserId = useStore((s) => s.currentUserId);
  const me = useUser(currentUserId);

  const goto = (path: string) => {
    navigate(path);
    closeMobileNav();
  };

  return (
    <>
      <div
        onClick={closeMobileNav}
        style={{ position: "absolute", inset: 0, background: "rgba(11,15,25,.30)", zIndex: 60, animation: "fadeIn .18s ease" }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          bottom: 0,
          width: "84%",
          maxWidth: 318,
          background: "#fff",
          zIndex: 61,
          boxShadow: "24px 0 60px -18px rgba(11,15,25,.45)",
          animation: "drawerLeftIn .24s cubic-bezier(.2,.8,.2,1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "calc(20px + env(safe-area-inset-top)) 18px 18px", background: "var(--grad-drawer)", borderBottom: "1px solid rgba(11,15,25,.05)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
              <img src={appIcon} alt="synthos" style={{ width: 34, height: 34, borderRadius: 11, flex: "0 0 auto", boxShadow: "0 1px 4px rgba(11,15,25,.2),0 0 0 4px rgba(255,255,255,.4)" }} />
              <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
                <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-.025em" }}>synthos</span>
                <span style={{ fontSize: 9, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(11,15,25,.5)", fontWeight: 700, marginTop: 3 }}>workspace os</span>
              </span>
            </div>
            <button onClick={closeMobileNav} title="close" style={{ display: "flex", background: "rgba(255,255,255,.6)", border: "1px solid rgba(11,15,25,.06)", borderRadius: 10, padding: 7 }}>
              <Icon name="close" size={18} sw={1.8} color="rgba(11,15,25,.5)" />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 8px", display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV_ITEMS.map((item) => {
            const active = activeKey === item.key;
            return (
              <button
                key={item.key}
                className={active ? undefined : "hov-sky"}
                onClick={() => goto(item.path)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "none",
                  width: "100%",
                  textAlign: "left",
                  fontFamily: "inherit",
                  fontSize: 14,
                  background: active ? "var(--grad-nav)" : "transparent",
                  boxShadow: active ? "inset 0 0 0 1px rgba(96,200,255,.24)" : "none",
                  color: active ? "#0B0F19" : "rgba(11,15,25,.55)",
                  fontWeight: active ? 600 : 500,
                  whiteSpace: "nowrap",
                }}
              >
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div style={{ padding: "14px 16px calc(18px + env(safe-area-inset-bottom))", borderTop: "1px solid rgba(11,15,25,.06)" }}>
          <button
            className="hov-sky"
            onClick={() => goto("/settings")}
            style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", border: "1px solid rgba(11,15,25,.08)", background: "#fff", padding: "10px 12px", borderRadius: 12, fontFamily: "inherit", textAlign: "left" }}
          >
            <Avatar id={currentUserId} size={36} presence />
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0B0F19" }}>{me.name}</span>
              <span style={{ fontSize: 12, color: "rgba(11,15,25,.45)" }}>@{me.username}</span>
            </span>
            <Icon name="settings" size={18} color="rgba(11,15,25,.5)" />
          </button>
          <div style={{ marginTop: 15, fontSize: 12.5, color: "rgba(11,15,25,.5)", fontWeight: 500, lineHeight: 1.4 }}>
            Connect. Understand. <span style={{ color: "#2FA7D0", fontWeight: 600 }}>Build the future.</span>
          </div>
        </div>
      </div>
    </>
  );
}

export function BottomTabs() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeKey = activeKeyFor(location.pathname);
  // bottom tabs imported lazily to avoid circular import noise
  const tabs = NAV_ITEMS.filter((n) => ["projects", "tasks", "intake", "vault", "team", "ask"].includes(n.key));

  return (
    <nav
      style={{
        gridArea: "tabs",
        display: "flex",
        background: "rgba(255,255,255,.94)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(11,15,25,.07)",
        // sit above the iOS home indicator without wasting space on other phones
        paddingTop: 4,
        paddingBottom: "calc(6px + env(safe-area-inset-bottom))",
        paddingLeft: "max(6px, env(safe-area-inset-left))",
        paddingRight: "max(6px, env(safe-area-inset-right))",
      }}
    >
      {tabs.map((t) => {
        const active = activeKey === t.key;
        const label = t.key === "ask" ? "ask" : t.label;
        return (
          <button
            key={t.key}
            onClick={() => navigate(t.path)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "7px 6px 4px",
              border: "none",
              background: "transparent",
              flex: "1 1 0",
              color: active ? "#0B0F19" : "rgba(11,15,25,.42)",
              fontFamily: "inherit",
              fontSize: 10.5,
              fontWeight: active ? 600 : 500,
              letterSpacing: ".01em",
            }}
          >
            <Icon name={t.icon} size={21} sw={1.8} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
