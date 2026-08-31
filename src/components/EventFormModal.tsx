import { useEffect, useState } from "react";
import { DAY_NAMES, EVENT_KINDS, EVENT_TINT, dayStart } from "../lib/calEvents";
import { fieldLabelStyle, fieldStyle } from "../lib/fields";
import { useStore } from "../store/useStore";
import { ConfirmDialog } from "./ConfirmDialog";
import { ResponsiveModal } from "./ResponsiveModal";
import type { EventKind } from "../types";

const field = fieldStyle;
const labelStyle = fieldLabelStyle;

// date <input> ↔ epoch ms (noon local, so a timezone shift can't move the day)
const toDateInput = (ms: number) => {
  const d = new Date(ms);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
};
const toTimeInput = (ms: number) => {
  const d = new Date(ms);
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
};
const combine = (date: string, time: string): number =>
  new Date(date + "T" + (time || "09:00") + ":00").getTime();

const REMIND_CHOICES: Array<{ label: string; val: number | null }> = [
  { label: "none", val: null },
  { label: "at time", val: 0 },
  { label: "15m", val: 15 },
  { label: "1h", val: 60 },
  { label: "3h", val: 180 },
];

/** add or edit a personal calendar event (workout, block, reminder) */
export function EventFormModal() {
  const day = useStore((s) => s.eventModalDay);
  const editingId = useStore((s) => s.editingEventId);
  const calEvents = useStore((s) => s.calEvents);
  const close = useStore((s) => s.closeEventModal);
  const addCalEvent = useStore((s) => s.addCalEvent);
  const updateCalEvent = useStore((s) => s.updateCalEvent);
  const deleteCalEvent = useStore((s) => s.deleteCalEvent);

  const editing = editingId ? calEvents.find((e) => e.id === editingId) ?? null : null;
  const open = day !== null || editing !== null;

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<EventKind>("personal");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [allDay, setAllDay] = useState(false);
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [repeatUntil, setRepeatUntil] = useState("");
  const [remindMin, setRemindMin] = useState<number | null>(60);
  const [shared, setShared] = useState(false);
  const [notes, setNotes] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  // reset the form whenever the modal opens for a different day / event
  useEffect(() => {
    if (!open) return;
    const base = editing?.startAt ?? day ?? Date.now();
    setTitle(editing?.title ?? "");
    setKind(editing?.kind ?? "personal");
    setDate(toDateInput(base));
    setTime(editing && !editing.allDay ? toTimeInput(editing.startAt) : "09:00");
    setAllDay(editing?.allDay ?? false);
    setRepeatDays(editing?.repeatDays ?? []);
    setRepeatUntil(editing?.repeatUntil ? toDateInput(editing.repeatUntil) : "");
    setRemindMin(editing ? editing.remindMin : 60);
    setShared(editing?.shared ?? false);
    setNotes(editing?.notes ?? "");
  }, [open, editing, day]);

  if (!open) return null;

  const toggleDay = (d: number) =>
    setRepeatDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : prev.concat(d).sort()));

  const save = () => {
    if (!title.trim() || !date) return;
    const startAt = allDay ? dayStart(new Date(date + "T12:00:00").getTime()) : combine(date, time);
    const until = repeatUntil ? new Date(repeatUntil + "T12:00:00").getTime() : null;
    const payload = {
      title: title.trim(),
      kind,
      startAt,
      allDay,
      repeatDays,
      repeatUntil: repeatDays.length ? until : null,
      remindMin: allDay && remindMin === 0 ? null : remindMin,
      shared,
      notes: notes.trim(),
    };
    if (editing) updateCalEvent(editing.id, payload);
    else addCalEvent(payload);
    close();
  };

  return (
    <ResponsiveModal open={open} onClose={close} title={editing ? "edit event" : "add to calendar"} width={460}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>what</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="easy 5 mile run"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && save()}
            style={field}
          />
        </div>

        <div>
          <label style={labelStyle}>type</label>
          <div style={{ display: "flex", gap: 6 }}>
            {EVENT_KINDS.map((k) => {
              const on = kind === k;
              const tint = EVENT_TINT[k];
              return (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  style={{
                    flex: 1,
                    border: on ? `1px solid ${tint.dot}` : "1px solid rgba(var(--ink-rgb),.1)",
                    background: on ? tint.tint : "var(--card)",
                    color: on ? tint.dot : "rgba(var(--ink-rgb),.6)",
                    borderRadius: 10,
                    padding: "8px 0",
                    fontSize: 12.5,
                    fontWeight: 600,
                    fontFamily: "inherit",
                  }}
                >
                  {k}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: allDay ? "1fr" : "1fr 120px", gap: 10 }}>
          <div>
            <label style={labelStyle}>{repeatDays.length ? "starting" : "date"}</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={field} />
          </div>
          {!allDay && (
            <div>
              <label style={labelStyle}>time</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={field} />
            </div>
          )}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13, fontWeight: 500, color: "rgba(var(--ink-rgb),.75)" }}>
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
          all day
        </label>

        <div>
          <label style={labelStyle}>repeat</label>
          <div style={{ display: "flex", gap: 4 }}>
            {DAY_NAMES.map((d, i) => {
              const on = repeatDays.includes(i);
              return (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  aria-pressed={on}
                  title={on ? "repeats on " + d : "add " + d}
                  style={{
                    flex: 1,
                    border: on ? "1px solid #2FC197" : "1px solid rgba(var(--ink-rgb),.1)",
                    background: on ? "var(--mint-tint)" : "var(--card)",
                    color: on ? "#1F8F6E" : "rgba(var(--ink-rgb),.5)",
                    borderRadius: 9,
                    padding: "7px 0",
                    fontSize: 11.5,
                    fontWeight: 700,
                    fontFamily: "inherit",
                    textTransform: "uppercase",
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11.5, color: "rgba(var(--ink-rgb),.45)", marginTop: 6 }}>
            {repeatDays.length ? "repeats weekly on the days above" : "leave blank for a one-off"}
          </div>
        </div>

        {repeatDays.length > 0 && (
          <div>
            <label style={labelStyle}>until (optional)</label>
            <input type="date" value={repeatUntil} onChange={(e) => setRepeatUntil(e.target.value)} style={field} />
          </div>
        )}

        <div>
          <label style={labelStyle}>remind me</label>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {REMIND_CHOICES.map((c) => {
              const on = remindMin === c.val;
              return (
                <button
                  key={c.label}
                  onClick={() => setRemindMin(c.val)}
                  style={{
                    border: on ? "1px solid #8A84F0" : "1px solid rgba(var(--ink-rgb),.1)",
                    background: on ? "var(--lav-tint)" : "var(--card)",
                    color: on ? "#8A84F0" : "rgba(var(--ink-rgb),.6)",
                    borderRadius: 999,
                    padding: "6px 13px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    fontFamily: "inherit",
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11.5, color: "rgba(var(--ink-rgb),.45)", marginTop: 6 }}>
            it also shows up in your 8am briefing.
          </div>
        </div>

        <div>
          <label style={labelStyle}>notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="4x800 at threshold…" rows={2} style={{ ...field, resize: "vertical" }} />
        </div>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, fontWeight: 500, color: "rgba(var(--ink-rgb),.75)" }}>
          <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} style={{ marginTop: 2 }} />
          <span>
            show to the team
            <span style={{ display: "block", fontSize: 11.5, color: "rgba(var(--ink-rgb),.45)" }}>
              off = only you can see it, on any device
            </span>
          </span>
        </label>

        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
          <button
            onClick={save}
            disabled={!title.trim() || !date}
            style={{
              flex: 1,
              background: "var(--btn-ink)",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "12px 0",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "inherit",
              opacity: title.trim() && date ? 1 : 0.45,
            }}
          >
            {editing ? "save" : "add"} ✦
          </button>
          {editing && (
            <button
              onClick={() => setConfirmDel(true)}
              style={{ background: "transparent", border: "1px solid rgba(var(--ink-rgb),.12)", borderRadius: 12, padding: "12px 16px", fontSize: 14, fontWeight: 600, color: "var(--danger)", fontFamily: "inherit" }}
            >
              delete
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDel}
        title="delete this event?"
        body={editing?.repeatDays.length ? "this removes the whole repeating series." : "this can't be undone."}
        confirmLabel="delete"
        onConfirm={() => {
          if (editing) deleteCalEvent(editing.id);
          setConfirmDel(false);
          close();
        }}
        onClose={() => setConfirmDel(false)}
      />
    </ResponsiveModal>
  );
}
