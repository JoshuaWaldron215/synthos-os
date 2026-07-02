import { CONTENT, USERS } from "../../data/seed";
import type { ContentItem, ContentLane } from "../../types";
import type { StoreGet, StoreSet } from "../types";

// Marketing content pipeline (kanban of ideas → posted).
export const createContentSlice = (set: StoreSet, get: StoreGet) => ({
  content: CONTENT.map((c) => ({ ...c })),
  contentDragId: null as string | null,
  contentDragOver: null as ContentLane | null,
  openContentId: null as string | null,
  contentComposerLane: null as ContentLane | null,
  contentComposerText: "",

  setContentDragId: (id: string | null) => set({ contentDragId: id }),
  setContentDragOver: (lane: ContentLane | null) =>
    set((s) => (s.contentDragOver === lane ? {} : { contentDragOver: lane })),
  dropContentOnLane: (lane: ContentLane) => {
    const id = get().contentDragId;
    if (id) set((s) => ({ content: s.content.map((c) => (c.id === id ? { ...c, lane } : c)) }));
    set({ contentDragId: null, contentDragOver: null });
  },
  openContentComposer: (lane: ContentLane) => set({ contentComposerLane: lane, contentComposerText: "" }),
  setContentComposerText: (v: string) => set({ contentComposerText: v }),
  saveContentComposer: () => {
    const { contentComposerLane, contentComposerText } = get();
    const v = (contentComposerText || "").trim();
    if (contentComposerLane && v) {
      get().addContent({ title: v, lane: contentComposerLane });
      set({ contentComposerText: "" });
    }
  },
  closeContentComposer: () => set({ contentComposerLane: null, contentComposerText: "" }),
  addContent: (input: { title: string; lane: ContentLane; kind?: string; who?: number }) => {
    const item: ContentItem = {
      id: "c" + Date.now() + Math.random().toString(36).slice(2, 5),
      lane: input.lane,
      title: input.title.trim(),
      kind: (input.kind || "post").trim() || "post",
      who: input.who ?? get().currentUserId,
    };
    set((s) => ({ content: s.content.concat(item) }));
    get().showToast("content added");
  },
  openContent: (id: string) => set({ openContentId: id }),
  closeContent: () => set({ openContentId: null }),
  patchContent: (id: string, patch: Partial<ContentItem>) =>
    set((s) => ({ content: s.content.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  cycleContentAssignee: (id: string) =>
    set((s) => ({ content: s.content.map((c) => (c.id === id ? { ...c, who: (c.who + 1) % USERS.length } : c)) })),
  deleteContent: (id: string) => {
    set((s) => ({ content: s.content.filter((c) => c.id !== id), openContentId: null }));
    get().showToast("content deleted");
  },
});
