import * as repo from "../../data/repo";
import { seedConversations, seedTeam } from "../../data/seed";
import { effectiveUser } from "../../lib/profile";
import { sendServerPush } from "../../lib/push";
import type { Conversation, MessageAttachment, TeamMessage } from "../../types";
import type { StoreGet, StoreSet } from "../types";

// Team chat: conversations (channels, DMs, project chats) and their messages.
export const createTeamSlice = (set: StoreSet, get: StoreGet) => ({
  activeConvo: "general",
  teamInput: "",
  teamMsgs: seedTeam(),
  conversations: seedConversations(),

  selectConvo: (id: string) => set({ activeConvo: id }),
  setTeamInput: (v: string) => set({ teamInput: v }),
  teamSend: (attachments?: MessageAttachment[]) => {
    const t = (get().teamInput || "").trim();
    const atts = attachments && attachments.length ? attachments : undefined;
    if (!t && !atts) return;
    const { activeConvo, currentUserId } = get();
    const msg: TeamMessage = {
      id: "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      who: currentUserId,
      text: t,
      at: Date.now(),
    };
    if (atts) msg.attachments = atts;
    set((s) => {
      const msgs = { ...s.teamMsgs };
      msgs[activeConvo] = (msgs[activeConvo] || []).concat([msg]);
      return { teamMsgs: msgs, teamInput: "" };
    });
    repo.saveMessage(activeConvo, msg).catch(get().syncCatch("message send"));
    // real Web Push to the other members' devices (best-effort — closed tabs
    // get this; open tabs are covered by Realtime + receiveTeamMessage)
    const convo = get().conversations.find((c) => c.id === activeConvo);
    const others = (convo?.members ?? []).filter((m) => m !== currentUserId);
    if (repo.usingSupabase && others.length) {
      const sender = effectiveUser(currentUserId, get().profiles).name;
      const label = !convo ? "team chat" : convo.type === "dm" ? "dm" : "#" + convo.name;
      sendServerPush(sender, label + ": " + (t || "sent an attachment"), "msg-" + activeConvo, others, "/team?c=" + activeConvo).catch(() => {
        /* push is non-critical; delivery for open tabs comes via realtime */
      });
    }
  },
  toggleReaction: (convoId: string, index: number, emoji: string) => {
    const me = get().currentUserId;
    set((s) => {
      const list = s.teamMsgs[convoId];
      if (!list || !list[index]) return {};
      const msgs = { ...s.teamMsgs };
      msgs[convoId] = list.map((m, i) => {
        if (i !== index) return m;
        const reactions = { ...(m.reactions || {}) };
        const users = reactions[emoji] ? [...reactions[emoji]] : [];
        const at = users.indexOf(me);
        if (at >= 0) users.splice(at, 1);
        else users.push(me);
        if (users.length) reactions[emoji] = users;
        else delete reactions[emoji];
        return { ...m, reactions };
      });
      return { teamMsgs: msgs };
    });
    const updated = get().teamMsgs[convoId]?.[index];
    if (updated?.id) repo.saveMessage(convoId, updated).catch(get().syncCatch("reaction"));
  },
  createConversation: ({ name, members, proj, guests }: { name: string; members: number[]; proj?: string; guests?: string[] }) => {
    const id = "c" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    const convo: Conversation = {
      id,
      type: "channel",
      name: (name || "untitled").trim().toLowerCase(),
      proj,
      members: members.length ? members : [get().currentUserId],
      guests: guests ?? [],
    };
    set((s) => ({ conversations: s.conversations.concat([convo]), activeConvo: id }));
    repo.saveConversation(convo).catch(get().syncCatch("chat create"));
    get().showToast("group chat created");
    return id;
  },
  renameConversation: (id: string, name: string) => {
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, name: name.trim().toLowerCase() || c.name } : c)),
    }));
    get().syncConversation(id);
  },
  setConversationMembers: (id: string, members: number[]) => {
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, members } : c)),
    }));
    get().syncConversation(id);
  },
  setConversationProject: (id: string, proj: string | undefined) => {
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, proj } : c)),
    }));
    get().syncConversation(id);
  },
  addGuest: (id: string, contact: string) => {
    const v = contact.trim();
    if (!v) return;
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id && !c.guests.includes(v) ? { ...c, guests: c.guests.concat([v]) } : c,
      ),
    }));
    get().syncConversation(id);
    get().showToast("guest invited · " + v);
  },
  removeGuest: (id: string, contact: string) => {
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, guests: c.guests.filter((g) => g !== contact) } : c,
      ),
    }));
    get().syncConversation(id);
  },
  // push the current state of a conversation to the backend
  syncConversation: (id: string) => {
    const convo = get().conversations.find((c) => c.id === id);
    if (convo) repo.saveConversation(convo).catch(get().syncCatch("chat update"));
  },
  deleteConversation: (id: string) => {
    const convo = get().conversations.find((c) => c.id === id);
    if (!convo || convo.system) return;
    set((s) => {
      const msgs = { ...s.teamMsgs };
      delete msgs[id];
      return {
        conversations: s.conversations.filter((c) => c.id !== id),
        teamMsgs: msgs,
        activeConvo: s.activeConvo === id ? "general" : s.activeConvo,
      };
    });
    repo.removeConversation(id).catch(get().syncCatch("chat delete"));
    get().showToast("group chat deleted");
  },
  // Seam for realtime delivery: upserts an inbound message by id (so echoes of
  // our own sends and reaction updates are applied in place, not duplicated)
  // and raises in-app / OS notifications for genuinely new messages.
  receiveTeamMessage: (convoId: string, msg: TeamMessage) => {
    const existed = !!msg.id && (get().teamMsgs[convoId] || []).some((m) => m.id === msg.id);
    set((s) => {
      const list = s.teamMsgs[convoId] || [];
      const msgs = { ...s.teamMsgs };
      msgs[convoId] = existed ? list.map((m) => (m.id === msg.id ? msg : m)) : list.concat([msg]);
      return { teamMsgs: msgs };
    });
    if (existed) return; // reaction/edit update — no notification
    const st = get();
    if (msg.who === st.currentUserId) return;
    const convo = st.conversations.find((c) => c.id === convoId);
    const label = !convo ? "team chat" : convo.type === "dm" ? "dm" : "#" + convo.name;
    const sender = effectiveUser(msg.who, st.profiles).name;
    const body = label + ": " + (msg.text || "sent an attachment");
    st.notifyCategory("mentions", { dot: "#8A84F0", title: sender, body, tag: "msg-" + convoId, url: "/team?c=" + convoId });
  },
});
