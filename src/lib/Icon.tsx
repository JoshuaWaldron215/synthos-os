import { cloneElement, isValidElement } from "react";
import type { CSSProperties, ReactElement, ReactNode } from "react";

export type IconName =
  | "projects"
  | "tasks"
  | "content"
  | "vault"
  | "wins"
  | "library"
  | "ask"
  | "team"
  | "intake"
  | "search"
  | "plus"
  | "bell"
  | "copy"
  | "eye"
  | "eyeoff"
  | "send"
  | "close"
  | "chevron"
  | "arrowr"
  | "clock"
  | "spark"
  | "link"
  | "note"
  | "collapse"
  | "expand"
  | "menu"
  | "bolt"
  | "settings"
  | "belloff"
  | "camera"
  | "logout"
  | "check"
  | "download"
  | "github"
  | "mail"
  | "trash";

interface IconProps {
  name: IconName;
  size?: number;
  sw?: number;
  color?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 20, sw = 1.7, color = "currentColor", style }: IconProps) {
  const p = (d: string, extra?: Record<string, unknown>) => (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...extra}
    />
  );
  const r = (x: number, y: number, w: number, h: number, rx: number, extra?: Record<string, unknown>) => (
    <rect x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke={color} strokeWidth={sw} {...extra} />
  );
  const ci = (cx: number, cy: number, rr: number, extra?: Record<string, unknown>) => (
    <circle cx={cx} cy={cy} r={rr} fill="none" stroke={color} strokeWidth={sw} {...extra} />
  );
  const svg = (...kids: ReactNode[]) => (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block", flex: "0 0 auto", ...style }}>
      {kids.map((k, i) => (isValidElement(k) ? cloneElement(k as ReactElement, { key: i }) : k))}
    </svg>
  );

  switch (name) {
    case "projects":
      return svg(r(3.2, 3.2, 7, 7, 1.8), r(13.8, 3.2, 7, 7, 1.8), r(3.2, 13.8, 7, 7, 1.8), r(13.8, 13.8, 7, 7, 1.8));
    case "tasks":
      return svg(p("M8.6 12l2.3 2.3L20 5.2"), p("M20.5 12.4V18a2.4 2.4 0 0 1-2.4 2.4H6A2.4 2.4 0 0 1 3.6 18V6A2.4 2.4 0 0 1 6 3.6h8.6"));
    case "content":
      return svg(r(3, 5, 18, 14, 3), p("M10 9.4l4.6 2.6L10 14.6z", { fill: color, stroke: "none" }));
    case "vault":
      return svg(r(4, 10.4, 16, 10, 2.6), p("M7.4 10.4V7.6a4.6 4.6 0 0 1 9.2 0v2.8"), <circle cx={12} cy={15.4} r={1.5} fill={color} />);
    case "wins":
      return svg(p("M8.5 21h7"), p("M12 17.4V21"), p("M6.4 4h11.2v3.4a5.6 5.6 0 0 1-11.2 0z"), p("M6.4 5H4.6a1 1 0 0 0-1 1.2c.3 1.9 1.5 3.1 3.1 3.5 M17.6 5h1.8a1 1 0 0 1 1 1.2c-.3 1.9-1.5 3.1-3.1 3.5"));
    case "library":
      return svg(p("M5 4.6A1.6 1.6 0 0 1 6.6 3H19v15.4H6.6A1.6 1.6 0 0 0 5 20z"), p("M5 20a1.6 1.6 0 0 1 1.6-1.6H19V21H6.6A1.6 1.6 0 0 1 5 20z"));
    case "ask":
      return svg(p("M12 3.6l1.5 4 4 1.5-4 1.5L12 14.6l-1.5-4-4-1.5 4-1.5z", { fill: color, stroke: "none" }), <circle cx={18.4} cy={5.2} r={1} fill={color} />);
    case "team":
      return svg(p("M4 5.8A2.2 2.2 0 0 1 6.2 3.6h11.6A2.2 2.2 0 0 1 20 5.8v6.4a2.2 2.2 0 0 1-2.2 2.2H9l-4 3.4v-3.4H6.2A2.2 2.2 0 0 1 4 12.2z"), p("M8.5 8.4h7", { strokeWidth: sw * 0.9 }), p("M8.5 11h4", { strokeWidth: sw * 0.9 }));
    case "intake":
      return svg(p("M8 5.5h8A1.5 1.5 0 0 1 17.5 7v12A1.5 1.5 0 0 1 16 20.5H8A1.5 1.5 0 0 1 6.5 19V7A1.5 1.5 0 0 1 8 5.5z"), p("M9.6 5.5a2.4 2.4 0 0 1 4.8 0"), p("M12 10.4l.7 1.9 1.9.7-1.9.7L12 15.6l-.7-1.9-1.9-.7 1.9-.7z", { fill: color, stroke: "none" }));
    case "search":
      return svg(ci(10.5, 10.5, 6.6), p("M21 21l-5.2-5.2"));
    case "plus":
      return svg(p("M12 5.4v13.2 M5.4 12h13.2"));
    case "bell":
      return svg(p("M18.2 8.6a6.2 6.2 0 0 0-12.4 0c0 6.2-2.8 7.6-2.8 7.6h18s-2.8-1.4-2.8-7.6"), p("M13.7 19.4a2 2 0 0 1-3.4 0"));
    case "copy":
      return svg(r(8.8, 8.8, 11.2, 11.2, 2.6), p("M5.4 15.2H5A2 2 0 0 1 3 13.2V5A2 2 0 0 1 5 3h8.2a2 2 0 0 1 2 2v.4"));
    case "eye":
      return svg(p("M2.4 12S6 5.4 12 5.4 21.6 12 21.6 12 18 18.6 12 18.6 2.4 12 2.4 12z"), ci(12, 12, 2.7));
    case "eyeoff":
      return svg(p("M3.6 3.6l16.8 16.8"), p("M9.6 5.9A8.9 8.9 0 0 1 12 5.6c6 0 9.6 6.4 9.6 6.4a16.4 16.4 0 0 1-2.7 3.3 M6 7.2A16 16 0 0 0 2.4 12S6 18.4 12 18.4a8.7 8.7 0 0 0 3.4-.68"));
    case "send":
      return svg(p("M21 3.2L10.4 13.8 M21 3.2l-6.9 18-3.7-7.4L3.5 10z"));
    case "close":
      return svg(p("M6 6l12 12 M18 6L6 18"));
    case "chevron":
      return svg(p("M6 9.2l6 6 6-6"));
    case "arrowr":
      return svg(p("M5 12h13 M12.5 6l6 6-6 6"));
    case "clock":
      return svg(ci(12, 12, 8.2), p("M12 7.8v4.4l2.7 1.6"));
    case "spark":
      return svg(p("M12 4l1.3 3.6 3.6 1.3-3.6 1.3L12 13.8l-1.3-3.6L7.1 8.9l3.6-1.3z", { fill: color, stroke: "none" }));
    case "link":
      return svg(p("M10.5 13.5a3.5 3.5 0 0 0 5 0l2.6-2.6a3.5 3.5 0 0 0-5-5l-1.4 1.4"), p("M13.5 10.5a3.5 3.5 0 0 0-5 0L5.9 13.1a3.5 3.5 0 0 0 5 5l1.4-1.4"));
    case "note":
      return svg(p("M6 4.5h9l3 3V19.5A1.5 1.5 0 0 1 16.5 21H6A1.5 1.5 0 0 1 4.5 19.5v-13A1.5 1.5 0 0 1 6 4.5z"), p("M14.5 4.5V7.5h3"), p("M8 12h6", { strokeWidth: sw * 0.85 }), p("M8 15.2h4", { strokeWidth: sw * 0.85 }));
    case "collapse":
      return svg(r(3.2, 4, 17.6, 16, 3), p("M9 4v16"), p("M16 9.5l-2.5 2.5L16 14.5"));
    case "expand":
      return svg(r(3.2, 4, 17.6, 16, 3), p("M9 4v16"), p("M13 9.5l2.5 2.5L13 14.5"));
    case "menu":
      return svg(p("M4 7h16"), p("M4 12h16"), p("M4 17h16"));
    case "bolt":
      return svg(p("M12.5 3l-7 9.5h5l-1 8.5 7-10h-5z", { fill: color, stroke: "none" }));
    case "settings":
      return svg(
        ci(12, 12, 3.2),
        p("M19.4 12a7.4 7.4 0 0 0-.1-1.2l1.9-1.5-1.9-3.3-2.3.9a7.3 7.3 0 0 0-2-1.2L12.4 2h-3.8l-.5 2.4a7.3 7.3 0 0 0-2 1.2l-2.3-.9L1.9 8l1.9 1.5a7.4 7.4 0 0 0 0 2.4L1.9 13.4l1.9 3.3 2.3-.9a7.3 7.3 0 0 0 2 1.2l.5 2.4h3.8l.5-2.4a7.3 7.3 0 0 0 2-1.2l2.3.9 1.9-3.3-1.9-1.5c.06-.4.1-.8.1-1.2z")
      );
    case "belloff":
      return svg(p("M3.6 3.6l16.8 16.8"), p("M18.2 8.6a6.2 6.2 0 0 0-10.6-4.3 M5.8 8.6c0 6.2-2.8 7.6-2.8 7.6h12.8"), p("M13.7 19.4a2 2 0 0 1-3.4 0"));
    case "camera":
      return svg(p("M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z"), ci(12, 12.5, 3.4));
    case "logout":
      return svg(p("M14 4.5H6.5A1.5 1.5 0 0 0 5 6v12a1.5 1.5 0 0 0 1.5 1.5H14"), p("M16 8l4 4-4 4"), p("M20 12H9.5"));
    case "check":
      return svg(p("M5 12.5l4.5 4.5L19 6.5"));
    case "download":
      return svg(p("M12 3.5v11"), p("M7.5 10l4.5 4.5 4.5-4.5"), p("M4.5 19.5h15"));
    case "github":
      return svg(
        p(
          "M12 2.2A9.8 9.8 0 0 0 2.2 12c0 4.33 2.81 8 6.71 9.3.49.09.67-.21.67-.47v-1.64c-2.73.59-3.3-1.32-3.3-1.32-.45-1.13-1.09-1.43-1.09-1.43-.89-.61.07-.6.07-.6.98.07 1.5 1.01 1.5 1.01.88 1.5 2.3 1.07 2.86.82.09-.64.34-1.07.62-1.32-2.18-.25-4.47-1.09-4.47-4.85 0-1.07.38-1.95 1.01-2.63-.1-.25-.44-1.25.1-2.6 0 0 .82-.27 2.7 1a9.3 9.3 0 0 1 4.9 0c1.87-1.27 2.69-1 2.69-1 .54 1.35.2 2.35.1 2.6.63.68 1.01 1.56 1.01 2.63 0 3.77-2.29 4.6-4.48 4.84.35.3.67.91.67 1.83v2.71c0 .26.18.57.68.47A9.8 9.8 0 0 0 21.8 12 9.8 9.8 0 0 0 12 2.2z",
          { fill: color, stroke: "none" },
        ),
      );
    case "mail":
      return svg(r(2.8, 5.5, 18.4, 13, 2.4), p("M3.4 7l8.6 5.6L20.6 7"));
    case "trash":
      return svg(p("M4.5 6.5h15"), p("M9 6.5V5A1.5 1.5 0 0 1 10.5 3.5h3A1.5 1.5 0 0 1 15 5v1.5"), p("M6.5 6.5l.8 12A1.5 1.5 0 0 0 8.8 20h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12"));
    default:
      return svg(ci(12, 12, 8));
  }
}
