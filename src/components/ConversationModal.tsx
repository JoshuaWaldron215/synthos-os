import { useEffect, useState, type CSSProperties } from "react";
import { USERS } from "../data/seed";
import { useStore } from "../store/useStore";
import { Avatar } from "./Avatar";
import { Icon } from "../lib/Icon";
import { ResponsiveModal } from "./ResponsiveModal";
import type { Conversation } from "../types";

const field: CSSProperties = {
  width: "100%",
  border: "1px solid rgba(11,15,25,.1)",
  borderRadius: 12,
  padding: "11px 13px",
  fontSize: 16,
  fontFamily: "inherit",
  color: "#0B0F19",
  boxSizing: "border-box",
};
const labelStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "rgba(11,15,25,.45)",
  fontWeight: 700,
  display: "block",
  marginBottom: 7,
};

function looksLikeContact(v: string): boolean {
  const t = v.trim();
  return /\+?[\d().\-\s]{7,}/.test(t) || /\S+@\S+\.\S+/.test(t);
}

export function ConversationModal({ open, onClose, convo }: { open: boolean; onClose: () => void; convo?: Conversation | null }) {
  const projects = useStore((s) => s.projects);
  const currentUserId = useStore((s) => s.currentUserId);
  const createConversation = useStore((s) => s.createConversation);
  const renameConversation = useStore((s) => s.renameConversation);
  const setConversationMembers = useStore((s) => s.setConversationMembers);
  const setConversationProject = useStore((s) => s.setConversationProject);
  const addGuest = useStore((s) => s.addGuest);
  const removeGuest = useStore((s) => s.removeGuest);
  const deleteConversation = useStore((s) => s.deleteConversation);
  const showToast = useStore((s) => s.showToast);

  const editing = !!convo;

  const [name, setName] = useState("");
  const [members, setMembers] = useState<number[]>([currentUserId]);
  const [proj, setProj] = useState("");
  const [guests, setGuests] = useState<string[]>([]);
  const [guestInput, setGuestInput] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(convo?.name ?? "");
    setMembers(convo?.members ?? [currentUserId]);
    setProj(convo?.proj ?? "");
    setGuests(convo?.guests ?? []);
    setGuestInput("");
  }, [open, convo, currentUserId]);

  const toggleMember = (id: number) => {
    setMembers((m) => (m.includes(id) ? m.filter((x) => x !== id) : m.concat([id])));
  };

  const pickProject = (id: string) => {
    setProj(id);
    if (id && !name.trim()) {
      const p = projects.find((x) => x.id === id);
      if (p) setName(p.client.toLowerCase());
    }
  };

  const submitGuest = () => {
    const v = guestInput.trim();
    if (!v) return;
    if (!looksLikeContact(v)) {
      showToast("enter a valid phone or email");
      return;
    }
    if (editing) addGuest(convo!.id, v);
    else setGuests((g) => (g.includes(v) ? g : g.concat([v])));
    setGuestInput("");
  };

  const removeGuestLocal = (g: string) => {
    if (editing) removeGuest(convo!.id, g);
    else setGuests((gs) => gs.filter((x) => x !== g));
  };

  const save = () => {
    if (!name.trim()) return;
    if (editing) {
      renameConversation(convo!.id, name);
      setConversationMembers(convo!.id, members.length ? members : [currentUserId]);
      setConversationProject(convo!.id, proj || undefined);
      showToast("group chat updated");
    } else {
      createConversation({ name, members, proj: proj || undefined, guests });
    }
    onClose();
  };

  return (
    <ResponsiveModal open={open} onClose={onClose} title={editing ? "chat settings" : "new group chat"} width={480}>
      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>name</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. launch-room" style={field} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>link a project (optional)</label>
        <select value={proj} onChange={(e) => pickProject(e.target.value)} style={field}>
          <option value="">no project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.client}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle}>members</label>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {USERS.map((u) => {
            const on = members.includes(u.id);
            return (
              <button key={u.id} onClick={() => toggleMember(u.id)} style={{ display: "flex", alignItems: "center", gap: 7, border: on ? "1px solid rgba(96,200,255,.55)" : "1px solid rgba(11,15,25,.08)", background: on ? "rgba(96,200,255,.12)" : "#fff", padding: "4px 12px 4px 4px", borderRadius: 999, fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: "#0B0F19" }}>
                <Avatar id={u.id} size={26} />
                {u.first}
                {on && <Icon name="check" size={14} sw={2.4} color="#1f8fbf" />}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>guests · phone or email (optional)</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={guestInput}
            onChange={(e) => setGuestInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitGuest();
              }
            }}
            placeholder="+1 555 012 3456 or client@co.com"
            style={field}
          />
          <button onClick={submitGuest} style={{ flex: "0 0 auto", background: "rgba(11,15,25,.06)", border: "none", borderRadius: 12, padding: "0 16px", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>add</button>
        </div>
        {guests.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
            {guests.map((g) => (
              <div key={g} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "rgba(11,15,25,.04)", borderRadius: 10, padding: "8px 10px 8px 12px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#0B0F19", minWidth: 0 }}>
                  <Icon name="team" size={14} sw={1.8} color="rgba(11,15,25,.5)" />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g}</span>
                </span>
                <button onClick={() => removeGuestLocal(g)} style={{ background: "transparent", border: "none", padding: 2, display: "flex" }}>
                  <Icon name="close" size={15} sw={1.8} color="rgba(11,15,25,.45)" />
                </button>
              </div>
            ))}
          </div>
        )}
        <p style={{ fontSize: 11.5, color: "rgba(11,15,25,.42)", margin: "9px 2px 0", lineHeight: 1.45 }}>
          guests appear in the chat now. outbound SMS/email delivery turns on once an sms/email provider is connected.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        {editing && !convo!.system ? (
          <button
            onClick={() => {
              deleteConversation(convo!.id);
              onClose();
            }}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid rgba(224,74,74,.3)", color: "#e04a4a", borderRadius: 11, padding: "10px 14px", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}
          >
            <Icon name="trash" size={15} sw={1.8} color="#e04a4a" /> delete
          </button>
        ) : (
          <span />
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ background: "transparent", border: "1px solid rgba(11,15,25,.1)", borderRadius: 11, padding: "10px 16px", fontSize: 14, fontWeight: 600, fontFamily: "inherit" }}>cancel</button>
          <button onClick={save} disabled={!name.trim()} style={{ background: "#0B0F19", color: "#fff", border: "none", borderRadius: 11, padding: "10px 18px", fontSize: 14, fontWeight: 600, fontFamily: "inherit", opacity: name.trim() ? 1 : 0.5 }}>
            {editing ? "save" : "create chat ✦"}
          </button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
