import {
  CalculationMethod,
  type CalculationParameters,
  Coordinates,
  Madhab,
  PrayerTimes,
} from "adhan";

// The five daily prayers, in order, with a brand-fit colour that walks the day
// from dawn to night (reuses the app's dot palette so it reads as one system).
export type PrayerName = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export const PRAYERS: { key: PrayerName; label: string; arabic: string; color: string }[] = [
  { key: "fajr", label: "Fajr", arabic: "الفجر", color: "#6E8BE0" },
  { key: "dhuhr", label: "Dhuhr", arabic: "الظهر", color: "#33ADEE" },
  { key: "asr", label: "Asr", arabic: "العصر", color: "#F0A94B" },
  { key: "maghrib", label: "Maghrib", arabic: "المغرب", color: "#FF8A63" },
  { key: "isha", label: "Isha", arabic: "العشاء", color: "#8A84F0" },
];

export const PRAYER_ORDER: PrayerName[] = PRAYERS.map((p) => p.key);

export type MethodKey =
  | "NorthAmerica"
  | "MuslimWorldLeague"
  | "Egyptian"
  | "Karachi"
  | "UmmAlQura"
  | "Dubai"
  | "MoonsightingCommittee"
  | "Turkey";

export const METHODS: { key: MethodKey; label: string }[] = [
  { key: "NorthAmerica", label: "North America (ISNA)" },
  { key: "MuslimWorldLeague", label: "Muslim World League" },
  { key: "Egyptian", label: "Egyptian" },
  { key: "Karachi", label: "Karachi" },
  { key: "UmmAlQura", label: "Umm al-Qura (Makkah)" },
  { key: "Dubai", label: "Dubai" },
  { key: "MoonsightingCommittee", label: "Moonsighting Committee" },
  { key: "Turkey", label: "Turkey (Diyanet)" },
];

export interface PrayerPlace {
  lat: number;
  lng: number;
  label: string;
  method: MethodKey;
  /** Hanafi shifts Asr later; Shafi (and most others) is the common default */
  madhab: "shafi" | "hanafi";
}

// A short list of presets so there's a no-permission path; "use my location"
// refines to exact coordinates via the browser geolocation API.
export const PRESET_PLACES: { label: string; lat: number; lng: number }[] = [
  { label: "New York", lat: 40.7128, lng: -74.006 },
  { label: "Philadelphia", lat: 39.9526, lng: -75.1652 },
  { label: "Chicago", lat: 41.8781, lng: -87.6298 },
  { label: "Houston", lat: 29.7604, lng: -95.3698 },
  { label: "Los Angeles", lat: 34.0522, lng: -118.2437 },
  { label: "Toronto", lat: 43.6532, lng: -79.3832 },
  { label: "London", lat: 51.5074, lng: -0.1278 },
  { label: "Dubai", lat: 25.2048, lng: 55.2708 },
  { label: "Makkah", lat: 21.4225, lng: 39.8262 },
];

// Team runs on Eastern time (see the 8am briefing), so default there; each
// device can change it and the choice persists locally.
export const DEFAULT_PLACE: PrayerPlace = {
  lat: 40.7128,
  lng: -74.006,
  label: "New York",
  method: "NorthAmerica",
  madhab: "shafi",
};

function paramsFor(place: PrayerPlace): CalculationParameters {
  const factory = (CalculationMethod as unknown as Record<MethodKey, () => CalculationParameters>)[place.method];
  const params = factory();
  params.madhab = place.madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  return params;
}

/** Prayer start times for the given place + calendar day (pure, offline). */
export function computeTimes(place: PrayerPlace, date: Date): Record<PrayerName, Date> {
  const t = new PrayerTimes(new Coordinates(place.lat, place.lng), date, paramsFor(place));
  return { fajr: t.fajr, dhuhr: t.dhuhr, asr: t.asr, maghrib: t.maghrib, isha: t.isha };
}

export function fmtTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Local calendar key (YYYY-MM-DD) — the unit a prayer log day is stored under. */
export function dateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Islamic (Hijri) date label — from the browser's own calendar, no library. */
export function hijriLabel(d = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-US-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

/** Human "in 2h 14m" until a future time; "" once it's passed. */
export function untilLabel(target: Date, now = Date.now()): string {
  const ms = target.getTime() - now;
  if (ms <= 0) return "";
  const mins = Math.round(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}
