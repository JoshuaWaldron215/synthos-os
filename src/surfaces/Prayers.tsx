import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Eyebrow } from "../components/Eyebrow";
import { Icon } from "../lib/Icon";
import {
  computeTimes,
  dateKey,
  fmtTime,
  hijriLabel,
  METHODS,
  type MethodKey,
  PRAYER_ORDER,
  PRAYERS,
  type PrayerName,
  PRESET_PLACES,
  untilLabel,
} from "../lib/prayers";
import { useIsMobile } from "../lib/useMediaQuery";
import { useStore } from "../store/useStore";

type PrayerState = "done" | "now" | "upcoming" | "missed";

export function Prayers() {
  const isMobile = useIsMobile();
  const uid = useStore((s) => s.currentUserId);
  const place = useStore((s) => s.prayerPlace);
  const prayerLog = useStore((s) => s.prayerLog);
  const togglePrayer = useStore((s) => s.togglePrayer);
  const setPrayerPlace = useStore((s) => s.setPrayerPlace);
  const detectLocation = useStore((s) => s.detectLocation);

  const [now, setNow] = useState(() => Date.now());
  const [editingPlace, setEditingPlace] = useState(false);

  // tick every 30s so the countdown, "now" highlight and day rollover stay live
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const today = new Date(now);
  const todayKey = dateKey(today);
  const log = prayerLog[uid]?.[todayKey] ?? {};
  const times = useMemo(() => computeTimes(place, today), [place, todayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = PRAYER_ORDER.map((key, i) => {
    const start = times[key].getTime();
    const end = i < PRAYER_ORDER.length - 1 ? times[PRAYER_ORDER[i + 1]].getTime() : start + 2 * 60 * 60 * 1000;
    const done = !!log[key];
    let state: PrayerState;
    if (done) state = "done";
    else if (now < start) state = "upcoming";
    else if (now < end) state = "now";
    else state = "missed";
    return { ...PRAYERS[i], key, at: times[key], state };
  });

  const doneCount = rows.filter((r) => r.state === "done").length;

  // countdown to the next prayer (rolls to tomorrow's Fajr after Isha)
  const upcoming = rows.find((r) => now < r.at.getTime());
  const nextLabel = upcoming
    ? { name: upcoming.label, in: untilLabel(upcoming.at, now), color: upcoming.color }
    : (() => {
        const tomorrow = new Date(now + 24 * 60 * 60 * 1000);
        const fajr = computeTimes(place, tomorrow).fajr;
        return { name: "Fajr", in: untilLabel(fajr, now), color: PRAYERS[0].color, tomorrow: true as const };
      })();

  // last 7 days of this user's completion, for the streak strip
  const week = useMemo(() => {
    const out: { count: number; wd: string; today: boolean; done: Record<PrayerName, boolean> }[] = [];
    for (let d = 6; d >= 0; d--) {
      const day = new Date(now - d * 24 * 60 * 60 * 1000);
      const l = prayerLog[uid]?.[dateKey(day)] ?? {};
      const done = Object.fromEntries(PRAYER_ORDER.map((p) => [p, !!l[p]])) as Record<PrayerName, boolean>;
      out.push({
        count: PRAYER_ORDER.filter((p) => l[p]).length,
        wd: day.toLocaleDateString([], { weekday: "narrow" }),
        today: d === 0,
        done,
      });
    }
    return out;
  }, [prayerLog, uid, now]);

  const card: CSSProperties = {
    background: "var(--card)",
    border: "1px solid rgba(var(--ink-rgb),.06)",
    borderRadius: 18,
    boxShadow: "var(--shadow-card)",
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }} className="anim-sc">
      <Eyebrow index="10" label="salah" color="#8A84F0" />
      <h1 style={{ margin: isMobile ? "0 0 3px" : "0 0 4px", fontSize: isMobile ? 21 : 30, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.1 }}>
        today's <i style={{ fontWeight: 600 }}>prayers</i>
      </h1>
      <p style={{ margin: "0 0 18px", fontSize: isMobile ? 12.5 : 14, color: "rgba(var(--ink-rgb),.5)" }}>
        {today.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }).toLowerCase()}
        {hijriLabel(today) && <span style={{ color: "rgba(var(--ink-rgb),.4)" }}> · {hijriLabel(today).toLowerCase()}</span>}
      </p>

      {/* hero: next prayer countdown (or complete) + location */}
      <div style={{ ...card, padding: isMobile ? "16px 16px" : "20px 22px", marginBottom: 14, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -20, top: -20, opacity: 0.06, transform: "rotate(8deg)" }}>
          <Icon name="prayers" size={140} color="var(--ink)" />
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, position: "relative" }}>
          <div>
            {doneCount === 5 ? (
              <>
                <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.5)", fontWeight: 700 }}>all five today</div>
                <div style={{ fontSize: isMobile ? 22 : 27, fontWeight: 700, letterSpacing: "-.02em", marginTop: 3 }}>
                  ma sha Allah <span style={{ fontStyle: "italic", fontWeight: 600, color: "#2FC197" }}>✦</span>
                </div>
                <div style={{ fontSize: 13, color: "rgba(var(--ink-rgb),.55)", marginTop: 2 }}>every prayer logged. see you at Fajr.</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.5)", fontWeight: 700 }}>
                  next · {nextLabel.name}
                  {"tomorrow" in nextLabel && nextLabel.tomorrow ? " (tomorrow)" : ""}
                </div>
                <div style={{ fontSize: isMobile ? 26 : 32, fontWeight: 700, letterSpacing: "-.03em", marginTop: 3, color: nextLabel.color }}>
                  in {nextLabel.in}
                </div>
                <div style={{ fontSize: 13, color: "rgba(var(--ink-rgb),.55)", marginTop: 2 }}>{doneCount} of 5 prayed so far today</div>
              </>
            )}
          </div>
          <button
            onClick={() => setEditingPlace((v) => !v)}
            className="hov-soft"
            title="change location"
            style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--cloud)", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 999, padding: "6px 11px", fontSize: 12.5, fontWeight: 600, color: "var(--ink)", fontFamily: "inherit", whiteSpace: "nowrap", flex: "0 0 auto" }}
          >
            <Icon name="clock" size={13} color="rgba(var(--ink-rgb),.55)" /> {place.label}
          </button>
        </div>

        {editingPlace && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(var(--ink-rgb),.07)", display: "flex", flexDirection: "column", gap: 9, position: "relative" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select
                value={PRESET_PLACES.some((p) => p.label === place.label) ? place.label : ""}
                onChange={(e) => {
                  const c = PRESET_PLACES.find((p) => p.label === e.target.value);
                  if (c) setPrayerPlace({ lat: c.lat, lng: c.lng, label: c.label });
                }}
                style={selectStyle}
              >
                <option value="">— pick a city —</option>
                {PRESET_PLACES.map((c) => (
                  <option key={c.label} value={c.label}>{c.label}</option>
                ))}
              </select>
              <button onClick={() => detectLocation()} className="hov-soft" style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 11, padding: "9px 13px", fontSize: 13, fontWeight: 600, fontFamily: "inherit", whiteSpace: "nowrap" }}>
                use my location
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select value={place.method} onChange={(e) => setPrayerPlace({ method: e.target.value as MethodKey })} style={selectStyle}>
                {METHODS.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
              <div style={{ display: "flex", background: "var(--cloud)", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 11, overflow: "hidden" }}>
                {(["shafi", "hanafi"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPrayerPlace({ madhab: m })}
                    style={{ background: place.madhab === m ? "var(--btn-ink)" : "transparent", color: place.madhab === m ? "#fff" : "rgba(var(--ink-rgb),.6)", border: "none", padding: "9px 14px", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", textTransform: "capitalize" }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 11.5, color: "rgba(var(--ink-rgb),.42)" }}>times are computed on-device for this location — accurate offline.</p>
          </div>
        )}
      </div>

      {/* the five prayers */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {rows.map((r) => (
          <button
            key={r.key}
            onClick={() => togglePrayer(r.key)}
            className="hov-task"
            style={{
              ...card,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: isMobile ? "13px 14px" : "15px 18px",
              textAlign: "left",
              fontFamily: "inherit",
              cursor: "pointer",
              borderColor: r.state === "now" ? r.color : "rgba(var(--ink-rgb),.06)",
              boxShadow: r.state === "now" ? `0 0 0 2px ${r.color}33, var(--shadow-card)` : "var(--shadow-card)",
            }}
          >
            {/* check circle */}
            <span
              aria-hidden
              style={{
                flex: "0 0 auto",
                width: 30,
                height: 30,
                borderRadius: "50%",
                border: r.state === "done" ? "none" : "2px solid " + (r.state === "missed" ? "rgba(240,120,90,.5)" : "rgba(var(--ink-rgb),.2)"),
                background: r.state === "done" ? r.color : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background .15s",
              }}
            >
              {r.state === "done" && <Icon name="check" size={17} sw={2.6} color="#fff" />}
            </span>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15.5, fontWeight: 600, letterSpacing: "-.01em" }}>{r.label}</span>
                <span style={{ fontSize: 15, color: "rgba(var(--ink-rgb),.4)", fontWeight: 500 }} dir="rtl">{r.arabic}</span>
                {r.state === "now" && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: r.color, background: r.color + "22", padding: "2px 7px", borderRadius: 6 }}>now</span>}
                {r.state === "missed" && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#C6663F", background: "rgba(240,120,90,.16)", padding: "2px 7px", borderRadius: 6 }}>missed</span>}
              </div>
            </div>

            <div style={{ textAlign: "right", flex: "0 0 auto" }}>
              <div style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: "-.01em", color: r.state === "upcoming" ? "rgba(var(--ink-rgb),.5)" : "var(--ink)" }}>{fmtTime(r.at)}</div>
              {r.state === "upcoming" && <div style={{ fontSize: 11.5, color: "rgba(var(--ink-rgb),.4)" }}>in {untilLabel(r.at, now)}</div>}
            </div>
          </button>
        ))}
      </div>

      {/* 7-day streak */}
      <div style={{ ...card, padding: isMobile ? "14px 16px" : "16px 20px" }}>
        <div style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", fontWeight: 700, marginBottom: 12 }}>this week</div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
          {week.map((d, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
              <div style={{ display: "flex", flexDirection: "column-reverse", gap: 3, width: "100%", maxWidth: 26 }}>
                {PRAYER_ORDER.map((p, pi) => (
                  <span
                    key={p}
                    title={PRAYERS[pi].label}
                    style={{
                      height: 9,
                      borderRadius: 3,
                      background: d.done[p] ? PRAYERS[pi].color : "rgba(var(--ink-rgb),.08)",
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: 11, fontWeight: d.today ? 700 : 500, color: d.today ? "var(--ink)" : "rgba(var(--ink-rgb),.4)", textTransform: "uppercase" }}>{d.wd}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const selectStyle: CSSProperties = {
  background: "var(--card)",
  border: "1px solid rgba(var(--ink-rgb),.1)",
  borderRadius: 11,
  padding: "9px 12px",
  fontSize: 13,
  fontFamily: "inherit",
  color: "var(--ink)",
  flex: "1 1 auto",
  minWidth: 0,
};
