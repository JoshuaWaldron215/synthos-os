import { useStore } from "../store/useStore";
import { Icon } from "../lib/Icon";
import { Avatar } from "./Avatar";
import { BellButton } from "./Notifications";
import { SearchBar } from "./SearchBar";
import appIcon from "../assets/app-icon.png";

export function Topbar({ mobile }: { mobile: boolean }) {
  const currentUserId = useStore((s) => s.currentUserId);
  const openMobileNav = useStore((s) => s.openMobileNav);
  const openAccountSheet = useStore((s) => s.openAccountSheet);

  return (
    <header
      style={{
        gridArea: "top",
        display: "flex",
        alignItems: "center",
        gap: 14,
        // pad past the iOS status bar in standalone (black-translucent)
        paddingTop: mobile ? "env(safe-area-inset-top)" : 0,
        paddingRight: mobile ? "max(14px, env(safe-area-inset-right))" : 18,
        paddingLeft: mobile ? "max(14px, env(safe-area-inset-left))" : 18,
        background: "rgba(var(--cloud-rgb),.55)",
        backdropFilter: "blur(14px) saturate(1.3)",
        WebkitBackdropFilter: "blur(14px) saturate(1.3)",
        borderBottom: "1px solid rgba(var(--ink-rgb),.05)",
        position: "relative",
        zIndex: 20,
      }}
    >
      {mobile ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 2px 4px", width: "100%" }}>
          <button
            className="hov-sky"
            onClick={openMobileNav}
            title="menu"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, border: "1px solid rgba(var(--ink-rgb),.08)", background: "var(--card)", borderRadius: 11, flex: "0 0 auto", padding: 0 }}
          >
            <Icon name="menu" size={20} sw={1.8} color="var(--ink)" />
          </button>
          <img src={appIcon} alt="synthos" style={{ width: 26, height: 26, borderRadius: 8, boxShadow: "0 0 0 3px rgba(200,198,255,.2)" }} />
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-.025em" }}>synthos</span>
          <span style={{ fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", fontWeight: 700, marginTop: 2 }}>os</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9 }}>
            <SearchBar mobile />
            <BellButton mobile />
            <button onClick={openAccountSheet} title="account" style={{ display: "flex", border: "none", background: "transparent", padding: 0 }}>
              <Avatar id={currentUserId} size={34} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <SearchBar />
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 9 }}>
            <BellButton />
            <button onClick={openAccountSheet} title="account" style={{ display: "flex", border: "none", background: "transparent", padding: 0 }}>
              <Avatar id={currentUserId} size={32} />
            </button>
          </div>
        </>
      )}
    </header>
  );
}
