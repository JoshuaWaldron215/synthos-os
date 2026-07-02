import { seedConversations, seedTeam } from "../../data/seed";
import { effectiveUser } from "../../lib/profile";
import { showOSNotification } from "../../lib/notifications";
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
    set((s) => {
      const msgs = { ...s.teamMsgs };
      const msg: TeamMessage = { who: currentUserId, text: t, at: Date.now() };
      if (atts) msg.attachments = atts;
      msgs[activeConvo] = (msgs[activeConvo] || []).concat([msg]);
      return { teamMsgs: msgs, teamInput: "" };
    });
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
    get().showToast("group chat created");
    return id;
  },
  renameConversation: (id: string, name: string) =>
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, name: name.trim().toLowerCase() || c.name } : c)),
    })),
  setConversationMembers: (id: string, members: number[]) =>
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, members } : c)),
    })),
  setConversationProject: (id: string, proj: string | undefined) =>
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, proj } : c)),
    })),
  addGuest: (id: string, contact: string) => {
    const v = contact.trim();
    if (!v) return;
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id && !c.guests.includes(v) ? { ...c, guests: c.guests.concat([v]) } : c,
      ),
    }));
    get().showToast("guest invited · " + v);
  },
  removeGuest: (id: string, contact: string) =>
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === id ? { ...c, guests: c.guests.filter((g) => g !== contact) } : c,
      ),
    })),
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
    get().showToast("group chat deleted");
  },
  // Seam for realtime delivery (e.g. Supabase Realtime): appends an inbound
  // message and raises in-app / OS notifications for the recipient.
  receiveTeamMessage: (convoId: string, who: number, text: string) => {
    set((s) => {
      const msgs = { ...s.teamMsgs };
      msgs[convoId] = (msgs[convoId] || []).concat([{ who, text, at: Date.now() }]);
      return { teamMsgs: msgs };
    });
    const st = get();
    if (who === st.currentUserId) return;
    const convo = st.conversations.find((c) => c.id === convoId);
    const label = convo ? "#" + convo.name : "team chat";
    const sender = effectiveUser(who, st.profiles).name;
    st.pushNotification({ dot: "#8A84F0", title: sender, body: label + ": " + text, category: "mentions" });
    const prefs = st.prefs[st.currentUserId];
    if (prefs?.pushEnabled && prefs.mentions && st.notifPermission === "granted") {
      showOSNotification(sender, label + ": " + text, "msg-" + convoId);
    }
  },
});
