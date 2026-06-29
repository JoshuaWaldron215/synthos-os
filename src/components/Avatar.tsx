import type { CSSProperties } from "react";
import { avatarStyle } from "../lib/style";
import { effectiveUser, statusMeta } from "../lib/profile";
import { useStore } from "../store/useStore";

interface AvatarProps {
  id: number;
  size?: number;
  i?: number;
  style?: CSSProperties;
  /** show a live presence dot reflecting the user's status */
  presence?: boolean;
}

export function Avatar({ id, size = 26, i = 0, style, presence = false }: AvatarProps) {
  const profiles = useStore((s) => s.profiles);
  const u = effectiveUser(id, profiles);
  const base = avatarStyle(id, i, size);

  const inner = u.avatarUrl ? (
    <img src={u.avatarUrl} alt={u.name} style={{ ...base, objectFit: "cover", background: "#fff", ...style }} />
  ) : (
    <span style={{ ...base, ...style }}>{u.initials}</span>
  );

  if (!presence) return inner;

  const dot = Math.max(8, Math.round(size * 0.3));
  return (
    <span style={{ position: "relative", display: "inline-flex", flex: "0 0 auto" }}>
      {inner}
      <span
        title={statusMeta(u.status).label}
        style={{
          position: "absolute",
          right: -1,
          bottom: -1,
          width: dot,
          height: dot,
          borderRadius: "50%",
          background: statusMeta(u.status).color,
          boxShadow: "0 0 0 2px #fff",
        }}
      />
    </span>
  );
}
