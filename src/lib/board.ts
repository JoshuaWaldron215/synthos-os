import type { ColKey, StatusKey } from "../types";

export const COLS: { key: ColKey; accent: StatusKey }[] = [
  { key: "build", accent: "sky" },
  { key: "qa", accent: "lav" },
  { key: "ship", accent: "blush" },
  { key: "done", accent: "mint" },
];

export const CONTENT_LANES: { key: string; label: string; accent: StatusKey }[] = [
  { key: "idea", label: "idea", accent: "sky" },
  { key: "scripting", label: "scripting", accent: "lav" },
  { key: "filming", label: "filming", accent: "blush" },
  { key: "editing", label: "editing", accent: "lav" },
  { key: "scheduled", label: "scheduled", accent: "sky" },
  { key: "posted", label: "posted", accent: "mint" },
];

export const CONTENT_KINDS = ["short", "reel", "vlog", "tutorial", "thread", "case study", "post"];
