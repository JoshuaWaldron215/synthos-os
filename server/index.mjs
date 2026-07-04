// Local Web Push server for Synthos OS.
// Generates/persists VAPID keys, stores PushSubscriptions, and sends real
// browser push notifications via the `web-push` library.
//
//   npm run server        # start on http://localhost:4000
//
// In dev, Vite proxies /api -> http://localhost:4000 (see vite.config.ts),
// so the front-end talks to it with relative URLs.

import express from "express";
import cors from "cors";
import webpush from "web-push";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, ".data");
const VAPID_FILE = join(DATA_DIR, "vapid.json");
const SUBS_FILE = join(DATA_DIR, "subscriptions.json");
const PORT = process.env.PORT || 4000;
const CONTACT = process.env.VAPID_CONTACT || "mailto:team@runsynthos.com";

mkdirSync(DATA_DIR, { recursive: true });

function readJson(file, fallback) {
  try {
    if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    /* ignore */
  }
  return fallback;
}
function writeJson(file, value) {
  writeFileSync(file, JSON.stringify(value, null, 2));
}

// --- VAPID keys (generate once, persist) ---
let vapid = readJson(VAPID_FILE, null);
if (!vapid || !vapid.publicKey || !vapid.privateKey) {
  vapid = webpush.generateVAPIDKeys();
  writeJson(VAPID_FILE, vapid);
  console.log("[push] generated new VAPID keys -> server/.data/vapid.json");
}
webpush.setVapidDetails(CONTACT, vapid.publicKey, vapid.privateKey);

// --- subscriptions store (keyed by endpoint) ---
/** @type {Record<string, any>} */
let subs = readJson(SUBS_FILE, {});
const saveSubs = () => writeJson(SUBS_FILE, subs);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true, subscribers: Object.keys(subs).length }));

app.get("/api/vapid-public-key", (_req, res) => res.json({ key: vapid.publicKey }));

app.get("/api/subscriptions/count", (_req, res) => res.json({ count: Object.keys(subs).length }));

app.post("/api/subscribe", (req, res) => {
  const sub = req.body && req.body.subscription;
  const who = Number.isInteger(req.body && req.body.who) ? req.body.who : 0;
  if (!sub || !sub.endpoint) return res.status(400).json({ error: "missing subscription" });
  subs[sub.endpoint] = { sub, who };
  saveSubs();
  console.log("[push] subscribed:", sub.endpoint.slice(0, 60) + "…", "(who " + who + ", total " + Object.keys(subs).length + ")");
  res.status(201).json({ ok: true, count: Object.keys(subs).length });
});

app.post("/api/unsubscribe", (req, res) => {
  const endpoint = req.body && req.body.endpoint;
  if (endpoint && subs[endpoint]) {
    delete subs[endpoint];
    saveSubs();
  }
  res.json({ ok: true, count: Object.keys(subs).length });
});

// Send a push to every stored subscription — or just to the builder ids in
// `userIds` (same contract as api/send.js). Prunes dead endpoints (404/410).
// Handles both the legacy flat format and the {sub, who} wrapper.
app.post("/api/send", async (req, res) => {
  const { title = "Synthos OS", body = "", tag, userIds } = req.body || {};
  const payload = JSON.stringify({ title, body, tag });
  const wanted = Array.isArray(userIds) && userIds.length ? new Set(userIds) : null;
  const endpoints = Object.keys(subs).filter((ep) => {
    if (!wanted) return true;
    const who = subs[ep] && Number.isInteger(subs[ep].who) ? subs[ep].who : 0;
    return wanted.has(who);
  });
  let sent = 0;
  const dead = [];

  await Promise.all(
    endpoints.map(async (ep) => {
      try {
        await webpush.sendNotification(subs[ep].sub || subs[ep], payload);
        sent++;
      } catch (err) {
        if (err && (err.statusCode === 404 || err.statusCode === 410)) dead.push(ep);
        else console.error("[push] send error", err && err.statusCode);
      }
    })
  );

  if (dead.length) {
    dead.forEach((ep) => delete subs[ep]);
    saveSubs();
  }
  console.log("[push] sent to " + sent + "/" + endpoints.length + " (pruned " + dead.length + ")");
  res.json({ ok: true, sent, total: endpoints.length, pruned: dead.length });
});

app.listen(PORT, () => {
  console.log("[push] server on http://localhost:" + PORT + "  ·  subscribers: " + Object.keys(subs).length);
});
