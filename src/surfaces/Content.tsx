import type { CSSProperties } from "react";
import { useState } from "react";
import { Eyebrow } from "../components/Eyebrow";
import { Avatar } from "../components/Avatar";
import { ContentModal } from "../components/ContentModal";
import { CONTENT_LANES } from "../lib/board";
import { Icon } from "../lib/Icon";
import { SM } from "../lib/style";
import { useIsMobile } from "../lib/useMediaQuery";
import { useStore } from "../store/useStore";
import type { ContentItem } from "../types";

const ASSISTS = ["hook", "script", "repurpose"];

function ContentCard({ item }: { item: ContentItem }) {
  const dragId = useStore((s) => s.contentDragId);
  const setDragId = useStore((s) => s.setContentDragId);
  const setDragOver = useStore((s) => s.setContentDragOver);
  const openContent = useStore((s) => s.openContent);
  const showToast = useStore((s) => s.showToast);

  return (
    <div
      draggable
      onDragStart={(e) => {
        setDragId(item.id);
        try {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", item.id);
        } catch {
          /* noop */
        }
      }}
      onDragEnd={() => {
        setDragId(null);
        setDragOver(null);
      }}
      onClick={() => openContent(item.id)}
      className="hov-task"
      style={{
        background: "#fff",
        border: "1px solid rgba(11,15,25,.06)",
        borderRadius: 14,
        padding: 14,
        boxShadow: "var(--shadow-task)",
        cursor: "pointer",
        opacity: dragId === item.id ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
        <span style={{ fontSize: 10.5, color: "rgba(11,15,25,.45)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em" }}>{item.kind}</span>
        <Avatar id={item.who} size={22} />
      </div>
      <p style={{ margin: "0 0 13px", fontSize: 13.5, lineHeight: 1.4, fontWeight: 500 }}>{item.title}</p>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {ASSISTS.map((b) => (
          <button
            key={b}
            className="hov-assist"
            onClick={(e) => {
              e.stopPropagation();
              showToast(b + " — drafting with ai ✦");
            }}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(11,15,25,.04)", border: "none", borderRadius: 8, padding: "5px 9px", fontSize: 11.5, fontWeight: 600, color: "#0B0F19" }}
          >
            <span style={{ fontSize: 11 }}>✦</span>
            {b}
          </button>
        ))}
      </div>
    </div>
  );
}

function Lane({ laneKey, label, accentKey, isMobile }: { laneKey: string; label: string; accentKey: keyof typeof SM; isMobile: boolean }) {
  const content = useStore((s) => s.content);
  const dragOver = useStore((s) => s.contentDragOver);
  const setDragOver = useStore((s) => s.setContentDragOver);
  const dropOnLane = useStore((s) => s.dropContentOnLane);
  const composerLane = useStore((s) => s.contentComposerLane);
  const composerText = useStore((s) => s.contentComposerText);
  const openComposer = useStore((s) => s.openContentComposer);
  const setComposerText = useStore((s) => s.setContentComposerText);
  const saveComposer = useStore((s) => s.saveContentComposer);
  const closeComposer = useStore((s) => s.closeContentComposer);

  // null = follow default (open when the lane has cards); otherwise an explicit toggle
  const [collapsed, setCollapsed] = useState<boolean | null>(null);

  const accent = SM[accentKey];
  const items = content.filter((c) => c.lane === laneKey);
  const composerOpen = composerLane === laneKey;
  const isOver = dragOver === laneKey;
  const open = !isMobile || (collapsed === null ? items.length > 0 : !collapsed);

  const containerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    border: isOver ? "1.5px solid rgba(96,200,255,.55)" : "1.5px solid transparent",
    transition: "border-color .15s, background .15s",
    ...(isMobile
      ? {
          width: "100%",
          background: isOver ? "rgba(96,200,255,.06)" : "rgba(11,15,25,.025)",
          borderRadius: 16,
          padding: 12,
        }
      : {
          flex: "0 0 252px",
          minWidth: 252,
          background: isOver ? "rgba(96,200,255,.06)" : "transparent",
          borderRadius: 16,
          padding: 4,
        }),
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(laneKey);
      }}
      onDrop={(e) => {
        e.preventDefault();
        dropOnLane(laneKey);
      }}
      style={containerStyle}
    >
      {isMobile ? (
        <button
          onClick={() => setCollapsed(open)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 2px", background: "transparent", border: "none", width: "100%", textAlign: "left", fontFamily: "inherit" }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: accent.dot, flex: "0 0 auto" }} />
          <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
          <span style={{ fontSize: 12, color: "rgba(11,15,25,.4)", fontWeight: 600 }}>{items.length}</span>
          <span style={{ marginLeft: "auto", display: "flex", transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .18s", color: "rgba(11,15,25,.4)" }}>
            <Icon name="chevron" size={18} sw={2} />
          </span>
        </button>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: accent.dot }} />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
            <span style={{ fontSize: 12, color: "rgba(11,15,25,.4)", fontWeight: 600 }}>{items.length}</span>
          </div>
          <div style={{ height: 3, borderRadius: 3, background: accent.bg }} />
        </>
      )}

      {open && items.map((c) => (
        <ContentCard key={c.id} item={c} />
      ))}

      {open && (composerOpen ? (
        <div style={{ background: "#fff", border: "1px solid rgba(96,200,255,.5)", borderRadius: 14, padding: 11, boxShadow: "0 8px 22px -14px rgba(11,15,25,.3)" }}>
          <textarea
            autoFocus
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                saveComposer();
              } else if (e.key === "Escape") {
                closeComposer();
              }
            }}
            rows={2}
            placeholder="content idea… (enter to add)"
            style={{ width: "100%", border: "none", resize: "none", fontSize: 13.5, lineHeight: 1.4, fontFamily: "inherit", color: "#0B0F19", background: "transparent" }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 4 }}>
            <button onClick={closeComposer} style={{ background: "transparent", border: "none", borderRadius: 8, padding: "5px 10px", fontSize: 12.5, fontWeight: 600, color: "rgba(11,15,25,.5)", fontFamily: "inherit" }}>cancel</button>
            <button onClick={saveComposer} style={{ background: "#0B0F19", color: "#fff", border: "none", borderRadius: 8, padding: "5px 13px", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit" }}>add</button>
          </div>
        </div>
      ) : (
        <button
          className="hov-dashed"
          onClick={() => openComposer(laneKey)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", border: "1px dashed rgba(11,15,25,.16)", background: "transparent", borderRadius: 11, padding: "9px 11px", fontSize: 12.5, fontWeight: 600, color: "rgba(11,15,25,.5)", fontFamily: "inherit" }}
        >
          <Icon name="plus" size={14} sw={2} /> add idea
        </button>
      ))}
    </div>
  );
}

export function Content() {
  const isMobile = useIsMobile();

  return (
    <div className="anim-sc">
      <Eyebrow index="03" label="marketing" />
      <h1 style={{ margin: "0 0 4px", fontSize: isMobile ? 21 : 30, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.1 }}>
        content <i style={{ fontWeight: 600 }}>pipeline</i>
      </h1>
      <p style={{ margin: "0 0 22px", fontSize: 14, color: "rgba(11,15,25,.5)" }}>
        idea to posted · {isMobile ? "tap a card to edit & move it" : "drag to move · click a card to edit"}. each card has ai assists — hook, script, repurpose.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 10 : 14,
          overflowX: isMobile ? "visible" : "auto",
          paddingBottom: 10,
          alignItems: isMobile ? "stretch" : "flex-start",
        }}
      >
        {CONTENT_LANES.map((l) => (
          <Lane key={l.key} laneKey={l.key} label={l.label} accentKey={l.accent} isMobile={isMobile} />
        ))}
      </div>

      <ContentModal />
    </div>
  );
}
