import { vapidConfigured } from "./_lib.js";

// Public VAPID key — safe to expose; browsers need it to subscribe.
export default function handler(_req, res) {
  if (!vapidConfigured()) {
    return res.status(503).json({ error: "push not configured (set VAPID_* env vars)" });
  }
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
}
