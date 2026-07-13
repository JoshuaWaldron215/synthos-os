import { createClient } from "@supabase/supabase-js";

// Public read for a project's client portal. The unguessable token in the
// shared link is the visitor's only credential — no Supabase session exists,
// so everything goes through the service role and returns ONLY the fields the
// team explicitly marked client-visible. Whitelist, never blacklist.
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  res.setHeader("Cache-Control", "no-store");

  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(503).json({ error: "not configured" });

  const token = typeof req.query?.token === "string" ? req.query.token : "";
  if (!token || token.length < 20) return res.status(404).json({ error: "not found" });

  const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: link } = await sb.from("portal_links").select("proj, progress").eq("token", token).single();
  if (!link) return res.status(404).json({ error: "not found" });

  const convoId = "portal-" + link.proj;
  const [{ data: project }, { data: updates }, { data: tasks }, { data: files }, { data: messages }, { data: profiles }] =
    await Promise.all([
      sb.from("projects").select("client, tagline, status, builders").eq("id", link.proj).single(),
      sb.from("portal_updates").select("id, who, body, at").eq("proj", link.proj).order("at", { ascending: false }).limit(20),
      sb.from("tasks").select("title, col").eq("proj", link.proj).eq("client_visible", true).limit(40),
      sb.from("project_files").select("id, name, size, path").eq("proj", link.proj).eq("client_visible", true).limit(20),
      sb.from("messages").select("who, text, at, guest").eq("convo", convoId).order("at", { ascending: true }).limit(60),
      sb.from("profiles").select("builder_id, name, role, avatar_url"),
    ]);
  if (!project) return res.status(404).json({ error: "not found" });

  const nameOf = (who) => {
    const p = (profiles ?? []).find((x) => x.builder_id === who);
    return p?.name?.split(" ")[0] || "the team";
  };

  // fresh signed URLs per request (1h) — flagged blobs only
  const signedFiles = await Promise.all(
    (files ?? []).map(async (f) => {
      const { data: signed } = await sb.storage.from("project-files").createSignedUrl(f.path, 3600);
      return { name: f.name, size: f.size, url: signed?.signedUrl ?? null };
    }),
  );

  res.json({
    project: {
      client: project.client,
      tagline: project.tagline ?? "",
      status: project.status,
      shipped: project.status === "shipped",
      progress: project.status === "shipped" ? 100 : Math.max(0, Math.min(100, link.progress ?? 0)),
      team: (project.builders ?? [])
        .map((b) => {
          const p = (profiles ?? []).find((x) => x.builder_id === b);
          return p ? { name: p.name, role: p.role ?? "", avatar: p.avatar_url ?? null } : null;
        })
        .filter(Boolean),
    },
    updates: (updates ?? []).map((u) => ({ id: u.id, by: nameOf(u.who), body: u.body, at: u.at })),
    milestones: (tasks ?? []).map((t) => ({ title: t.title, done: t.col === "done" })),
    files: signedFiles.filter((f) => f.url),
    messages: (messages ?? []).map((m) => ({
      from: m.guest || nameOf(m.who),
      client: !!m.guest,
      text: m.text,
      at: m.at,
    })),
  });
}
