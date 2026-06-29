import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../lib/Icon";
import type { IconName } from "../lib/Icon";
import { effectiveUser, githubHandle, githubUrl, statusMeta } from "../lib/profile";
import { useStore } from "../store/useStore";
import { Avatar } from "./Avatar";
import { ResponsiveModal } from "./ResponsiveModal";

function DetailRow({ icon, label, value, href, onCopy }: { icon: IconName; label: string; value: string; href?: string; onCopy?: () => void }) {
  const body: ReactNode = (
    <>
      <span style={{ display: "flex", width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 10, background: "rgba(11,15,25,.05)", flex: "0 0 auto" }}>
        <Icon name={icon} size={17} color="rgba(11,15,25,.55)" />
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: "block", fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(11,15,25,.4)", fontWeight: 700 }}>{label}</span>
        <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#0B0F19", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
      </span>
      {href && <Icon name="arrowr" size={16} color="rgba(11,15,25,.3)" />}
    </>
  );

  const baseStyle = { display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "9px 10px", borderRadius: 12, textAlign: "left" as const, textDecoration: "none" };

  if (href) {
    return (
      <a className="hov-row" href={href} target="_blank" rel="noreferrer" style={{ ...baseStyle, color: "inherit" }}>
        {body}
      </a>
    );
  }
  return (
    <button className="hov-row" onClick={onCopy} style={{ ...baseStyle, border: "none", background: "transparent", fontFamily: "inherit", cursor: onCopy ? "pointer" : "default" }}>
      {body}
    </button>
  );
}

export function ProfileCard() {
  const navigate = useNavigate();
  const openProfileId = useStore((s) => s.openProfileId);
  const profiles = useStore((s) => s.profiles);
  const currentUserId = useStore((s) => s.currentUserId);
  const close = useStore((s) => s.closeProfile);
  const selectConvo = useStore((s) => s.selectConvo);
  const copy = useStore((s) => s.copy);

  if (openProfileId === null) return null;
  const u = effectiveUser(openProfileId, profiles);
  const status = statusMeta(u.status);
  const isMe = openProfileId === currentUserId;
  const gh = githubUrl(u.github);

  return (
    <ResponsiveModal open={openProfileId !== null} onClose={close} width={420} showHandle>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "6px 4px 4px" }}>
        <Avatar id={u.id} size={84} presence />
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.015em", marginTop: 12 }}>{u.name}</div>
        <div style={{ fontSize: 13.5, color: "rgba(11,15,25,.5)", marginTop: 1 }}>@{u.username} · {u.role}</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, background: "rgba(11,15,25,.04)", borderRadius: 999, padding: "5px 12px" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: status.color }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "#0B0F19" }}>{status.label}</span>
        </div>
        {u.bio && <p style={{ margin: "13px 4px 0", fontSize: 13.5, lineHeight: 1.5, color: "rgba(11,15,25,.6)" }}>{u.bio}</p>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 1, margin: "16px 0 4px" }}>
        <DetailRow icon="mail" label="email" value={u.email} href={u.email ? "mailto:" + u.email : undefined} />
        {gh ? (
          <DetailRow icon="github" label="github" value={githubHandle(u.github)} href={gh} />
        ) : (
          <DetailRow icon="github" label="github" value={isMe ? "add your github in settings" : "not added"} />
        )}
      </div>

      <div style={{ display: "flex", gap: 9, marginTop: 14 }}>
        {isMe ? (
          <button
            onClick={() => {
              close();
              navigate("/settings");
            }}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#0B0F19", color: "#fff", border: "none", borderRadius: 12, padding: "12px 16px", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}
          >
            <Icon name="settings" size={17} color="#fff" /> edit profile
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                close();
                selectConvo("dm" + u.id);
                navigate("/team");
              }}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#0B0F19", color: "#fff", border: "none", borderRadius: 12, padding: "12px 16px", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}
            >
              <Icon name="send" size={16} color="#fff" /> message
            </button>
            <button
              onClick={() => copy(u.email, "copied " + u.email)}
              className="hov-soft"
              title="copy email"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 46, background: "#fff", border: "1px solid rgba(11,15,25,.1)", borderRadius: 12, fontFamily: "inherit" }}
            >
              <Icon name="copy" size={17} color="#0B0F19" />
            </button>
          </>
        )}
      </div>
    </ResponsiveModal>
  );
}
