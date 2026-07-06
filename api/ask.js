// Real Ask AI: a workspace-grounded Claude agent.
// The caller forwards their Supabase JWT + recent chat history; we pull the
// live workspace (projects, tasks, leads, wins, activity) under their RLS
// session, hand it to Claude with task tools, and run the tool-use loop
// server-side. Returns { text, actions } — created/updated tasks arrive on
// every client through Realtime, so nothing here writes back to the caller.
//
// Needs ANTHROPIC_API_KEY in the environment. Without it we return
// { configured: false } and the client falls back to the canned responder.

import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "./_lib.js";

const MODEL = "claude-opus-4-8";
const MAX_TOOL_ROUNDS = 5;

const TOOLS = [
  {
    name: "create_task",
    description:
      "Create a task on the team kanban board and assign it to a builder. Call this when the user asks to add, create, or assign work. Use one call per task.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short lowercase task title, e.g. 'wire the stripe webhook'" },
        who: { type: "integer", description: "Builder id to assign to (see the team roster)" },
        proj: { type: "string", description: "Project id from the workspace snapshot, or omit if none applies" },
        pri: { type: "string", enum: ["low", "med", "high"], description: "Priority (default med)" },
        col: { type: "string", enum: ["build", "qa", "ship"], description: "Board column (default build)" },
        due: { type: "integer", description: "Optional due date as unix epoch milliseconds" },
        notes: { type: "string", description: "Optional extra context for the assignee" },
      },
      required: ["title", "who"],
    },
  },
  {
    name: "update_task",
    description:
      "Update an existing task: reassign it, move it between columns, change priority, set a due date, or mark it blocked. Only call with a task id that appears in the workspace snapshot.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Task id from the workspace snapshot" },
        title: { type: "string" },
        who: { type: "integer", description: "New assignee builder id" },
        col: { type: "string", enum: ["build", "qa", "ship", "done"] },
        pri: { type: "string", enum: ["low", "med", "high"] },
        due: { type: ["integer", "null"], description: "Due date in epoch ms, or null to clear" },
        blocked: { type: "boolean" },
        notes: { type: "string" },
      },
      required: ["id"],
    },
  },
];

// Compact workspace snapshot: enough for grounded answers without blowing up
// the prompt. Ids are included so tools can reference rows precisely.
async function loadWorkspace(sb) {
  const [profiles, projects, tasks, leads, wins, activity] = await Promise.all([
    sb.from("profiles").select("builder_id,name,role").not("builder_id", "is", null),
    sb.from("projects").select("id,client,tagline,status,health,builders,rev,earned,stack"),
    sb.from("tasks").select("id,title,col,who,pri,blocked,proj,due,done_at,notes").order("updated_at", { ascending: false }).limit(120),
    sb.from("leads").select("id,name,source,quality,status,who,notes,next_follow_up").order("created_at", { ascending: false }).limit(60),
    sb.from("wins").select("id,title,who,tag,amount,proj,created_at").order("created_at", { ascending: false }).limit(30),
    sb.from("activity").select("who,action,target,proj,at").order("at", { ascending: false }).limit(25),
  ]);
  return {
    team: profiles.data ?? [],
    projects: projects.data ?? [],
    tasks: tasks.data ?? [],
    leads: leads.data ?? [],
    wins: wins.data ?? [],
    recent_activity: activity.data ?? [],
  };
}

function systemPrompt(workspace, builderId) {
  const now = new Date();
  return [
    "You are the Ask AI inside Synthos OS, the internal workspace of a three-person AI agency (Synthos). You help the team check on projects, tasks, leads, wins and recent updates, and you can assign work using your tools.",
    "",
    "Current date/time: " + now.toISOString() + " (epoch ms: " + now.getTime() + "). Use this to compute due dates like 'tomorrow' or 'friday'.",
    "The person talking to you is builder id " + builderId + " (see the roster). 'me'/'my' refers to them.",
    "",
    "Workspace snapshot (live, from the shared database):",
    JSON.stringify(workspace),
    "",
    "Notes on the data: tasks live on a kanban board with columns build → qa → ship → done. 'who' fields are builder ids. 'due', 'at' and follow-up fields are epoch ms. Project 'rev' is the monthly retainer, 'earned' is one-off revenue.",
    "",
    "Style: replies render as plain text in a small chat bubble — no markdown headings, no bold, no tables. Keep answers short, concrete and grounded in the snapshot (use real titles, names and numbers). Lowercase, friendly, no fluff. Use '·' separators or short lines for lists.",
    "When asked to assign or create work, use create_task/update_task — don't just describe what you would do. Pick the assignee the user names; if they don't name one, choose the least-loaded builder and say who you picked. After acting, confirm briefly what you did.",
    "If something isn't in the snapshot, say so rather than inventing it.",
  ].join("\n");
}

