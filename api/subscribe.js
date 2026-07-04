import { requireUser } from "./_lib.js";

// Store (or refresh) a push subscription for the signed-in teammate.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const ctx = await requireUser(req, res);
  if (!ctx) return;

  const { subscription, who } = req.body || {};
  if (!subscription?.endpoint) return res.status(400).json({ error: "missing subscription" });

  const { error } = await ctx.sb.from("push_subscriptions").upsert({
    endpoint: subscription.endpoint,
    who: Number.isInteger(who) ? who : 0,
    sub: subscription,
  });
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ ok: true });
}
