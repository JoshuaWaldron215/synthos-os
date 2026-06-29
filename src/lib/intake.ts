import type { DraftTask, Priority, Task } from "../types";

function cleanTitle(input: string): string {
  let s = (input || "").replace(/\s+/g, " ").trim();
  const ci = s.indexOf(":");
  if (ci > -1 && ci < 28) s = s.slice(ci + 1).trim();
  s = s.replace(/^(client|we|they|you|it|also|plus|and|so|please|can we|could we|the whole thing|i)\s+/i, "");
  s = s.replace(/^(needs to|need to|wants to|want to|would like to|needs|need|wants|want|would|should|must|like|have to|has to)\s+/i, "");
  s = s.replace(/^(a|an|the|to)\s+/i, "").trim();
  if (s.length > 70) s = s.slice(0, 68).replace(/\s\S*$/, "") + "\u2026";
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

// 0 = generalist/founder, 1 = design/frontend, 2 = backend/infra
function categorize(input: string): number {
  const s = input.toLowerCase();
  if (/\b(design|brand|mobile|ui|ux|layout|page|screen|responsive|portal|dashboard|email|copy|pdf|invoice|onboarding)\b/.test(s)) return 1;
  if (/\b(api|auth|database|db|supabase|schema|migration|deploy|infra|webhook|stripe|billing|security|rls|endpoint|integrat|report|analytics|automat|queue|server)\b/.test(s)) return 2;
  return 0;
}

function priOf(input: string): Priority {
  const s = input.toLowerCase();
  if (/\b(priority|launch|asap|urgent|critical|checkout|deadline|blocker|top)\b/.test(s)) return "high";
  if (/\b(later|nice|optional|eventually|someday|maybe)\b/.test(s)) return "low";
  return "med";
}

export function generateTasks(text: string, tasks: Task[]): DraftTask[] {
  const parts = (text || "")
    .split(/[\n.;•\u2022]|(?:,\s*(?:and|plus|also)\b)/i)
    .map((x) => x.trim())
    .filter((x) => x.length >= 16 && /[a-z]/i.test(x));

  const seen: Record<string, number> = {};
  let items: string[] = [];
  parts.forEach((part) => {
    const t = cleanTitle(part);
    const key = t.slice(0, 24).toLowerCase();
    if (t.length >= 8 && !seen[key]) {
      seen[key] = 1;
      items.push(t);
    }
  });
  if (items.length === 0) {
    items = ["scope the project", "set up the repo and environments", "draft the data model", "build the core flow", "qa and polish"];
  }
  items = items.slice(0, 8);

  // base load from current open tasks
  const load = [0, 0, 0];
  tasks.forEach((t) => {
    if (t.col !== "done") load[t.who]++;
  });

  return items.map((title, i) => {
    const pref = categorize(title);
    let best = 0;
    let bestScore = Infinity;
    [0, 1, 2].forEach((u) => {
      const score = load[u] * 10 + (u === pref ? 0 : 3) + u * 0.1;
      if (score < bestScore) {
        bestScore = score;
        best = u;
      }
    });
    load[best]++;
    return { id: "d" + Date.now() + i, title, who: best, pri: priOf(title) };
  });
}

export function respond(t: string): string {
  const s = t.toLowerCase();
  if (s.indexOf("block") > -1)
    return "i'll scan your board for blocked tasks and the projects they belong to, then summarize who's waiting on what. connect an AI key to get full, written blocker summaries grounded in your live data.";
  if (s.indexOf("standup") > -1 || s.indexOf("update") > -1)
    return "standup draft (grounded in your board):\n· shipped → tasks moved to done since yesterday\n· building → in-progress work, by owner\n· blocked → anything flagged blocked, with the project\n· qa → cards waiting on review\nadd projects and tasks and i'll fill this in automatically.";
  if (s.indexOf("week") > -1 || s.indexOf("ship") > -1)
    return "i'll roll up what shipped this week from your tasks and wins — features closed, milestones logged, and momentum vs. last week. log a few wins and i'll start tracking the trend.";
  if (s.indexOf("revenue") > -1 || s.indexOf("mrr") > -1 || s.indexOf("$") > -1)
    return "i can total monthly retainer (mrr) and earned revenue across your projects and wins. set the retainer and earned amounts on each project and they'll roll up here and on the wins page.";
  return "on it. i'm grounded in your projects, tasks and vault — give me a sharper prompt (a project, a metric, or a timeframe) and i'll get specific. connect an AI key for full written answers.";
}