// Run a tool call against the DB under the caller's RLS session.
async function runTool(sb, builderId, name, input, actions) {
  if (name === "create_task") {
    const id = "t" + Date.now() + Math.random().toString(36).slice(2, 5);
    const row = {
      id,
      title: String(input.title || "").trim() || "untitled task",
      col: ["build", "qa", "ship"].includes(input.col) ? input.col : "build",
      who: Number.isInteger(input.who) ? input.who : builderId,
      pri: ["low", "med", "high"].includes(input.pri) ? input.pri : "med",
      blocked: false,
      proj: input.proj || null,
      notes: typeof input.notes === "string" ? input.notes : "",
      due: Number.isFinite(input.due) ? input.due : null,
      done_at: null,
      attachments: null,
    };
    const { error } = await sb.from("tasks").insert(row);
    if (error) return { ok: false, error: error.message };
    actions.push({ type: "created_task", id, title: row.title, who: row.who });
    // mirror the app's activity log so the audit trail stays coherent
    await sb.from("activity").insert({
      id: "act" + Date.now() + Math.random().toString(36).slice(2, 5),
      who: builderId,
      action: "created task (ask ai)",
      target: row.title,
      at: Date.now(),
      proj: row.proj || "shared",
    });
    return { ok: true, id, task: row };
  }

  if (name === "update_task") {
    const { data: existing, error: readErr } = await sb.from("tasks").select("*").eq("id", input.id).maybeSingle();
    if (readErr || !existing) return { ok: false, error: "task not found: " + input.id };
    const patch = {};
    if (typeof input.title === "string" && input.title.trim()) patch.title = input.title.trim();
    if (Number.isInteger(input.who)) patch.who = input.who;
    if (["low", "med", "high"].includes(input.pri)) patch.pri = input.pri;
    if (typeof input.blocked === "boolean") patch.blocked = input.blocked;
    if (typeof input.notes === "string") patch.notes = input.notes;
    if (input.due === null || Number.isFinite(input.due)) patch.due = input.due;
    if (["build", "qa", "ship", "done"].includes(input.col)) {
      patch.col = input.col;
      patch.done_at = input.col === "done" ? (existing.done_at ?? Date.now()) : null;
    }
    if (!Object.keys(patch).length) return { ok: false, error: "nothing to update" };
    const { error } = await sb.from("tasks").update(patch).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    actions.push({
      type: "updated_task",
      id: input.id,
      title: patch.title ?? existing.title,
      who: patch.who ?? existing.who,
      reassigned: Number.isInteger(patch.who) && patch.who !== existing.who,
    });
    return { ok: true, id: input.id, task: { ...existing, ...patch } };
  }

  return { ok: false, error: "unknown tool: " + name };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // Vercel env in prod; ANTHROPIC_AUTH_TOKEN covers local `ant`-style tokens.
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return res.status(200).json({ configured: false });
  }

  const auth = await requireUser(req, res);
  if (!auth) return;
  const { sb, user } = auth;

  const { data: prof } = await sb.from("profiles").select("builder_id").eq("id", user.id).maybeSingle();
  const builderId = Number.isInteger(prof?.builder_id) ? prof.builder_id : 0;

  const history = Array.isArray(req.body?.messages) ? req.body.messages : [];
  const messages = history
    .filter((m) => m && typeof m.text === "string" && m.text.trim())
    .slice(-12)
    .map((m) => ({ role: m.role === "me" ? "user" : "assistant", content: m.text }));
  // drop any leading assistant greeting — the API needs a user turn first
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length) return res.status(400).json({ error: "no message" });

  try {
    const workspace = await loadWorkspace(sb);
    const anthropic = new Anthropic();
    const system = systemPrompt(workspace, builderId);
    const actions = [];

    let response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system,
      tools: TOOLS,
      messages,
    });

    let rounds = 0;
    while (response.stop_reason === "tool_use" && rounds < MAX_TOOL_ROUNDS) {
      rounds++;
      const toolUses = response.content.filter((b) => b.type === "tool_use");
      const results = [];
      for (const tu of toolUses) {
        const result = await runTool(sb, builderId, tu.name, tu.input, actions);
        results.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: JSON.stringify(result),
          is_error: !result.ok,
        });
      }
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: results });
      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        thinking: { type: "adaptive" },
        system,
        tools: TOOLS,
        messages,
      });
    }

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return res.status(200).json({
      configured: true,
      text: text || (actions.length ? "done ✦" : "hmm, i came up empty — try rephrasing?"),
      actions,
    });
  } catch (err) {
    console.error("[ask] error", err?.status || "", err?.message || err);
    return res.status(502).json({ error: "ask failed" });
  }
}
