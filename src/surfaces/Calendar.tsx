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
import { EVENT_TINT, dayStart, expand, repeatLabel } from "../lib/calEvents";
import { HYPE_MORNING, hypeFor } from "../lib/hype";
import { EventFormModal } from "../components/EventFormModal";
import { Avatar } from "../components/Avatar";
import { useIsMobile } from "../lib/useMediaQuery";
import { useStore } from "../store/useStore";
import type { Booking, CalendarEvent } from "../types";

const LOCATION_LABEL: Record<string, string> = {
  google_meet: "Google Meet",
  zoom: "Zoom",
  phone: "Phone",
};

function EventCard({ occ, mine, onEdit }: { occ: { event: CalendarEvent; at: number }; mine: boolean; onEdit: () => void }) {
  const { event: e, at } = occ;
  const tint = EVENT_TINT[e.kind] ?? EVENT_TINT.personal;
  const time = e.allDay
    ? "all day"
    : new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase();
  const rep = repeatLabel(e);
  return (
    <div
      role={mine ? "button" : undefined}
      tabIndex={mine ? 0 : undefined}
      onClick={mine ? onEdit : undefined}
      onKeyDown={mine ? (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); onEdit(); } } : undefined}
      title={mine ? "edit" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "var(--card)",
        border: "1px solid rgba(var(--ink-rgb),.06)",
        borderLeft: `3px solid ${tint.dot}`,
        borderRadius: 14,
        boxShadow: "var(--shadow-card)",
        padding: "12px 15px",
        cursor: mine ? "pointer" : "default",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>{e.title}</span>
          <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".07em", textTransform: "uppercase", color: tint.dot, background: tint.tint, padding: "2px 7px", borderRadius: 5 }}>
            {e.kind}
          </span>
          {!e.shared && mine && (
            <span title="only you can see this" style={{ fontSize: 11, color: "rgba(var(--ink-rgb),.35)" }}>private</span>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: "rgba(var(--ink-rgb),.55)", marginTop: 2 }}>
          {time}
          {rep && <span style={{ color: "rgba(var(--ink-rgb),.35)" }}> · {rep}</span>}
        </div>
        {e.notes && (
          <div style={{ fontSize: 12.5, color: "rgba(var(--ink-rgb),.55)", marginTop: 4, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{e.notes}</div>
        )}
      </div>
      {!mine && <Avatar id={e.who} size={26} />}
    </div>
  );
}

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

  const calEvents = useStore((s) => s.calEvents);
  const currentUserId = useStore((s) => s.currentUserId);
  const openEventModal = useStore((s) => s.openEventModal);
  const editEvent = useStore((s) => s.editEvent);

  const byDay = useMemo(() => groupByDay(bookings), [bookings]);

  // one entry per occurrence across the visible month (+/- a week of overhang)
  const eventsByDay = useMemo(() => {
    const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getTime() - 7 * 86_400_000;
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 7).getTime();
    const out: Record<string, Array<{ event: CalendarEvent; at: number }>> = {};
    for (const occ of expand(calEvents, from, to)) {
      (out[dayKey(new Date(occ.at))] ??= []).push(occ);
    }
    return out;
  }, [calEvents, cursor]);
  const upNext = useMemo(() => nextBooking(bookings, now), [bookings, now]);
  const weeks = useMemo(() => monthMatrix(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const monthCount = useMemo(
    () => bookings.filter((b) => new Date(b.startAt).getMonth() === cursor.getMonth() && new Date(b.startAt).getFullYear() === cursor.getFullYear() && b.status !== "cancelled").length,
    [bookings, cursor],
  );

  const todayK = dayKey(new Date(now));
  const selectedList = selected ? (byDay[selected] ?? []) : [];
  const selectedEvents = selected ? (eventsByDay[selected] ?? []) : [];
  // today's own workouts drive the hype line under the header
  const myToday = (eventsByDay[todayK] ?? []).filter((o) => o.event.who === currentUserId);

  const card: CSSProperties = { background: "var(--card)", border: "1px solid rgba(var(--ink-rgb),.06)", borderRadius: 18, boxShadow: "var(--shadow-card)" };
  const label: CSSProperties = { fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(var(--ink-rgb),.55)", fontWeight: 700 };

  const shiftMonth = (d: -1 | 1) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + d, 1));

  return (
    <div style={{ maxWidth: isMobile ? 820 : 1140, margin: "0 auto" }} className="anim-sc">
      <Eyebrow index="12" label="bookings" color="#2FC197" />
      <h1 style={{ margin: isMobile ? "0 0 3px" : "0 0 4px", fontSize: isMobile ? 21 : 30, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.1 }}>
        the <i style={{ fontWeight: 600 }}>calendar</i>
      </h1>
      <p style={{ margin: "0 0 16px", fontSize: isMobile ? 12.5 : 14, color: "rgba(var(--ink-rgb),.5)" }}>
        site bookings, live — plus whatever you put on it yourself.
      </p>

      {/* only shows on days you actually have something to do */}
      {myToday.length > 0 && (
        <div
          style={{
            ...card,
            padding: isMobile ? "13px 15px" : "14px 20px",
            marginBottom: 14,
            borderLeft: "3px solid #2FC197",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={label}>today · {myToday.map((o) => o.event.title).join(" · ")}</div>
            <div style={{ fontSize: isMobile ? 14 : 15.5, fontWeight: 600, letterSpacing: "-.01em", marginTop: 5, color: "var(--ink)" }}>
              {hypeFor(HYPE_MORNING, todayK)}
            </div>
          </div>
        </div>
      )}

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

      {/* grid + day panel side by side, so picking a day never scrolls the
          detail out of view (the whole point of the redesign) */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) 372px", gap: 14, alignItems: "start" }}>
        <div style={{ ...card, padding: isMobile ? "14px 12px" : "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 700, letterSpacing: "-.01em" }}>
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
              {monthCount > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(var(--ink-rgb),.45)", marginLeft: 8 }}>{monthCount}</span>}
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
              const dayEvents = eventsByDay[k] ?? [];
              const otherMonth = d.getMonth() !== cursor.getMonth();
              const isToday = k === todayK;
              const isSel = k === selected;
              // desktop cells are tall enough for named chips; mobile keeps dots
              const chips = [
                ...dayEvents.map((o) => ({ key: o.event.id + o.at, label: o.event.title, color: (EVENT_TINT[o.event.kind] ?? EVENT_TINT.personal).dot })),
                ...dayBookings.map((b) => ({ key: b.id, label: b.inviteeName, color: BOOKING_COLORS[b.status] })),
              ];
              return (
                <button
                  key={k}
                  onClick={() => setSelected(k)}
                  aria-pressed={isSel}
                  style={{
                    aspectRatio: isMobile ? "1 / 1" : undefined,
                    minHeight: isMobile ? undefined : 82,
                    border: isSel ? "1.5px solid #2FC197" : "1px solid rgba(var(--ink-rgb),.06)",
                    background: isSel ? "rgba(47,193,151,.07)" : isToday ? "rgba(47,193,151,.1)" : "transparent",
                    boxShadow: isSel ? "0 0 0 3px rgba(47,193,151,.12)" : "none",
                    borderRadius: 11,
                    padding: isMobile ? "4px 0 0" : "5px 5px 4px",
                    fontFamily: "inherit",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isMobile ? "center" : "stretch",
                    gap: 3,
                    opacity: otherMonth ? 0.35 : 1,
                    overflow: "hidden",
                    transition: "background .15s, border-color .15s, box-shadow .15s",
                  }}
                >
                  <span
                    style={{
                      fontSize: isMobile ? 12 : 12.5,
                      fontWeight: isToday ? 800 : 600,
                      color: isToday ? "#2FC197" : "var(--ink)",
                      textAlign: isMobile ? "center" : "left",
                      paddingLeft: isMobile ? 0 : 2,
                      flex: "0 0 auto",
                    }}
                  >
                    {d.getDate()}
                  </span>

                  {isMobile ? (
                    <span style={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
                      {chips.slice(0, 3).map((c) => (
                        <span key={c.key} style={{ width: 5, height: 5, borderRadius: 1.5, background: c.color }} />
                      ))}
                      {chips.length > 3 && <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(var(--ink-rgb),.5)" }}>+{chips.length - 3}</span>}
                    </span>
                  ) : (
                    <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      {chips.slice(0, 2).map((c) => (
                        <span
                          key={c.key}
                          title={c.label}
                          style={{
                            display: "block",
                            fontSize: 9.5,
                            fontWeight: 700,
                            lineHeight: 1.35,
                            color: c.color,
                            background: c.color + "1F",
                            borderRadius: 4,
                            padding: "1px 4px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textAlign: "left",
                          }}
                        >
                          {c.label}
                        </span>
                      ))}
                      {chips.length > 2 && (
                        <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(var(--ink-rgb),.45)", paddingLeft: 4, textAlign: "left" }}>
                          +{chips.length - 2} more
                        </span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* the day itself — pinned beside the grid on desktop */}
        <div style={{ position: isMobile ? "static" : "sticky", top: 12, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: isMobile ? "0 4px" : "0 2px" }}>
            <div style={label}>
              {selected ? fmtDayLabel(new Date(selected + "T12:00:00").getTime()).toLowerCase() : "pick a day"}
              {selectedList.length + selectedEvents.length > 0 && (
                <span style={{ color: "rgba(var(--ink-rgb),.4)" }}> · {selectedList.length + selectedEvents.length}</span>
              )}
            </div>
            <button
              className="hov-soft"
              onClick={() => openEventModal(selected ? new Date(selected + "T12:00:00").getTime() : dayStart(now))}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--btn-ink)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 13px", fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", flex: "0 0 auto" }}
            >
              <Icon name="plus" size={14} sw={2} color="#fff" /> add
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: isMobile ? undefined : "calc(100dvh - 150px)", overflowY: isMobile ? undefined : "auto", paddingRight: isMobile ? 0 : 2 }}>
            {selectedList.length + selectedEvents.length === 0 ? (
              <div style={{ ...card, border: "1px dashed rgba(var(--ink-rgb),.14)", padding: "28px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>nothing on this day</div>
                <div style={{ fontSize: 13, color: "rgba(var(--ink-rgb),.5)" }}>
                  site bookings land here automatically — hit <b>add</b> to put something of your own on it.
                </div>
              </div>
            ) : (
              <>
                {selectedEvents.map((o, i) => (
                  <EventCard
                    key={o.event.id + i}
                    occ={o}
                    mine={o.event.who === currentUserId}
                    onEdit={() => editEvent(o.event.id)}
                  />
                ))}
                {selectedList.map((b) => (
                  <BookingCard key={b.id} b={b} />
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <EventFormModal />
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
