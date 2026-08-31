// Original lines written in the hard-nosed endurance-athlete voice — not
// quotations of any real person, so they can be used freely and there's an
// endless supply. Picked deterministically per day+slot so everyone on the
// team sees the same line at the same time and it changes on its own.

export const HYPE_MORNING = [
  "the run doesn't care how you slept.",
  "nobody is coming. put the shoes on.",
  "you already know what today costs. pay it.",
  "motivation is a liar. discipline shows up anyway.",
  "the version of you that quits is also you. outvote him.",
  "hard now or soft later. pick one.",
  "you don't need to feel ready. you need to start.",
  "the hill is not negotiating with you today.",
];

export const HYPE_NUDGE = [
  "shoes on. no negotiation.",
  "this is the one you'd normally skip. don't.",
  "the work is boring. do it anyway.",
  "somebody out there isn't stopping. be that somebody.",
  "you'll never regret finishing it.",
  "your legs are lying. they have more.",
  "one more mile than yesterday's excuse.",
  "get uncomfortable on purpose.",
  "the plan already decided. you just execute.",
  "nobody's watching. that's the whole point.",
];

export const HYPE_DONE = [
  "banked. that's one they can't take back.",
  "that's the deposit. race day is the withdrawal.",
  "you did the thing you didn't want to do. good.",
];

/** stable per (day, slot) so the same line doesn't reshuffle on every render */
export function hypeFor(list: string[], day: string, slot = 0): string {
  let h = slot * 2654435761;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) | 0;
  return list[Math.abs(h) % list.length];
}
