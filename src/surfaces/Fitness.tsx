import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "../components/Avatar";
import { Eyebrow } from "../components/Eyebrow";
import { USERS } from "../data/seed";
import { Icon } from "../lib/Icon";
import {
  type HealthDay,
  HYPE_EMOJI,
  RING_GOALS,
  STEP_GOAL,
  TEAM_WEEKLY_GOAL,
  dayFor,
  fmtSleep,
  fmtSteps,
  healthDateKey,
  stepStreak,
  teamWeekSteps,
  tickerLines,
  workoutEmoji,
} from "../lib/health";
import { effectiveUser } from "../lib/profile";
import { timeAgo } from "../lib/time";
import { useIsMobile } from "../lib/useMediaQuery";
import { useStore } from "../store/useStore";

const RING_COLORS = { move: "#FF8A63", exercise: "#2FC197", stand: "#33ADEE" };

// floating burst when YOU hit 10k (or the squad goal lands) while watching
const STEP_BURST = [
  { emoji: "👟", left: "10%", size: 26, delay: 0 },
  { emoji: "🔥", left: "26%", size: 22, delay: 0.14 },
  { emoji: "💨", left: "40%", size: 20, delay: 0.05 },
  { emoji: "🏆", left: "52%", size: 28, delay: 0.24 },
  { emoji: "💫", left: "66%", size: 22, delay: 0.1 },
  { emoji: "👟", left: "80%", size: 24, delay: 0.3 },
  { emoji: "🔥", left: "92%", size: 18, delay: 0.2 },
  { emoji: "💫", left: "18%", size: 18, delay: 0.36 },
];

function Ring({ pct, r, color, sw }: { pct: number; r: number; color: string; sw: number }) {
  const C = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <>
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(var(--ink-rgb),.08)" strokeWidth={sw} />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - clamped)}
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dashoffset .8s ease" }}
      />
    </>
  );
}

function RingsFor({ row, name }: { row?: HealthDay; name: string }) {
  const move = (row?.moveKcal ?? 0) / RING_GOALS.move;
  const exercise = (row?.exerciseMin ?? 0) / RING_GOALS.exercise;
  const stand = (row?.standHours ?? 0) / RING_GOALS.stand;
  const closed = move >= 1 && exercise >= 1 && stand >= 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
      <div style={{ position: "relative", width: 92, height: 92, animation: closed ? "prayer-pop .5s ease" : undefined }}>
        <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", display: "block", opacity: row ? 1 : 0.35 }}>
          <Ring pct={move} r={42} color={RING_COLORS.move} sw={9} />
          <Ring pct={exercise} r={31} color={RING_COLORS.exercise} sw={9} />
          <Ring pct={stand} r={20} color={RING_COLORS.stand} sw={9} />
        </svg>
        {closed && (
          <span style={{ position: "absolute", top: -4, right: -4, fontSize: 15 }} title="all rings closed">
            ✨
          </span>
        )}
      </div>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(var(--ink-rgb),.6)" }}>{name}</span>
    </div>
  );
}

