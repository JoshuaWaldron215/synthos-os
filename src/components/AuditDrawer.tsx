import { Icon } from "../lib/Icon";
import { useStore } from "../store/useStore";
import { effectiveUser } from "../lib/profile";
import { Avatar } from "./Avatar";

export function AuditDrawer() {
  const auditOpen = useStore((s) => s.auditOpen);
  const closeAudit = useStore((s) => s.closeAudit);
  const activity = useStore((s) => s.activity);
  const profiles = useStore((s) => s.profiles);
  if (!auditOpen) return null;

  return (
    <>
      <div onClick={closeAudit} style={{ position: "absolute", inset: 0, background: "rgba(11,15,25,.18)", zIndex: 40, animation: "fadeIn .18s ease" }} />
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: 340,
          maxWidth: "86%",
          background: "#fff",
          zIndex: 41,
          boxShadow: "-20px 0 50px -20px rgba(11,15,25,.3)",
          animation: "drawerIn .22s cubic-bezier(.2,.8,.2,1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid rgba(11,15,25,.06)" }}>
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(11,15,25,.4)", fontWeight: 600 }}>vault</div>
            <h3 style={{ margin: "3px 0 0", fontSize: 17, fontWeight: 700 }}>audit log</h3>
          </div>
          <button onClick={closeAudit} style={{ display: "flex", background: "transparent", border: "none", padding: 4 }}>
            <Icon name="close" size={18} sw={1.8} color="rgba(11,15,25,.5)" />
          </button>
        </div>
        <div style={{ overflowY: "auto", padding: "8px 12px" }}>
          {activity.map((a) => (
            <div key={a.id} style={{ display: "flex", gap: 11, padding: "12px 8px", borderBottom: "1px solid rgba(11,15,25,.05)" }}>
              <Avatar id={a.who} size={24} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, lineHeight: 1.4 }}>
                  <b style={{ fontWeight: 600 }}>{effectiveUser(a.who, profiles).name}</b> {a.action}
                </div>
                <div style={{ fontSize: 12, color: "rgba(11,15,25,.5)", fontFamily: "ui-monospace,monospace", marginTop: 1 }}>{a.target}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(11,15,25,.38)", whiteSpace: "nowrap" }}>
                <Icon name="clock" size={15} sw={1.6} color="rgba(11,15,25,.4)" />
                {a.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
