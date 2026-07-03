import { useStore } from "../store/useStore";

// Persistent, dismissible banner shown when a backend read/write fails while
// Supabase is configured. Distinct from the ephemeral success Toast: a stale
// shared copy is worth keeping on screen until the user acknowledges it.
export function SyncBanner() {
  const syncError = useStore((s) => s.syncError);
  const dismiss = useStore((s) => s.dismissSyncError);
  if (!syncError) return null;
  return (
    <div
      role="status"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "9px 16px",
        background: "#B4243A",
        color: "#fff",
        fontSize: 12.5,
        fontWeight: 500,
        letterSpacing: ".01em",
        zIndex: 80,
        boxShadow: "0 6px 18px -8px rgba(11,15,25,.5)",
      }}
    >
      <span aria-hidden>⚠</span>
      <span style={{ textAlign: "center" }}>{syncError}</span>
      <button
        onClick={dismiss}
        aria-label="dismiss sync warning"
        style={{
          marginLeft: 4,
          background: "rgba(255,255,255,.16)",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "3px 9px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        dismiss
      </button>
    </div>
  );
}
