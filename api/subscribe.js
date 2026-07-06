import { requireUser } from "./_lib.js";

// Store (or refresh) a push subscription for the signed-in teammate.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const ctx = await requireUser(req, res);
  if (!ctx) return;

  const { subscription, who } = req.body || {};
  if (!subscription?.endpoint) return res.status(400).json({ error: "missing subscription" });

  // Ownership comes from the verified login, not the client's claim — account
  // switching on a shared device must not mislabel who a device belongs to.
  const { data: prof } = await ctx.sb.from("profiles").select("builder_id").eq("id", ctx.user.id).single();
  const owner = Number.isInteger(prof?.builder_id) ? prof.builder_id : Number.isInteger(who) ? who : 0;

  const { error } = await ctx.sb.from("push_subscriptions").upsert({
    endpoint: subscription.endpoint,
    who: owner,
    sub: subscription,
  });
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ ok: true });
}
