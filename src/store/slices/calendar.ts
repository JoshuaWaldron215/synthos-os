import * as repo from "../../data/repo";
import { dayStart } from "../../lib/calEvents";
import type { CalendarEvent, EventKind } from "../../types";
import type { StoreGet, StoreSet } from "../types";

// Personal calendar events sit alongside the website's bookings on /calendar.
// They belong to a builder slot and are private unless explicitly shared —
// the server enforces that in RLS, this slice just mirrors it.
export const createCalendarSlice = (set: StoreSet, get: StoreGet) => ({
  calEvents: [] as CalendarEvent[],
  eventModalDay: null as number | null,
  editingEventId: null as string | null,

  openEventModal: (day?: number) => set({ eventModalDay: day ?? dayStart(Date.now()), editingEventId: null }),
  editEvent: (id: string) => set({ editingEventId: id, eventModalDay: null }),
  closeEventModal: () => set({ eventModalDay: null, editingEventId: null }),

  addCalEvent: (input: {
    title: string;
    startAt: number;
    kind?: EventKind;
    notes?: string;
    durationMin?: number | null;
    allDay?: boolean;
    shared?: boolean;
    repeatDays?: number[];
    repeatUntil?: number | null;
    remindMin?: number | null;
  }) => {
    const e: CalendarEvent = {
      id: "ev" + Date.now() + Math.random().toString(36).slice(2, 5),
      who: get().currentUserId,
      title: input.title.trim(),
      notes: input.notes?.trim() ?? "",
      kind: input.kind ?? "personal",
      startAt: input.startAt,
      durationMin: input.durationMin ?? null,
      allDay: input.allDay ?? false,
      shared: input.shared ?? false,
      repeatDays: input.repeatDays ?? [],
      repeatUntil: input.repeatUntil ?? null,
      remindMin: input.remindMin ?? 60,
      createdAt: Date.now(),
    };
    set((s) => ({ calEvents: s.calEvents.concat(e) }));
    repo.saveCalEvent(e).catch(get().syncCatch("calendar write"));
    get().showToast("added to your calendar ✦");
  },

  updateCalEvent: (id: string, patch: Partial<CalendarEvent>) => {
    set((s) => ({ calEvents: s.calEvents.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
    const updated = get().calEvents.find((e) => e.id === id);
    if (updated) repo.saveCalEvent(updated).catch(get().syncCatch("calendar write"));
  },

  deleteCalEvent: (id: string) => {
    set((s) => ({ calEvents: s.calEvents.filter((e) => e.id !== id), editingEventId: null }));
    repo.removeCalEvent(id).catch(get().syncCatch("calendar delete"));
    get().showToast("removed");
  },

  receiveCalEvent: (ev: "upsert" | "delete", data: CalendarEvent | string) =>
    set((s) => ({
      calEvents:
        ev === "delete"
          ? s.calEvents.filter((e) => e.id !== data)
          : s.calEvents.some((e) => e.id === (data as CalendarEvent).id)
            ? s.calEvents.map((e) => (e.id === (data as CalendarEvent).id ? (data as CalendarEvent) : e))
            : s.calEvents.concat(data as CalendarEvent),
    })),
});
