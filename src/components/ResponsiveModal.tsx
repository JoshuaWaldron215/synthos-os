import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { useIsMobile } from "../lib/useMediaQuery";
import { Icon } from "../lib/Icon";

interface ResponsiveModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  /** desktop max width */
  width?: number;
  /** show the small grab handle on mobile */
  showHandle?: boolean;
  /** mobile sheet max height */
  maxHeight?: string;
}

// Stack of open modal ids so Escape only dismisses the top-most one
// (e.g. a ConfirmDialog nested inside the task modal).
const modalStack: number[] = [];
let nextModalId = 0;

/**
 * Centered card on desktop, bottom sheet on mobile.
 * Used for quick capture, task detail, account, etc.
 */
export function ResponsiveModal({
  open,
  onClose,
  children,
  title,
  width = 480,
  showHandle = true,
  maxHeight = "88vh",
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  // close on Escape while open — but only the top-most open modal
  useEffect(() => {
    if (!open) return;
    const id = ++nextModalId;
    idRef.current = id;
    modalStack.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalStack[modalStack.length - 1] === id) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      const at = modalStack.indexOf(id);
      if (at >= 0) modalStack.splice(at, 1);
    };
  }, [open, onClose]);

  // move focus into the dialog unless a child (e.g. an autoFocus input) already has it
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const panel = panelRef.current;
      if (panel && !panel.contains(document.activeElement)) panel.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  if (!open) return null;

  const overlayStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    background: "rgba(var(--ink-rgb),.28)",
    zIndex: 50,
    display: "flex",
    alignItems: isMobile ? "flex-end" : "flex-start",
    justifyContent: "center",
    padding: isMobile ? 0 : "8vh 16px 16px",
    animation: "fadeIn .18s ease",
    overflowY: "auto",
  };

  const panelStyle: CSSProperties = isMobile
    ? {
        position: "relative",
        width: "100%",
        maxHeight,
        background: "var(--card)",
        borderRadius: "22px 22px 0 0",
        boxShadow: "0 -20px 60px -20px rgba(11,15,25,.45)",
        padding: "10px 18px calc(20px + env(safe-area-inset-bottom))",
        animation: "sheetUp .26s cubic-bezier(.2,.8,.2,1)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }
    : {
        position: "relative",
        width,
        maxWidth: "100%",
        background: "var(--card)",
        borderRadius: 20,
        boxShadow: "var(--shadow-modal)",
        padding: 20,
        animation: "scIn .2s ease",
      };

  return (
    <div onClick={onClose} style={overlayStyle}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={panelStyle}
      >
        {isMobile && showHandle && (
          <div style={{ display: "flex", justifyContent: "center", padding: "2px 0 12px", flex: "0 0 auto" }}>
            <span style={{ width: 38, height: 4, borderRadius: 999, background: "rgba(var(--ink-rgb),.16)" }} />
          </div>
        )}
        {title && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flex: "0 0 auto" }}>
            <span style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", fontWeight: 600 }}>{title}</span>
            <button onClick={onClose} style={{ display: "flex", background: "transparent", border: "none", padding: 2 }}>
              <Icon name="close" size={18} sw={1.8} color="rgba(var(--ink-rgb),.5)" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
