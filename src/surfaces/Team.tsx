import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Eyebrow } from "../components/Eyebrow";
import { Avatar } from "../components/Avatar";
import { ConversationModal } from "../components/ConversationModal";
import { USERS } from "../data/seed";
import { Icon } from "../lib/Icon";
import { effectiveUser, statusMeta } from "../lib/profile";
import { useIsMobile } from "../lib/useMediaQuery";
import { useStore } from "../store/useStore";
import type { Conversation } from "../types";

interface DmConvo {
  id: string;
  name: string;
  user: number;
}

function convoItemStyle(active: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 9,
    width: "100%",
    border: "none",
    background: active ? "rgba(11,15,25,.06)" : "transparent",
    padding: "8px 10px",
    borderRadius: 10,
    fontFamily: "inherit",
    fontSize: 13.5,
    fontWeight: active ? 600 : 500,
    color: active ? "#0B0F19" : "rgba(11,15,25,.62)",
    textAlign: "left",
    marginBottom: 1,
    cursor: "pointer",
  };
}

export function Team() {
  const isMobile = useIsMobile();
  const currentUserId = useStore((s) => s.currentUserId);
  const activeConvo = useStore((s) => s.activeConvo);
  const selectConvo = useStore((s) => s.selectConvo);
  const teamMsgs = useStore((s) => s.teamMsgs);
  const teamInput = useStore((s) => s.teamInput);
  const setTeamInput = useStore((s) => s.setTeamInput);
  const teamSend = useStore((s) => s.teamSend);
  const profiles = useStore((s) => s.profiles);
  const conversations = useStore((s) => s.conversations);
  const projects = useStore((s) => s.projects);
  const openProfile = useStore((s) => s.openProfile);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Conversation | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const dms: DmConvo[] = useMemo(
    () =>
      USERS.filter((u) => u.id !== currentUserId).map((u) => ({
        id: "dm" + u.id,
        name: effectiveUser(u.id, profiles).name,
        user: u.id,
      })),
    [currentUserId, profiles],
  );

  const channel = conversations.find((c) => c.id === activeConvo);
  const dm = dms.find((d) => d.id === activeConvo);
  const messages = teamMsgs[activeConvo] || [];

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activeConvo, messages.length]);

  const projectName = (id?: string) => projects.find((p) => p.id === id)?.client;

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openSettings = (c: Conversation) => {
    setEditing(c);
    setModalOpen(true);
  };

  let headerName = "general";
  let headerSub = "";
  let headerDot = "#2FC197";
  if (channel) {
    headerName = "# " + channel.name;
    const memberCount = channel.members.length;
    const guestCount = channel.guests.length;
    headerSub = `${memberCount} member${memberCount === 1 ? "" : "s"}`;
    if (guestCount) headerSub += ` · ${guestCount} guest${guestCount === 1 ? "" : "s"}`;
    if (channel.proj) headerSub += ` · ${projectName(channel.proj) ?? "project"}`;
  } else if (dm) {
    const s = statusMeta(effectiveUser(dm.user, profiles).status);
    headerName = dm.name;
    headerSub = s.label;
    headerDot = s.color;
  }

  const teamWrapStyle: CSSProperties = isMobile
    ? { display: "flex", flexDirection: "column", gap: 12 }
    : { display: "flex", gap: 16, alignItems: "stretch" };

  const newBtnStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: 8,
    border: "none",
    background: "rgba(11,15,25,.06)",
    cursor: "pointer",
    flex: "0 0 auto",
  };

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }} className="anim-sc">
      <Eyebrow index="07" label="studio" />
      <h1 style={{ margin: "0 0 4px", fontSize: isMobile ? 21 : 30, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.1 }}>
        team <i style={{ fontWeight: 600 }}>chat</i>
      </h1>
      <p style={{ margin: "0 0 20px", fontSize: 14, color: "rgba(11,15,25,.5)" }}>channels, project group chats, and dms — fast, quiet, in one place.</p>

      <div style={teamWrapStyle}>
        {!isMobile && (
          <div style={{ flex: "0 0 230px", background: "#fff", border: "1px solid rgba(11,15,25,.06)", borderRadius: 18, padding: 10, boxShadow: "var(--shadow-card)", alignSelf: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 6px 6px 10px" }}>
              <span style={{ fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(11,15,25,.38)", fontWeight: 600 }}>channels</span>
              <button onClick={openNew} title="new group chat" style={newBtnStyle}>
                <Icon name="plus" size={14} sw={2} color="rgba(11,15,25,.55)" />
              </button>
            </div>
            {conversations.map((c) => (
              <button key={c.id} onClick={() => selectConvo(c.id)} style={convoItemStyle(activeConvo === c.id)}>
                <span style={{ fontSize: 15, color: "rgba(11,15,25,.4)", fontWeight: 700 }}>#</span>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                {c.proj && <span title={projectName(c.proj)} style={{ width: 7, height: 7, borderRadius: "50%", background: "#60C8FF", flex: "0 0 auto" }} />}
              </button>
            ))}
            <div style={{ fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(11,15,25,.38)", fontWeight: 600, padding: "14px 10px 6px" }}>direct messages</div>
            {dms.map((c) => (
              <button key={c.id} onClick={() => selectConvo(c.id)} style={convoItemStyle(activeConvo === c.id)}>
                <Avatar id={c.user} size={26} presence />
                {c.name}
              </button>
            ))}
          </div>
        )}

        {isMobile && (
          <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4 }}>
            <button onClick={openNew} title="new group chat" style={{ border: "none", borderRadius: 999, padding: "7px 12px", fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", fontFamily: "inherit", background: "rgba(11,15,25,.05)", color: "rgba(11,15,25,.6)", display: "flex", alignItems: "center", gap: 4, flex: "0 0 auto" }}>
              <Icon name="plus" size={13} sw={2.2} color="rgba(11,15,25,.6)" /> new
            </button>
            {conversations.map((c) => {
              const active = activeConvo === c.id;
              return (
                <button key={c.id} onClick={() => selectConvo(c.id)} style={{ border: "none", borderRadius: 999, padding: "7px 13px", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", fontFamily: "inherit", background: active ? "#0B0F19" : "rgba(11,15,25,.05)", color: active ? "#fff" : "rgba(11,15,25,.6)", flex: "0 0 auto" }}>
                  # {c.name}
                </button>
              );
            })}
            {dms.map((c) => {
              const active = activeConvo === c.id;
              return (
                <button key={c.id} onClick={() => selectConvo(c.id)} style={{ border: "none", borderRadius: 999, padding: "7px 13px", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", fontFamily: "inherit", background: active ? "#0B0F19" : "rgba(11,15,25,.05)", color: active ? "#fff" : "rgba(11,15,25,.6)", flex: "0 0 auto" }}>
                  {c.name}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0, background: "#fff", border: "1px solid rgba(11,15,25,.06)", borderRadius: 18, boxShadow: "0 1px 2px rgba(11,15,25,.04),0 14px 34px -22px rgba(11,15,25,.3)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 16px", borderBottom: "1px solid rgba(11,15,25,.06)" }}>
            {channel ? (
              <span style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(11,15,25,.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: "rgba(11,15,25,.45)" }}>#</span>
            ) : dm ? (
              <button onClick={() => openProfile(dm.user)} title="view profile" style={{ display: "flex", border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
                <Avatar id={dm.user} size={34} presence />
              </button>
            ) : null}
            <div style={{ flex: 1, minWidth: 0 }}>
              {dm ? (
                <button onClick={() => openProfile(dm.user)} title="view profile" style={{ display: "block", border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 15, fontWeight: 700, letterSpacing: "-.01em", color: "#0B0F19", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%", textAlign: "left" }}>
                  {headerName}
                </button>
              ) : (
                <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{headerName}</div>
              )}
              <div style={{ fontSize: 12, color: "rgba(11,15,25,.45)", display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: headerDot }} />
                {headerSub}
              </div>
            </div>
            {channel && (
              <button onClick={() => openSettings(channel)} title="chat settings" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 10, border: "none", background: "rgba(11,15,25,.05)", cursor: "pointer", flex: "0 0 auto" }}>
                <Icon name="settings" size={17} sw={1.8} color="rgba(11,15,25,.55)" />
              </button>
            )}
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 7, minHeight: isMobile ? 200 : 300, maxHeight: isMobile ? "56vh" : "52vh" }}>
            {messages.length === 0 && (
              <div style={{ margin: "auto", textAlign: "center", color: "rgba(11,15,25,.4)", fontSize: 13.5, padding: 20 }}>
                no messages yet — say hello 👋
              </div>
            )}
            {messages.map((m, i) => {
              const me = m.who === currentUserId;
              const u = effectiveUser(m.who, profiles);
              return (
                <div key={i} style={{ display: "flex", justifyContent: me ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-start" }}>
                  {!me && (
                    <button onClick={() => openProfile(m.who)} title="view profile" style={{ display: "flex", border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
                      <Avatar id={m.who} size={26} presence />
                    </button>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: me ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                    {!me && (
                      <button onClick={() => openProfile(m.who)} title="view profile" style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5, fontWeight: 600, color: "rgba(11,15,25,.5)", margin: "0 0 3px 2px" }}>
                        {u.name} · {m.time}
                      </button>
                    )}
                    <div
                      style={{
                        fontSize: 14,
                        lineHeight: 1.5,
                        padding: "10px 14px",
                        borderRadius: me ? "15px 15px 4px 15px" : "15px 15px 15px 4px",
                        whiteSpace: "pre-wrap",
                        background: me ? "#0B0F19" : "rgba(11,15,25,.045)",
                        color: me ? "#fff" : "#0B0F19",
                        border: me ? "none" : "1px solid rgba(11,15,25,.05)",
                        animation: "msgIn .25s ease",
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 9, padding: "12px 14px", borderTop: "1px solid rgba(11,15,25,.06)", alignItems: "flex-end" }}>
            <textarea
              value={teamInput}
              onChange={(e) => setTeamInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  teamSend();
                }
              }}
              rows={1}
              placeholder={channel ? "message #" + channel.name + "…" : "message the studio…"}
              style={{ flex: 1, border: "1px solid rgba(11,15,25,.1)", borderRadius: 12, padding: "10px 13px", fontSize: 14, lineHeight: 1.5, resize: "none", maxHeight: 100 }}
            />
            <button onClick={teamSend} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, background: "#0B0F19", border: "none", borderRadius: 12, flex: "0 0 auto", cursor: "pointer" }}>
              <Icon name="send" size={17} sw={1.8} color="#fff" />
            </button>
          </div>
        </div>
      </div>

      <ConversationModal open={modalOpen} onClose={() => setModalOpen(false)} convo={editing} />
    </div>
  );
}
