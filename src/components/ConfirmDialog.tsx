import { ResponsiveModal } from "./ResponsiveModal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

/** Branded replacement for window.confirm — used before destructive actions. */
export function ConfirmDialog({ open, title, body, confirmLabel = "delete", onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <ResponsiveModal open={open} onClose={onClose} title={title} width={380}>
      {body && <p style={{ margin: "0 0 18px", fontSize: 14, lineHeight: 1.55, color: "rgba(var(--ink-rgb),.65)" }}>{body}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 11, padding: "10px 16px", fontSize: 14, fontWeight: 600, fontFamily: "inherit", color: "var(--ink)" }}
        >
          cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          style={{ background: "#C5343A", color: "#fff", border: "none", borderRadius: 11, padding: "10px 18px", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}
        >
          {confirmLabel}
        </button>
      </div>
    </ResponsiveModal>
  );
}
