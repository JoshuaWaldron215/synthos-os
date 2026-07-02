import { INITIAL_CHAT_GREETING } from "../../data/seed";
import { respond } from "../../lib/intake";
import type { ChatMessage } from "../../types";
import type { StoreGet, StoreSet } from "../types";

// "Ask AI" assistant — a canned local responder until a real model is wired in.
export const createChatSlice = (set: StoreSet, get: StoreGet) => ({
  chat: [{ role: "ai", text: INITIAL_CHAT_GREETING }] as ChatMessage[],
  chatInput: "",

  setChatInput: (v: string) => set({ chatInput: v }),
  sendChat: () => {
    const t = (get().chatInput || "").trim();
    if (!t) return;
    set((s) => ({ chat: s.chat.concat([{ role: "me", text: t }]), chatInput: "" }));
    const reply = respond(t);
    setTimeout(() => {
      set((s) => ({ chat: s.chat.concat([{ role: "ai", text: reply, fresh: true }]) }));
    }, 650);
  },
  ask: (t: string) => {
    set({ chatInput: t });
    get().sendChat();
  },
});