export function Fitness() {
  const isMobile = useIsMobile();
  const me = useStore((s) => s.currentUserId);
  const profiles = useStore((s) => s.profiles);
  const health = useStore((s) => s.health);
  const toggleHype = useStore((s) => s.toggleHype);
  const healthToken = useStore((s) => s.healthToken);
  const fetchHealthToken = useStore((s) => s.fetchHealthToken);
  const copy = useStore((s) => s.copy);

  const [now, setNow] = useState(() => Date.now());
  const [tickerIdx, setTickerIdx] = useState(0);
  const [openWho, setOpenWho] = useState<number | null>(null);
  const [burst, setBurst] = useState(false);
  const [tokenShown, setTokenShown] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const id = setInterval(() => setTickerIdx((i) => i + 1), 8_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    fetchHealthToken();
  }, [fetchHealthToken]);

  const today = healthDateKey(new Date(now));
  const builders = USERS.map((u) => effectiveUser(u.id, profiles));
  const todays = builders.map((b) => ({ who: b.id, name: b.first.toLowerCase(), row: dayFor(health, b.id, today) }));

  const lines = useMemo(() => tickerLines(todays, new Date(now).getHours()), [health, profiles, now]); // eslint-disable-line react-hooks/exhaustive-deps
  const line = lines[tickerIdx % lines.length];

  // celebrate MY 10k crossing while the page is open
  const mySteps = todays.find((t) => t.who === me)?.row?.steps ?? 0;
  const prevMySteps = useRef(mySteps);
  useEffect(() => {
    // prev > 0 so the very first hydrate of an already-10k day doesn't
    // celebrate stale news; a live same-day crossing still fires
    if (prevMySteps.current > 0 && prevMySteps.current < STEP_GOAL && mySteps >= STEP_GOAL) {
      setBurst(true);
      navigator.vibrate?.([15, 40, 15, 40, 70]);
      const t = setTimeout(() => setBurst(false), 2400);
      prevMySteps.current = mySteps;
      return () => clearTimeout(t);
    }
    prevMySteps.current = mySteps;
  }, [mySteps]);

  const race = [...todays].sort((a, b) => (b.row?.steps ?? 0) - (a.row?.steps ?? 0));
  const raceMax = Math.max(STEP_GOAL, ...race.map((t) => t.row?.steps ?? 0));
  const leader = race[0]?.row?.steps ? race[0] : null;

  const bestSleep = Math.max(0, ...todays.map((t) => t.row?.sleepMin ?? 0));
  const sleepScale = Math.max(9 * 60, bestSleep);

  // workout feed: all workouts from the loaded window, newest first
  const feed = useMemo(() => {
    const items: { row: HealthDay; idx: number; sort: number }[] = [];
    for (const r of health) {
      r.workouts.forEach((w, idx) => {
        items.push({ row: r, idx, sort: w.at ?? new Date(r.day + "T12:00:00").getTime() });
      });
    }
    return items.sort((a, b) => b.sort - a.sort).slice(0, 12);
  }, [health]);

  // weekly leaderboard
  const weekKeys = useMemo(
    () => new Set(Array.from({ length: 7 }, (_, d) => healthDateKey(new Date(now - d * 86_400_000)))),
    [now],
  );
  const weekly = builders
    .map((b) => {
      const rows = health.filter((r) => r.who === b.id && weekKeys.has(r.day));
      const sleeps = rows.filter((r) => r.sleepMin > 0);
      return {
        who: b.id,
        name: b.first.toLowerCase(),
        steps: rows.reduce((s, r) => s + r.steps, 0),
        workouts: rows.reduce((s, r) => s + r.workouts.length, 0),
        avgSleep: sleeps.length ? Math.round(sleeps.reduce((s, r) => s + r.sleepMin, 0) / sleeps.length) : 0,
        streak: stepStreak(health, b.id, new Date(now)),
      };
    })
    .sort((a, b) => b.steps - a.steps);

  const squadSteps = teamWeekSteps(health, new Date(now));
  const squadPct = Math.min(1, squadSteps / TEAM_WEEKLY_GOAL);

  const card: CSSProperties = {
    background: "var(--card)",
    border: "1px solid rgba(var(--ink-rgb),.06)",
    borderRadius: 18,
    boxShadow: "var(--shadow-card)",
  };
  const label: CSSProperties = {
    fontSize: 11,
    letterSpacing: ".12em",
    textTransform: "uppercase",
    color: "rgba(var(--ink-rgb),.55)",
    fontWeight: 700,
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", position: "relative" }} className="anim-sc">
      {burst && (
        <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 5 }}>
          {STEP_BURST.map((c, i) => (
            <span key={i} style={{ position: "absolute", top: "22%", left: c.left, fontSize: c.size, animation: `prayer-float 2.2s ${c.delay}s ease-out forwards` }}>
              {c.emoji}
            </span>
          ))}
        </div>
      )}

      <Eyebrow index="11" label="the grind" color="#FF8A63" />
      <h1 style={{ margin: isMobile ? "0 0 3px" : "0 0 4px", fontSize: isMobile ? 21 : 30, fontWeight: 700, letterSpacing: "-.025em", lineHeight: 1.1 }}>
        the <i style={{ fontWeight: 600 }}>grind</i>
      </h1>
      <p style={{ margin: "0 0 10px", fontSize: isMobile ? 12.5 : 14, color: "rgba(var(--ink-rgb),.5)" }}>
        steps, sweat and sleep — the squad board.
      </p>

      {/* trash-talk ticker */}
      <div key={tickerIdx} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, minHeight: 22, animation: "fit-ticker 8s linear" }}>
        <Icon name="fitness" size={14} color="#FF8A63" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(var(--ink-rgb),.62)" }}>{line}</span>
      </div>

      {/* step race */}
      <div style={{ ...card, padding: isMobile ? "14px 14px 12px" : "18px 20px 14px", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={label}>today's step race</div>
          <div style={{ fontSize: 11.5, color: "rgba(var(--ink-rgb),.4)", fontWeight: 600 }}>goal {fmtSteps(STEP_GOAL)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {race.map((t) => {
            const steps = t.row?.steps ?? 0;
            const pct = Math.min(1, steps / raceMax);
            const isLeader = leader?.who === t.who;
            const open = openWho === t.who;
            const r = t.row;
            return (
              <div key={t.who}>
                <button
                  onClick={() => setOpenWho(open ? null : t.who)}
                  className="dash-row hov-soft"
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "transparent", border: "none", padding: "7px 4px", fontFamily: "inherit", cursor: "pointer", textAlign: "left" }}
                >
                  <Avatar id={t.who} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
                        {t.name} {isLeader && "👑"}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: steps ? "var(--ink)" : "rgba(var(--ink-rgb),.35)" }}>
                        {r ? fmtSteps(steps) : "—"}
                      </span>
                    </div>
                    <div style={{ position: "relative", height: 10, borderRadius: 999, background: "rgba(var(--ink-rgb),.07)", overflow: "hidden" }}>
                      <div
                        style={{
                          position: "absolute",
                          inset: "0 auto 0 0",
                          width: Math.max(steps > 0 ? 3 : 0, pct * 100) + "%",
                          borderRadius: 999,
                          background: isLeader
                            ? "linear-gradient(90deg, #8A84F0, #33ADEE, #2FC197)"
                            : "rgba(var(--ink-rgb),.28)",
                          transition: "width .8s ease",
                          overflow: "hidden",
                        }}
                      >
                        {isLeader && steps > 0 && (
                          <span className="fit-shine" style={{ position: "absolute", inset: 0, width: "40%", background: "linear-gradient(90deg, transparent, rgba(var(--card-rgb),.5), transparent)", animation: "fit-shine 2.6s ease-in-out infinite" }} />
                        )}
                      </div>
                      {/* 10k goal tick (clamped inside the track when the goal IS the max) */}
                      <span style={{ position: "absolute", top: 0, bottom: 0, left: `min(${(STEP_GOAL / raceMax) * 100}%, calc(100% - 3px))`, width: 2, background: "rgba(var(--ink-rgb),.25)" }} />
                    </div>
                  </div>
                  <Icon name="chevron" size={13} color="rgba(var(--ink-rgb),.35)" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                </button>
                {open && (
                  <div style={{ margin: "2px 4px 8px 44px", padding: "10px 12px", background: "rgba(var(--ink-rgb),.035)", borderRadius: 12, fontSize: 12.5 }}>
                    {r ? (
                      <>
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", color: "rgba(var(--ink-rgb),.65)", fontWeight: 600 }}>
                          <span>😴 {fmtSleep(r.sleepMin)}</span>
                          <span style={{ color: RING_COLORS.move }}>{r.moveKcal} cal</span>
                          <span style={{ color: RING_COLORS.exercise }}>{r.exerciseMin}m exercise</span>
                          <span style={{ color: RING_COLORS.stand }}>{r.standHours}h stand</span>
                        </div>
                        {r.workouts.length > 0 && (
                          <div style={{ marginTop: 6, color: "rgba(var(--ink-rgb),.55)" }}>
                            {r.workouts.map((w, i) => (
                              <span key={i} style={{ marginRight: 10 }}>
                                {workoutEmoji(w.type)} {w.type.toLowerCase()} · {w.min}m
                              </span>
                            ))}
                          </div>
                        )}
                        <div style={{ marginTop: 6, fontSize: 11, color: "rgba(var(--ink-rgb),.4)" }}>synced {timeAgo(r.syncedAt)}</div>
                      </>
                    ) : (
                      <span style={{ color: "rgba(var(--ink-rgb),.5)" }}>no sync today — the numbers are hiding 🫣</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* rings */}
      <div style={{ ...card, padding: isMobile ? "14px 12px" : "18px 20px", marginBottom: 12 }}>
        <div style={{ ...label, marginBottom: 10 }}>rings</div>
        <div style={{ display: "flex", gap: 6 }}>
          {todays.map((t) => (
            <RingsFor key={t.who} row={t.row} name={t.name} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 10, fontSize: 10.5, fontWeight: 600, color: "rgba(var(--ink-rgb),.45)" }}>
          <span style={{ color: RING_COLORS.move }}>● move {RING_GOALS.move}cal</span>
          <span style={{ color: RING_COLORS.exercise }}>● exercise {RING_GOALS.exercise}m</span>
          <span style={{ color: RING_COLORS.stand }}>● stand {RING_GOALS.stand}h</span>
        </div>
      </div>

      {/* sleep */}
      <div style={{ ...card, padding: isMobile ? "14px 14px" : "18px 20px", marginBottom: 12 }}>
        <div style={{ ...label, marginBottom: 12 }}>last night</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {todays.map((t) => {
            const min = t.row?.sleepMin ?? 0;
            const isBest = min > 0 && min === bestSleep;
            return (
              <div key={t.who} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar id={t.who} size={26} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ position: "relative", height: 18, borderRadius: 999, background: "rgba(var(--ink-rgb),.06)", overflow: "hidden" }}>
                    <div style={{ position: "absolute", inset: "0 auto 0 0", width: Math.max(min > 0 ? 4 : 0, (min / sleepScale) * 100) + "%", borderRadius: 999, background: "linear-gradient(90deg, #8A84F0aa, #8A84F0)", transition: "width .8s ease" }} />
                  </div>
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 700, fontVariantNumeric: "tabular-nums", minWidth: 62, textAlign: "right", color: min ? "var(--ink)" : "rgba(var(--ink-rgb),.35)" }}>
                  {min ? fmtSleep(min) : "—"} {isBest && "😴"}
                </span>
              </div>
            );
          })}
        </div>
        {(() => {
          const shortest = todays.filter((t) => (t.row?.sleepMin ?? 0) > 0).sort((a, b) => a.row!.sleepMin - b.row!.sleepMin)[0];
          return shortest && shortest.row!.sleepMin < 5.5 * 60 ? (
            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(var(--ink-rgb),.45)", fontWeight: 600 }}>
              {shortest.name} slept {fmtSleep(shortest.row!.sleepMin)}… bro 💀
            </div>
          ) : null;
        })()}
      </div>

      {/* workout feed */}
      <div style={{ ...card, padding: isMobile ? "14px 14px" : "18px 20px", marginBottom: 12 }}>
        <div style={{ ...label, marginBottom: 12 }}>workouts · tap to hype</div>
        {feed.length === 0 ? (
          <div style={{ fontSize: 13, color: "rgba(var(--ink-rgb),.45)", padding: "6px 0" }}>
            no workouts logged yet. someone do something 🦥
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {feed.map(({ row, idx }) => {
              const w = row.workouts[idx];
              const u = effectiveUser(row.who, profiles);
              const hype = row.hype[String(idx)] ?? {};
              return (
                <div key={row.who + row.day + idx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar id={row.who} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                      {u.first.toLowerCase()} · {workoutEmoji(w.type)} {w.type.toLowerCase()}
                    </div>
                    <div style={{ fontSize: 11.5, color: "rgba(var(--ink-rgb),.5)" }}>
                      {w.min}m{w.kcal ? " · " + w.kcal + " cal" : ""} · {w.at ? timeAgo(w.at) : row.day === today ? "today" : row.day.slice(5).replace("-", "/")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {HYPE_EMOJI.map((e) => {
                      const ids = hype[e] ?? [];
                      const mine = ids.includes(me);
                      return (
                        <button
                          key={e}
                          onClick={() => toggleHype(row.who, row.day, idx, e)}
                          className="hov-soft"
                          aria-label={"hype with " + e}
                          aria-pressed={mine}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            background: mine ? "rgba(138,132,240,.16)" : "rgba(var(--ink-rgb),.045)",
                            border: mine ? "1px solid rgba(138,132,240,.45)" : "1px solid transparent",
                            borderRadius: 999,
                            padding: isMobile ? "8px 10px" : "4px 8px",
                            fontSize: 13,
                            fontFamily: "inherit",
                            cursor: "pointer",
                          }}
                        >
                          {e}
                          {ids.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)" }}>{ids.length}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* this week */}
      <div style={{ ...card, padding: isMobile ? "14px 14px" : "18px 20px", marginBottom: 12 }}>
        <div style={{ ...label, marginBottom: 12 }}>this week</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {weekly.map((b, i) => (
            <div key={b.who} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(var(--ink-rgb),.3)", width: 16 }}>{i + 1}</span>
              <Avatar id={b.who} size={26} />
              <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>
                {b.name}
                {b.streak > 1 && (
                  <span style={{ marginLeft: 7, fontSize: 11, fontWeight: 700, color: "#C6663F", background: "rgba(240,120,90,.14)", padding: "2px 7px", borderRadius: 999 }}>
                    🔥 {b.streak}
                  </span>
                )}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtSteps(b.steps)}</span>
              <span style={{ fontSize: 11.5, color: "rgba(var(--ink-rgb),.45)", minWidth: isMobile ? 52 : 90, textAlign: "right" }}>
                {isMobile ? b.workouts + "w" : b.workouts + " workouts"}
                {!isMobile && b.avgSleep > 0 ? " · " + fmtSleep(b.avgSleep) : ""}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(var(--ink-rgb),.6)" }}>squad goal · {fmtSteps(TEAM_WEEKLY_GOAL)} combined</span>
          <span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: squadPct >= 1 ? "#2FC197" : "rgba(var(--ink-rgb),.55)" }}>
            {Math.round(squadPct * 100)}%{squadPct >= 1 && " 🏆"}
          </span>
        </div>
        <div style={{ position: "relative", height: 12, borderRadius: 999, background: "rgba(var(--ink-rgb),.07)", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: "0 auto 0 0", width: Math.max(squadSteps > 0 ? 2 : 0, squadPct * 100) + "%", borderRadius: 999, background: "linear-gradient(90deg, #FF8A63, #F0A94B, #2FC197)", transition: "width .8s ease" }} />
        </div>
      </div>

      {/* connect card */}
      <div style={{ ...card, padding: isMobile ? "14px 14px" : "18px 20px", border: "1px dashed rgba(var(--ink-rgb),.16)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Icon name="fitness" size={16} color="#FF8A63" />
          <span style={{ fontSize: 14, fontWeight: 700 }}>connect your iphone</span>
        </div>
        <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "rgba(var(--ink-rgb),.55)", lineHeight: 1.5 }}>
          an iOS Shortcut reads your Health data every morning and syncs it here. import the squad shortcut (or build it from{" "}
          <a href="https://github.com/JoshuaWaldron215/synthos-os/blob/main/docs/HEALTH_SYNC_SHORTCUT.md" target="_blank" rel="noreferrer" style={{ color: "#33ADEE", fontWeight: 600 }}>
            the recipe ↗
          </a>
          ), paste your personal token below into its <b>x-health-token</b> field, and you're in the race.
        </p>
        {healthToken ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <code style={{ fontSize: 12, background: "rgba(var(--ink-rgb),.05)", border: "1px solid rgba(var(--ink-rgb),.09)", borderRadius: 9, padding: "7px 10px", letterSpacing: ".02em", userSelect: "all", maxWidth: "100%", wordBreak: "break-all" }}>
              {tokenShown ? healthToken : "••••••••••••" + healthToken.slice(-6)}
            </code>
            <button onClick={() => setTokenShown((v) => !v)} className="hov-soft" style={{ background: "transparent", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 9, padding: 7, display: "flex" }} title={tokenShown ? "hide" : "reveal"}>
              <Icon name={tokenShown ? "eyeoff" : "eye"} size={14} color="rgba(var(--ink-rgb),.55)" />
            </button>
            <button onClick={() => copy(healthToken, "sync token")} className="hov-soft" style={{ background: "transparent", border: "1px solid rgba(var(--ink-rgb),.1)", borderRadius: 9, padding: 7, display: "flex" }} title="copy token">
              <Icon name="copy" size={14} color="rgba(var(--ink-rgb),.55)" />
            </button>
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: "rgba(var(--ink-rgb),.45)" }}>sign in on the deployed app to get your sync token.</div>
        )}
      </div>
    </div>
  );
}
