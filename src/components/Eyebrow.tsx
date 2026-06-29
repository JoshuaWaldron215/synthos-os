interface EyebrowProps {
  index: string;
  label: string;
  color?: string;
}

export function Eyebrow({ index, label, color = "#33ADEE" }: EyebrowProps) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: ".18em",
        textTransform: "uppercase",
        color: "rgba(11,15,25,.4)",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 10,
      }}
    >
      <span style={{ color }}>{index}</span>
      <span style={{ width: 14, height: 1, background: "rgba(11,15,25,.18)" }} />
      {label}
    </div>
  );
}
