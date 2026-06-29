import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Eyebrow } from "../components/Eyebrow";
import { Avatar } from "../components/Avatar";
import { ConversationModal } from "../components/ConversationModal";
import { USERS } from "../data/seed";
import * as repo from "../data/repo";
import { Icon } from "../lib/Icon";
import { effectiveUser, statusMeta } from "../lib/profile";
import { useIsMobile } from "../lib/useMediaQuery";
import { useStore } from "../store/useStore";
import type { Conversation, MessageAttachment } from "../types";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function kindOf(file: File): string {
  if (file.type) return file.type.split("/").pop() || file.type;
  const ext = file.name.split(".").pop();
  return ext ? ext.toLowerCase() : "file";
}

const QUICK_EMOJIS = ["👍", "❤️", "🎉", "✅", "😂", "👀"];

function MentionText({ text, me, usernameMap }: { text: string; me: boolean; usernameMap: Map<string, number> }) {
  const parts = text.split(/(@\w+)/g);
  const color = me ? "#7FD0FF" : "#1E7FC4";
  return (
    <>
      {parts.map((part, i) => {
        const match = /^@(\w+)$/.exec(part);
        if (match && usernameMap.has(match[1].toLowerCase())) {
          return (
            <span key={i} style={{ color, fontWeight: 600 }}>
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

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
  const toggleReaction = useStore((s) => s.toggleReaction);
  const profiles = useStore((s) => s.profiles);
  const conversations = useStore((s) => s.conversations);
  const projects = useStore((s) => s.projects);
  const openProfile = useStore((s) => s.openProfile);

  const showToast = useStore((s) => s.showToast);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Conversation | null>(null);
  const [pending, setPending] = useState<MessageAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hoverMsg, setHoverMsg] = useState<number | null>(null);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const dragDepth = useRef(0);

  const usernameMap = useMemo(() => {
    const m = new Map<string, number>();
    USERS.forEach((u) => m.set(effectiveUser(u.id, profiles).username.toLowerCase(), u.id));
    return m;
  }, [profiles]);

  const mentionMatch = /(^|\s)@(\w*)$/.exec(teamInput);
  const mentionQuery = mentionMatch ? mentionMatch[2].toLowerCase() : null;
  const mentionResults = useMemo(() => {
    if (mentionQuery === null) return [];
    return USERS.map((u) => effectiveUser(u.id, profiles))
      .filter((u) => u.id !== currentUserId && (u.username.toLowerCase().includes(mentionQuery) || u.first.toLowerCase().includes(mentionQuery)))
      .slice(0, 5);
  }, [mentionQuery, profiles, currentUserId]);

  const pickMention = (username: string) => {
    setTeamInput(teamInput.replace(/(^|\s)@(\w*)$/, `$1@${username} `));
    requestAnimationFrame(() => textRef.current?.focus());
  };

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

  useEffect(() => {
    setPending([]);
    setPickerFor(null);
    setHoverMsg(null);
    setDragOver(false);
    dragDepth.current = 0;
  }, [activeConvo]);

  const hasFiles = (e: { dataTransfer: DataTransfer }) => Array.from(e.dataTransfer.types || []).includes("Files");

  const handleFiles = async (list: FileList | null) => {
    if (!list || !list.length) return;
    setUploading(true);
    try {
      const added: MessageAttachment[] = [];
      for (const file of Array.from(list)) {
        const id = "att" + Date.now() + Math.random().toString(36).slice(2, 6);
        const path = await repo.uploadFileBlob(activeConvo, id, file);
        added.push({ id, name: file.name, kind: kindOf(file), size: file.size, path, image: file.type.startsWith("image/") });
      }
      setPending((p) => p.concat(added));
    } catch {
      showToast("attachment failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removePending = (id: string) => setPending((p) => p.filter((a) => a.id !== id));

  const send = () => {
    const text = teamInput.trim();
    teamSend(pending);
    setPending([]);
    const handles = [...text.matchAll(/@(\w+)/g)].map((m) => m[1].toLowerCase());
    const pinged = [...new Set(handles)].filter((h) => {
      const id = usernameMap.get(h);
      return id !== undefined && id !== currentUserId;
    });
    if (pinged.length) showToast("pinged " + pinged.map((h) => "@" + h).join(", "));
  };

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
      <Eyebrow index="07" label="team" />
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

        <div
          onDragEnter={(e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            dragDepth.current++;
            setDragOver(true);
          }}
          onDragOver={(e) => {
            if (hasFiles(e)) e.preventDefault();
          }}
          onDragLeave={() => {
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (dragDepth.current === 0) setDragOver(false);
          }}
          onDrop={(e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            dragDepth.current = 0;
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          style={{ position: "relative", flex: 1, minWidth: 0, background: "#fff", border: "1px solid rgba(11,15,25,.06)", borderRadius: 18, boxShadow: "0 1px 2px rgba(11,15,25,.04),0 14px 34px -22px rgba(11,15,25,.3)", display: "flex", flexDirection: "column", overflow: "hidden" }}
        >
          {dragOver && (
            <div style={{ position: "absolute", inset: 6, zIndex: 8, borderRadius: 14, border: "2px dashed rgba(96,200,255,.8)", background: "rgba(96,200,255,.1)", backdropFilter: "blur(1px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, pointerEvents: "none" }}>
              <Icon name="paperclip" size={26} sw={1.8} color="#1E7FC4" />
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0B0F19" }}>drop to attach</div>
              <div style={{ fontSize: 12.5, color: "rgba(11,15,25,.5)" }}>files will be added to your next message</div>
            </div>
          )}
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
              const reactions = m.reactions ? Object.entries(m.reactions).filter(([, ids]) => ids.length) : [];
              const showReact = hoverMsg === i || pickerFor === i;
              return (
                <div
                  key={i}
                  onMouseEnter={() => setHoverMsg(i)}
                  onMouseLeave={() => setHoverMsg((h) => (h === i ? null : h))}
                  style={{ display: "flex", justifyContent: me ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-start" }}
                >
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
                    <div style={{ display: "flex", flexDirection: me ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: me ? "flex-end" : "flex-start", gap: 6, minWidth: 0 }}>
                        {m.text && (
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
                            <MentionText text={m.text} me={me} usernameMap={usernameMap} />
                          </div>
                        )}
                        {m.attachments && m.attachments.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: me ? "flex-end" : "flex-start", gap: 6 }}>
                            {m.attachments.map((a) => (
                              <AttachmentView key={a.id} att={a} me={me} onOpen={() => showToast("attachment unavailable")} />
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ position: "relative", flex: "0 0 auto" }}>
                        <button
                          onClick={() => setPickerFor((p) => (p === i ? null : i))}
                          title="react"
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 999, border: "1px solid rgba(11,15,25,.08)", background: "#fff", cursor: "pointer", opacity: showReact ? 1 : 0, transition: "opacity .12s", fontSize: 13 }}
                        >
                          🙂
                        </button>
                        {pickerFor === i && (
                          <div
                            style={{
                              position: "absolute",
                              bottom: "calc(100% + 6px)",
                              ...(me ? { right: 0 } : { left: 0 }),
                              display: "flex",
                              gap: 2,
                              background: "#fff",
                              border: "1px solid rgba(11,15,25,.1)",
                              borderRadius: 999,
                              padding: 4,
                              boxShadow: "0 10px 26px -12px rgba(11,15,25,.4)",
                              zIndex: 5,
                              animation: "scIn .14s ease",
                            }}
                          >
                            {QUICK_EMOJIS.map((e) => (
                              <button
                                key={e}
                                onClick={() => {
                                  toggleReaction(activeConvo, i, e);
                                  setPickerFor(null);
                                }}
                                className="hov-soft"
                                style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 17, lineHeight: 1, padding: "3px 5px", borderRadius: 8 }}
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {reactions.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5, justifyContent: me ? "flex-end" : "flex-start" }}>
                        {reactions.map(([emoji, ids]) => {
                          const mine = ids.includes(currentUserId);
                          return (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(activeConvo, i, emoji)}
                              title={ids.map((id) => effectiveUser(id, profiles).first).join(", ")}
                              style={{ display: "flex", alignItems: "center", gap: 4, border: mine ? "1px solid rgba(96,200,255,.6)" : "1px solid rgba(11,15,25,.1)", background: mine ? "rgba(96,200,255,.14)" : "#fff", borderRadius: 999, padding: "2px 8px", fontSize: 12.5, fontWeight: 600, color: "#0B0F19", cursor: "pointer" }}
                            >
                              <span style={{ fontSize: 13 }}>{emoji}</span>
                              {ids.length}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(11,15,25,.06)" }}>
            {(pending.length > 0 || uploading) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {pending.map((a) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(11,15,25,.045)", border: "1px solid rgba(11,15,25,.07)", borderRadius: 10, padding: "6px 8px 6px 9px", maxWidth: 220 }}>
                    <Icon name={a.image ? "image" : "note"} size={15} color="rgba(11,15,25,.5)" />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 500, color: "#0B0F19", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</span>
                    <button onClick={() => removePending(a.id)} title="remove" style={{ display: "flex", border: "none", background: "transparent", padding: 0, cursor: "pointer", flex: "0 0 auto" }}>
                      <Icon name="close" size={14} sw={2} color="rgba(11,15,25,.4)" />
                    </button>
                  </div>
                ))}
                {uploading && <span style={{ fontSize: 12.5, color: "rgba(11,15,25,.45)", alignSelf: "center" }}>attaching…</span>}
              </div>
            )}
            <div style={{ display: "flex", gap: 9, alignItems: "flex-end" }}>
              <input ref={fileRef} type="file" multiple onChange={(e) => handleFiles(e.target.files)} style={{ display: "none" }} />
              <button
                onClick={() => fileRef.current?.click()}
                title="attach files"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, background: "rgba(11,15,25,.05)", border: "none", borderRadius: 12, flex: "0 0 auto", cursor: "pointer" }}
              >
                <Icon name="paperclip" size={18} sw={1.8} color="rgba(11,15,25,.55)" />
              </button>
              <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
                {mentionQuery !== null && mentionResults.length > 0 && (
                  <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0, background: "#fff", border: "1px solid rgba(11,15,25,.1)", borderRadius: 12, boxShadow: "0 12px 30px -14px rgba(11,15,25,.4)", overflow: "hidden", zIndex: 6, animation: "scIn .14s ease" }}>
                    {mentionResults.map((r) => (
                      <button key={r.id} onClick={() => pickMention(r.username)} className="hov-soft" style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", border: "none", background: "transparent", padding: "8px 11px", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                        <Avatar id={r.id} size={26} />
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, color: "#0B0F19" }}>{r.name}</span>
                          <span style={{ display: "block", fontSize: 12, color: "rgba(11,15,25,.45)" }}>@{r.username}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  ref={textRef}
                  value={teamInput}
                  onChange={(e) => setTeamInput(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === "Tab") && mentionQuery !== null && mentionResults.length) {
                      e.preventDefault();
                      pickMention(mentionResults[0].username);
                      return;
                    }
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder={channel ? "message #" + channel.name + "… (@ to mention)" : "message the team… (@ to mention)"}
                  style={{ display: "block", width: "100%", boxSizing: "border-box", border: "1px solid rgba(11,15,25,.1)", borderRadius: 12, padding: "10px 13px", fontSize: 14, lineHeight: 1.5, resize: "none", maxHeight: 100 }}
                />
              </div>
              <button onClick={send} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, background: "#0B0F19", border: "none", borderRadius: 12, flex: "0 0 auto", cursor: "pointer" }}>
                <Icon name="send" size={17} sw={1.8} color="#fff" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConversationModal open={modalOpen} onClose={() => setModalOpen(false)} convo={editing} />
    </div>
  );
}

function AttachmentView({ att, me, onOpen }: { att: MessageAttachment; me: boolean; onOpen: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let created: string | null = null;
    repo.fileObjectUrl(att.path).then((u) => {
      if (!active) return;
      if (u && u.startsWith("blob:")) created = u;
      setUrl(u);
    });
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [att.path]);

  const open = () => {
    if (url) window.open(url, "_blank", "noopener");
    else onOpen();
  };

  if (att.image) {
    return (
      <button onClick={open} title={att.name} style={{ border: "none", padding: 0, background: "transparent", cursor: "pointer", borderRadius: 12, overflow: "hidden", lineHeight: 0, maxWidth: 240 }}>
        {url ? (
          <img src={url} alt={att.name} style={{ display: "block", maxWidth: 240, maxHeight: 200, borderRadius: 12, border: "1px solid rgba(11,15,25,.08)", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 200, height: 130, borderRadius: 12, background: "rgba(11,15,25,.05)" }} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={open}
      title={att.name}
      style={{ display: "flex", alignItems: "center", gap: 10, maxWidth: 240, border: me ? "none" : "1px solid rgba(11,15,25,.08)", background: me ? "#0B0F19" : "rgba(11,15,25,.04)", borderRadius: 12, padding: "9px 12px", cursor: "pointer", textAlign: "left" }}
    >
      <span style={{ display: "flex", width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 8, background: me ? "rgba(255,255,255,.12)" : "rgba(11,15,25,.06)", flex: "0 0 auto" }}>
        <Icon name="note" size={15} color={me ? "#fff" : "rgba(11,15,25,.55)"} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: me ? "#fff" : "#0B0F19", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</span>
        <span style={{ display: "block", fontSize: 11.5, color: me ? "rgba(255,255,255,.6)" : "rgba(11,15,25,.45)", marginTop: 1 }}>
          {att.kind} · {fmtSize(att.size)}
        </span>
      </span>
    </button>
  );
}
