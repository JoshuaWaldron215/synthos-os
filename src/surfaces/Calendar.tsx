import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Eyebrow } from "../components/Eyebrow";
import { Icon } from "../lib/Icon";
import {
  BOOKING_COLORS,
  dayKey,
  fmtDayLabel,
  fmtRange,
  groupByDay,
  MONTHS,
  monthMatrix,
  nextBooking,
  untilBooking,
  WEEKDAYS,
} from "../lib/calendar";
import { useIsMobile } from "../lib/useMediaQuery";
import { useStore } from "../store/useStore";
import type { Booking } from "../types";

const LOCATION_LABEL: Record<string, string> = {
  google_meet: "Google Meet",
  zoom: "Zoom",
  phone: "Phone",
};

function StatusPill({ status }: { status: Booking["status"] }) {
  const c = BOOKING_COLORS[status];
  return (
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: c, background: c + "22", padding: "2px 8px", borderRadius: 999 }}>
      {status}
    </span>
  );
}

function BookingCard({ b }: { b: Booking }) {
  const [open, setOpen] = useState(false);
  const answers = Object.entries(b.answers).filter(([, v]) => v != null && String(v).trim());
  return (
    <div style={{ background: "var(--card)", border: "1px solid rgba(var(--ink-rgb),.06)", borderRadius: 14, boxShadow: "var(--shadow-card)", overflow: "hidden", opacity: b.status === "cancelled" ? 0.6 : 1 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="hov-soft"
        style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", background: "transparent", border: "none", padding: "13px 15px", fontFamily: "inherit", cursor: "pointer", textAlign: "left" }}
      >
        <div style={{ width: 4, alignSelf: "stretch", borderRadius: 4, background: BOOKING_COLORS[b.status], flex: "0 0 auto" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.01em", textDecoration: b.status === "cancelled" ? "line-through" : "none" }}>{b.inviteeName}</span>
            <StatusPill status={b.status} />
          </div>
          <div style={{ fontSize: 12.5, color: "rgba(var(--ink-rgb),.6)", marginTop: 2 }}>
            {fmtRange(b.startAt, b.endAt)} · {b.eventType}
          </div>
        </div>
        <Icon name="chevron" size={14} color="rgba(var(--ink-rgb),.35)" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s", flex: "0 0 auto" }} />
      </button>
      {open && (
        <div style={{ padding: "0 15px 14px 31px", fontSize: 13, display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", color: "rgba(var(--ink-rgb),.7)" }}>
            <a href={"mailto:" + b.inviteeEmail} style={{ color: "#33ADEE", fontWeight: 600, textDecoration: "none" }}>{b.inviteeEmail}</a>
            <span>{b.duration} min</span>
            {b.location && <span>{LOCATION_LABEL[b.location] ?? b.location}</span>}
            {b.source && <span style={{ color: "rgba(var(--ink-rgb),.45)" }}>via {b.source}</span>}
          </div>
          {b.meetUrl && (
            <a href={b.meetUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", background: "var(--btn-ink)", color: "#fff", borderRadius: 10, padding: "7px 13px", fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>
              join call ↗
            </a>
          )}
          {answers.length > 0 && (
            <div style={{ marginTop: 2, display: "flex", flexDirection: "column", gap: 4 }}>
              {answers.map(([k, v]) => (
                <div key={k} style={{ color: "rgba(var(--ink-rgb),.6)" }}>
                  <span style={{ fontWeight: 600, color: "rgba(var(--ink-rgb),.5)" }}>{k}: </span>
                  {String(v)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Calendar() {
  const isMobile = useIsMobile();
  const bookings = useStore((s) => s.bookings);
  const [now, setNow] = useState(() => Date.now());
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<string | null>(() => dayKey(new Date()));

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const byDay = useMemo(() => groupByDay(bookings), [bookings]);
  const upNext = useMemo(() => nextBooking(bookings, now), [bookings, now]);
  const weeks = useMemo(() => monthMatrix(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const monthCount = useMemo(
    () => bookings.filter((b) => new Date(b.startAt).getMonth() === cursor.getMonth() && new Date(b.startAt).getFullYear() === cursor.getFullYear() && b.status !== "cancelled").length,
    [bookings, cursor],
  );

  const todayK = dayKey(new Date(now));
  const selectedList = selected ? (byDay[selected] ?? []) : [];

  const card: CSSProperties = { background: "var(--card)", border: "1px solid rgba(var(--ink-rgb),.06)", borderRadius: 18, boxShadow: "var(--shadow-card)" };
  const label: CSSProperties = { fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", fontWeight: 700 };

  const shiftMonth = (d: -1 | 1) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + d, 1));

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }} className="anim-sc">
      <Eyebrow index="12" label="bookings" color="#2FC197" />
      <h1 style={{ margin: isMobile ? "0 0 3px" : "0 0 4px", fontSize: isMobile ? 21 : 30, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.1 }}>
        the <i style={{ fontWeight: 600 }}>calendar</i>
      </h1>
      <p style={{ margin: "0 0 16px", fontSize: isMobile ? 12.5 : 14, color: "rgba(var(--ink-rgb),.5)" }}>
        every booking from runsynthos.com — live, the moment it's made.
      </p>

      {/* next up */}
      {upNext && (
        <div style={{ ...card, padding: isMobile ? "16px" : "18px 22px", marginBottom: 14, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -18, top: -18, opacity: 0.06, transform: "rotate(8deg)" }}>
            <Icon name="calendar" size={130} color="var(--ink)" />
          </div>
          <div style={{ ...label, position: "relative" }}>next up · {untilBooking(upNext.startAt, now) || "now"}</div>
          <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, letterSpacing: "-.02em", marginTop: 4, position: "relative" }}>
            {upNext.inviteeName} <span style={{ color: "rgba(var(--ink-rgb),.4)", fontWeight: 600 }}>·</span> {upNext.eventType.toLowerCase()}
          </div>
          <div style={{ fontSize: 13.5, color: "rgba(var(--ink-rgb),.6)", marginTop: 3, position: "relative" }}>
            {fmtDayLabel(upNext.startAt).toLowerCase()} · {fmtRange(upNext.startAt, upNext.endAt)}
          </div>
          {upNext.meetUrl && (
            <a href={upNext.meetUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", marginTop: 12, background: "var(--btn-ink)", color: "#fff", borderRadius: 11, padding: "9px 15px", fontSize: 13, fontWeight: 700, textDecoration: "none", position: "relative" }}>
              join call ↗
            </a>
          )}
        </div>
      )}

      {/* month grid */}
      <div style={{ ...card, padding: isMobile ? "14px 12px" : "18px 20px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 700, letterSpacing: "-.01em" }}>
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            {monthCount > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(var(--ink-rgb),.45)", marginLeft: 8 }}>{monthCount} booking{monthCount === 1 ? "" : "s"}</span>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button className="hov-soft" onClick={() => shiftMonth(-1)} style={navBtn}><span style={{ transform: "rotate(180deg)", display: "flex" }}><Icon name="arrowr" size={15} color="rgba(var(--ink-rgb),.55)" /></span></button>
            <button className="hov-soft" onClick={() => { setCursor(new Date()); setSelected(todayK); }} style={{ ...navBtn, width: "auto", padding: "0 12px", fontSize: 12.5, fontWeight: 600 }}>today</button>
            <button className="hov-soft" onClick={() => shiftMonth(1)} style={navBtn}><Icon name="arrowr" size={15} color="rgba(var(--ink-rgb),.55)" /></button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: isMobile ? 3 : 5 }}>
          {WEEKDAYS.map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontSize: 10.5, fontWeight: 700, color: "rgba(var(--ink-rgb),.4)", textTransform: "uppercase", paddingBottom: 4 }}>{d}</div>
          ))}
          {weeks.flat().map((d) => {
            const k = dayKey(d);
            const dayBookings = (byDay[k] ?? []).filter((b) => b.status !== "cancelled");
            const otherMonth = d.getMonth() !== cursor.getMonth();
            const isToday = k === todayK;
            const isSel = k === selected;
            return (
              <button
                key={k}
                onClick={() => setSelected(k)}
                style={{
                  aspectRatio: "1 / 1",
                  border: isSel ? "1.5px solid #2FC197" : "1px solid rgba(var(--ink-rgb),.06)",
                  background: isToday ? "rgba(47,193,151,.1)" : "transparent",
                  borderRadius: 11,
                  padding: isMobile ? "4px 0 0" : "6px 0 0",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  opacity: otherMonth ? 0.35 : 1,
                }}
              >
                <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: isToday ? 800 : 600, color: "var(--ink)" }}>{d.getDate()}</span>
                <span style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
                  {dayBookings.slice(0, 3).map((b) => (
                    <span key={b.id} style={{ width: 5, height: 5, borderRadius: "50%", background: BOOKING_COLORS[b.status] }} />
                  ))}
                  {dayBookings.length > 3 && <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(var(--ink-rgb),.5)" }}>+{dayBookings.length - 3}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* selected day agenda */}
      <div style={{ ...label, margin: "0 4px 10px" }}>
        {selected ? fmtDayLabel(new Date(selected + "T12:00:00").getTime()).toLowerCase() : "pick a day"}
        {selectedList.length > 0 && <span style={{ color: "rgba(var(--ink-rgb),.4)" }}> · {selectedList.length}</span>}
      </div>
      {selectedList.length === 0 ? (
        <div style={{ ...card, border: "1px dashed rgba(var(--ink-rgb),.14)", padding: "30px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{bookings.length === 0 ? "no bookings yet" : "nothing booked this day"}</div>
          <div style={{ fontSize: 13, color: "rgba(var(--ink-rgb),.5)" }}>
            {bookings.length === 0 ? "when someone books a call on runsynthos.com, it lands here instantly ✦" : "green = confirmed · amber = pending · red = cancelled"}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {selectedList.map((b) => (
            <BookingCard key={b.id} b={b} />
          ))}
        </div>
      )}
    </div>
  );
}

const navBtn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  background: "transparent",
  border: "1px solid rgba(var(--ink-rgb),.1)",
  borderRadius: 10,
  color: "var(--ink)",
  fontFamily: "inherit",
};
