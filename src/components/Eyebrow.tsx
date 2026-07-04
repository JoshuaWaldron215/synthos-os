interface EyebrowProps {
  index: string;
  label: string;
  color?: string;
  center?: boolean;
}

export function Eyebrow({ index, label, color = "#33ADEE", center = false }: EyebrowProps) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: ".18em",
        textTransform: "uppercase",
        color: "rgba(var(--ink-rgb),.55)",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: center ? "center" : "flex-start",
        gap: 8,
        marginBottom: 10,
      }}
    >
      <span style={{ color }}>{index}</span>
      <span style={{ width: 14, height: 1, background: "rgba(var(--ink-rgb),.18)" }} />
      {label}
    </div>
  );
}
