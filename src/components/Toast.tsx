import { useStore } from "../store/useStore";

export function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 26,
        transform: "translateX(-50%)",
        background: "#0B0F19",
        color: "#fff",
        fontSize: 13,
        fontWeight: 500,
        padding: "11px 18px",
        borderRadius: 12,
        boxShadow: "0 14px 34px -10px rgba(11,15,25,.5)",
        zIndex: 70,
        animation: "toastIn .2s ease",
        whiteSpace: "pre-line",
        textAlign: "center",
        maxWidth: "80%",
      }}
    >
      {toast}
    </div>
  );
}
