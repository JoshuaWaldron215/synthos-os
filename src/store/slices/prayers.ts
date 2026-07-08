import {
  computeTimes,
  dateKey,
  DEFAULT_PLACE,
  fmtTime,
  PRAYER_ORDER,
  PRAYERS,
  type PrayerName,
  type PrayerPlace,
} from "../../lib/prayers";
import type { StoreGet, StoreSet } from "../types";

// How close to a prayer's start a "time to pray" nudge may fire, and how long
// after a window closes a "you haven't prayed X" nudge may fire. Both are short
// so reopening the app late doesn't replay a burst of stale reminders.
const TIME_WINDOW_MS = 15 * 60 * 1000;
const SKIP_WINDOW_MS = 30 * 60 * 1000;
const label = (k: PrayerName) => PRAYERS.find((p) => p.key === k)!.label;

// Per-user salah tracker: check off each of the five daily prayers, see today's
// times for a chosen location, and get a gentle nudge when one is skipped.
export const createPrayersSlice = (set: StoreSet, get: StoreGet) => ({
  // userId -> "YYYY-MM-DD" -> { fajr:true, ... }
  prayerLog: {} as Record<number, Record<string, Partial<Record<PrayerName, boolean>>>>,
  prayerPlace: DEFAULT_PLACE,
  // "YYYY-MM-DD" -> ["fajr:time", "asr:skip", …] already fired (today only)
  prayerNotified: {} as Record<string, string[]>,

  togglePrayer: (name: PrayerName) => {
    const uid = get().currentUserId;
    const day = dateKey();
    set((s) => {
      const forUser = s.prayerLog[uid] ?? {};
      const forDay = forUser[day] ?? {};
      return {
        prayerLog: {
          ...s.prayerLog,
          [uid]: { ...forUser, [day]: { ...forDay, [name]: !forDay[name] } },
        },
      };
    });
  },

  setPrayerPlace: (patch: Partial<PrayerPlace>) =>
    set((s) => ({ prayerPlace: { ...s.prayerPlace, ...patch } })),

  detectLocation: async (): Promise<void> => {
    if (!("geolocation" in navigator)) {
      get().showToast("location isn't available on this device");
      return;
    }
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 }),
      );
      get().setPrayerPlace({
        lat: Number(pos.coords.latitude.toFixed(4)),
        lng: Number(pos.coords.longitude.toFixed(4)),
        label: "my location",
      });
      get().showToast("prayer times set to your location");
    } catch {
      get().showToast("couldn't get your location — pick a city instead");
    }
  },

  // Called on an interval by useLiveNotifications. Fires a "time to pray" nudge
  // as each prayer arrives and a "skipped" nudge shortly after a window closes
  // unchecked. Both are gated by the `prayers` toggle (via notifyCategory) and
  // deduped per day so they never repeat.
  runPrayerReminders: () => {
    const st = get();
    const uid = st.currentUserId;
    const day = dateKey();
    const now = Date.now();
    const times = computeTimes(st.prayerPlace, new Date());
    const done = st.prayerLog[uid]?.[day] ?? {};
    const fired = st.prayerNotified[day] ?? [];
    const toFire: string[] = [];

    PRAYER_ORDER.forEach((name, i) => {
      if (done[name]) return;
      const start = times[name].getTime();
      // window closes when the next prayer starts; isha has no next today, so
      // give it a 2h evening window before counting it as missed
      const next = i < PRAYER_ORDER.length - 1 ? times[PRAYER_ORDER[i + 1]].getTime() : start + 2 * 60 * 60 * 1000;

      const timeKey = name + ":time";
      if (now >= start && now - start < TIME_WINDOW_MS && !fired.includes(timeKey)) {
        if (st.notifyCategory("prayers", { dot: PRAYERS[i].color, title: "🕌 " + label(name), body: "it's time for " + label(name) + " — " + fmtTime(times[name]), tag: "prayer-" + name }))
          toFire.push(timeKey);
      }

      const skipKey = name + ":skip";
      if (now >= next && now - next < SKIP_WINDOW_MS && !fired.includes(skipKey)) {
        if (st.notifyCategory("prayers", { dot: PRAYERS[i].color, title: label(name) + " missed", body: "you haven't logged " + label(name) + " yet", tag: "prayer-" + name, url: "/prayers" }))
          toFire.push(skipKey);
      }
    });

    if (toFire.length) {
      // keep only today's markers so the map can't grow without bound
      set({ prayerNotified: { [day]: fired.concat(toFire) } });
    } else if (Object.keys(st.prayerNotified).some((k) => k !== day)) {
      set({ prayerNotified: fired.length ? { [day]: fired } : {} });
    }
  },
});
