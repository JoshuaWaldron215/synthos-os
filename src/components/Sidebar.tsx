import { useNavigate, useLocation } from "react-router-dom";
import { Icon } from "../lib/Icon";
import { NAV_GROUPS, NAV_ITEMS, activeKeyFor } from "../lib/nav";
import { useStore } from "../store/useStore";
import { useUser } from "../lib/useUser";
import { Avatar } from "./Avatar";
import appIcon from "../assets/app-icon.png";

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeKey = activeKeyFor(location.pathname);

  const collapsed = useStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useStore((s) => s.setSidebarCollapsed);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const currentUserId = useStore((s) => s.currentUserId);
  const openAccountSheet = useStore((s) => s.openAccountSheet);
  const currentUser = useUser(currentUserId);
  const showLabels = !collapsed;

  const logoClick = () => {
    if (collapsed) setSidebarCollapsed(false);
    else navigate("/home");
  };

  return (
    <aside
      style={{
        gridArea: "side",
        // glass over the frame's aurora corners — the lavender tint bleeds through
        background: "rgba(var(--card-rgb),.66)",
        backdropFilter: "blur(16px) saturate(1.35)",
        WebkitBackdropFilter: "blur(16px) saturate(1.35)",
        borderRight: "1px solid rgba(var(--ink-rgb),.06)",
        display: "flex",
        flexDirection: "column",
        padding: "18px 14px 14px",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 4px 18px" }}>
        <button
          onClick={logoClick}
          title={collapsed ? "expand sidebar" : "synthos"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            border: "none",
            background: "transparent",
            padding: 2,
            borderRadius: 12,
            minWidth: 0,
            flex: 1,
          }}
        >
          <img
            src={appIcon}
            alt="synthos"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              flex: "0 0 auto",
              boxShadow: "0 1px 3px rgba(11,15,25,.18),0 0 0 4px rgba(200,198,255,.20)",
            }}
          />
          {showLabels && (
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1 }}>
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.025em" }}>synthos</span>
              <span style={{ fontSize: 9, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", fontWeight: 700, marginTop: 3 }}>
                workspace os
              </span>
            </span>
          )}
        </button>
        {showLabels && (
          <button
            className="hov-sky"
            onClick={toggleSidebar}
            title="collapse sidebar"
            style={{ marginLeft: "auto", border: "none", background: "transparent", padding: 5, display: "flex", borderRadius: 9 }}
          >
            <Icon name="collapse" size={18} color="rgba(var(--ink-rgb),.45)" />
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={group} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* whisper separator between workflow sections */}
            {gi > 0 && <div style={{ height: 1, background: "rgba(var(--ink-rgb),.06)", margin: collapsed ? "7px 8px" : "7px 12px" }} />}
            {NAV_ITEMS.filter((i) => i.group === group).map((item) => {
              const active = activeKey === item.key;
              return (
            <button
              key={item.key}
              className={active ? undefined : "hov-sky hov-slide"}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: collapsed ? 11 : "10px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: 12,
                border: "none",
                width: "100%",
                textAlign: "left",
                fontFamily: "inherit",
                fontSize: 14,
                transition: "background .15s,color .15s,box-shadow .15s,transform .18s cubic-bezier(.22,1,.36,1)",
                background: active ? "var(--grad-nav)" : "transparent",
                // active pill gets a soft sky glow so "where am I" reads instantly
                boxShadow: active
                  ? "inset 0 0 0 1px rgba(96,200,255,.28), 0 8px 20px -12px rgba(51,173,238,.45)"
                  : "none",
                color: active ? "var(--ink)" : "rgba(var(--ink-rgb),.55)",
                fontWeight: active ? 600 : 500,
                whiteSpace: "nowrap",
              }}
            >
              <Icon name={item.icon} size={19} />
              {!collapsed && <span>{item.label}</span>}
            </button>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ marginTop: "auto" }}>
        <button
          className="hov-soft"
          onClick={openAccountSheet}
          title="account & settings"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            border: "1px solid rgba(var(--ink-rgb),.07)",
            background: "rgba(var(--card-rgb),.8)",
            padding: 8,
            borderRadius: 13,
            textAlign: "left",
          }}
        >
          <Avatar id={currentUserId} size={32} presence />
          {showLabels && (
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{currentUser.name}</span>
              <span style={{ fontSize: 11, color: "rgba(var(--ink-rgb),.55)" }}>@{currentUser.username}</span>
            </span>
          )}
          {showLabels && <Icon name="chevron" size={15} sw={1.8} color="rgba(var(--ink-rgb),.4)" />}
        </button>
      </div>
    </aside>
  );
}
