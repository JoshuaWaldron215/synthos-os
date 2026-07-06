import { INITIAL_CHAT_GREETING } from "../../data/seed";
import { respond } from "../../lib/intake";
import { sendServerPush } from "../../lib/push";
import { effectiveUser } from "../../lib/profile";
import { getSupabase, isSupabaseConfigured } from "../../lib/supabase";
import type { ChatMessage } from "../../types";
import type { StoreGet, StoreSet } from "../types";

interface AskAction {
  type: "created_task" | "updated_task";
  id: string;
  title: string;
  who: number;
  reassigned?: boolean;
}

interface AskResponse {
  configured?: boolean;
  text?: string;
  actions?: AskAction[];
}

// Ask AI: the /api/ask serverless agent (Claude, grounded in live workspace
// data, can create/assign tasks). Falls back to the canned responder when the
// backend or the Anthropic key isn't configured, so local mode still works.
export const createChatSlice = (set: StoreSet, get: StoreGet) => ({
  chat: [{ role: "ai", text: INITIAL_CHAT_GREETING }] as ChatMessage[],
  chatInput: "",
  chatBusy: false,

  setChatInput: (v: string) => set({ chatInput: v }),

  sendChat: () => {
    const t = (get().chatInput || "").trim();
    if (!t || get().chatBusy) return;
    set({ chatBusy: true });
    set((s) => ({ chat: s.chat.concat([{ role: "me", text: t }]), chatInput: "" }));

    const canned = () => {
      const reply = respond(t);
      setTimeout(() => {
        set((s) => ({ chat: s.chat.concat([{ role: "ai", text: reply, fresh: true }]), chatBusy: false }));
      }, 650);
    };

    if (!isSupabaseConfigured) {
      canned();
      return;
    }

    (async () => {
      const sb = await getSupabase();
      const { data } = (await sb?.auth.getSession()) ?? { data: { session: null } };
      const token = data.session?.access_token;
      if (!token) throw new Error("no session");

      // send the trailing window of the conversation (the user turn is
      // already appended above)
      const history = get()
        .chat.slice(-12)
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) throw new Error("ask failed: " + res.status);
      const out = (await res.json()) as AskResponse;
      if (out.configured === false || !out.text) throw new Error("not configured");

      set((s) => ({ chat: s.chat.concat([{ role: "ai", text: out.text as string, fresh: true }]), chatBusy: false }));

      // Created/updated rows arrive on every device via Realtime; here we only
      // add the human touches — a toast and a real push to the assignee's
      // phone (mirrors notifyAssigned in the tasks slice).
      const actions = out.actions ?? [];
      const created = actions.filter((a) => a.type === "created_task").length;
      if (created) get().showToast(created === 1 ? "task created ✦" : created + " tasks created ✦");
      const me = get().currentUserId;
      const assigner = effectiveUser(me, get().profiles).name;
      for (const a of actions) {
        const isNew = a.type === "created_task";
        if (a.who === me || (!isNew && !a.reassigned)) continue;
        sendServerPush(
          "task for you ✦",
          assigner + " assigned: " + a.title,
          "task-" + a.id,
          [a.who],
          "/tasks",
        ).catch(() => {});
      }
    })().catch(() => {
      // backend down or no AI key — degrade to the canned responder
      canned();
    });
  },

  ask: (t: string) => {
    set({ chatInput: t });
    get().sendChat();
  },
});
