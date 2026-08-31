// Original lines in the hard-nosed endurance voice (not quotations of any real
// person). Mirrors src/lib/hype.ts so pushes and the UI speak the same way.
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

export function hypeFor(list, day, slot = 0) {
  let h = slot * 2654435761;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) | 0;
  return list[Math.abs(h) % list.length];
}
