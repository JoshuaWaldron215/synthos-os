import type { CSSProperties } from "react";
import { SM } from "../lib/style";
import type { Project } from "../types";

function monogram(client: string): string {
  const parts = client.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function ProjectThumb({
  project,
  size = 44,
  radius = 12,
  style,
}: {
  project: Project;
  size?: number;
  radius?: number;
  style?: CSSProperties;
}) {
  const base: CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    flex: "0 0 auto",
    objectFit: "cover",
    ...style,
  };
  if (project.imageUrl) {
    return <img src={project.imageUrl} alt={project.client} style={base} />;
  }
  const accent = SM[project.health];
  return (
    <span
      style={{
        ...base,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: accent.bg,
        color: accent.dot,
        fontSize: Math.round(size * 0.36),
        fontWeight: 700,
        letterSpacing: ".02em",
      }}
    >
      {monogram(project.client)}
    </span>
  );
}
