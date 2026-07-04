import { requireUser } from "./_lib.js";

// Remove a push subscription by endpoint.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const ctx = await requireUser(req, res);
  if (!ctx) return;

  const { endpoint } = req.body || {};
  if (endpoint) await ctx.sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
  res.json({ ok: true });
}
