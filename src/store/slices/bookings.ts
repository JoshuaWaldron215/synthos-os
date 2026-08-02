import { type BookingRow, type EventTypeInfo, toBooking } from "../../data/repo";
import { fmtTime } from "../../lib/calendar";
import type { Booking } from "../../types";
import type { StoreGet, StoreSet } from "../types";

// Website bookings (read-only mirror of the site's `bookings` table, same DB).
// The team never creates these in-app — the site does — so this slice only
// receives: hydrate loads the window, realtime keeps it live, and a genuinely
// new future booking pings the team.
export const createBookingsSlice = (set: StoreSet, get: StoreGet) => ({
  bookings: [] as Booking[],
  eventTypes: {} as Record<string, EventTypeInfo>,

  // realtime handler — raw row in, resolved Booking out (event-type title comes
  // from the map hydrate already loaded)
  receiveBooking: (ev: "upsert" | "delete", data: BookingRow | string) => {
    if (ev === "delete") {
      set((s) => ({ bookings: s.bookings.filter((b) => b.id !== data) }));
      return;
    }
    const row = data as BookingRow;
    const st = get();
    const b = toBooking(row, st.eventTypes);
    const prev = st.bookings.find((x) => x.id === b.id);
    set((s) => ({
      bookings: s.bookings.some((x) => x.id === b.id)
        ? s.bookings.map((x) => (x.id === b.id ? b : x))
        : s.bookings.concat(b),
    }));

    // ping on a genuinely new upcoming booking, and when one gets cancelled
    if (!prev && b.startAt >= Date.now() && b.status !== "cancelled") {
      const when = new Date(b.startAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
      st.notifyCategory("bookings", {
        dot: "#2FC197",
        title: "📅 new booking",
        body: b.eventType + " · " + b.inviteeName + " · " + when + " " + fmtTime(b.startAt),
        tag: "booking-" + b.id,
        url: "/calendar",
      });
    } else if (prev && prev.status !== "cancelled" && b.status === "cancelled") {
      st.notifyCategory("bookings", {
        dot: "#C6663F",
        title: "booking cancelled",
        body: b.eventType + " · " + b.inviteeName + " cancelled",
        tag: "booking-" + b.id,
        url: "/calendar",
      });
    }
  },
});
