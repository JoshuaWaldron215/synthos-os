# Synthos OS — Handoff (Cursor → Claude Code)

**Date:** July 2026  
**Repo:** https://github.com/JoshuaWaldron215/synthos-os  
**HEAD:** `f9a3366` on `main`  
**Demo:** https://synthos-os.vercel.app

This document captures project state, what was completed in Cursor, and what remains for production/enterprise use.

---

## What Synthos OS is

An internal operating system for a 3-person software/AI studio (Synthos). Replaces scattered Notion/Trello/password-manager/Slack workflows with one installable PWA:

- **Projects** — portfolio with status, revenue, linked tools, per-project tasks/files/keys
- **Tasks** — kanban (build → qa → ship → done), drag-and-drop, filters
- **Content** — marketing pipeline kanban (idea → posted)
- **Vault** — masked secrets, reveal/copy, audit log
- **Intake** — paste a scope, generate draft tasks
- **Wins** — milestone + revenue feed with confetti
- **Team** — channels, group chats, DMs, attachments, reactions, @mentions
- **Ask AI** — canned responder (wire to Anthropic when ready)
- **Search** — ⌘K across people, projects, tasks, keys, files

---

## What was built (Cursor session summary)

### Core product (complete for demo/local use)
- Full SPA with 10 surfaces, responsive mobile (bottom tabs, drawer, bottom sheets)
- Zustand store with persist, now split into 9 domain slices
- Custom login UI, profile/settings, teammate profile cards
- PWA manifest, service worker, push notification plumbing (local server)
- Supabase scaffold: `repo.ts`, `schema.sql`, lazy client, env toggle
- Vercel deployment with GitHub CI/CD, public demo at synthos-os.vercel.app
- Route-level code splitting (~276 kB initial JS)

### Recent refactor (4 commits on main)
1. **Perf + a11y** — app icon 1.35 MB → 27 kB; real epoch timestamps; offline deep-link nav; focus-visible rings; modal dialog semantics
2. **UX correctness** — blur-commit for edits; branded ConfirmDialog for all deletes; live-derived open-task counts; unassigned tasks from "all" board
3. **Structure** — store slices; typed repo mappers; `ContentLane`/`UserStatus` unions; brand token sweep; deduped shared libs
4. **Visual/nav polish** — full-height mobile chat; project tabs in URL with counts; empty states; vault search highlight; toast above tab bar

---

## Current architecture

```
Browser (PWA)
  ├── Zustand store (localStorage persist: synthos-os-v2)
  ├── IndexedDB (file blobs, local mode)
  └── repo.ts seam
        ├── Local mode: no-ops on write, null on read (store is source of truth)
        └── Supabase mode: Postgres + Storage + Auth (when env vars set)
```

**Synced entities (repo):** projects, tasks, vault_keys, activity, wins, project_files  
**Local-only entities:** conversations, teamMsgs, content, profiles, prefs, notifications

**Auth modes:**
- Local: any email/password → localStorage flag; defaults to builder id 0
- Supabase: `signInWithPassword`; email mapped to builder via Shell.tsx

---

## Production blockers (must fix for real team use)

### 1. Authentication is decorative on the live demo — HIGH
Deployed site has no Supabase env vars. Anyone can sign in with any credentials. Unmatched emails still operate as builder 0 (Josh).

**Fix:** Provision Supabase, create 3 auth users, set Vercel env vars, gate local auth to `import.meta.env.DEV` only, reject sessions that don't match a known teammate email.

### 2. Teammates don't share data — HIGH
Chat, content, profiles are localStorage-only. Even synced entities only hydrate once — no Realtime, no polling. Two people editing the same task = silent last-write-wins.

**Fix:**
- Add `conversations`, `messages`, `content_items` tables to schema
- Extend `repo.ts` to sync them
- Subscribe to Supabase Realtime (`postgres_changes`) and feed into store
- `receiveTeamMessage` in `src/store/slices/team.ts` is the seam for inbound messages

### 3. Activity sync is broken against current schema — HIGH
App writes `at: number` (epoch ms) since timestamp refactor. Schema still has `"time" text`. Inserts fail silently because every repo write ends in `.catch(() => {})`.

**Fix:** Migration: `alter table activity add column at bigint;` (drop legacy `time` or keep for back-compat). Replace silent catches with user-visible sync errors + retry queue.

### 4. Vault secrets are plaintext — HIGH for enterprise
Keys stored plaintext in localStorage and Postgres. RLS is `authenticated = full access`. Audit log is client-generated.

**Fix (short-term):** Acceptable for 3-person trusted team with restricted auth.  
**Fix (enterprise):** Client-side encryption (WebCrypto AES-GCM) or external secrets manager.

### 5. Push notifications don't work in production — MEDIUM
Push server is localhost Express writing JSON files. Vercel has no `/api` routes. Broadcast-to-all, not per-user.

**Fix:** Vercel serverless functions for VAPID/subscribe/send; subscriptions in Supabase table; per-user targeting.

### 6. No error containment — MEDIUM
No React ErrorBoundary. One render error white-screens the app. No Sentry/monitoring.

**Fix:** ErrorBoundary at Shell level + per lazy route; Sentry with source maps.

---

## Enterprise hardening checklist

| Item | Status | Notes |
|------|--------|-------|
| CI (GitHub Actions) | ❌ | Add workflow: tsc, oxlint, vitest, build on PR |
| Persist versioning / migrate | ❌ | `synthos-os-v2` has no `version` + `migrate()` — next bump wipes user data |
| Test coverage | ⚠️ | 16 unit tests on 3 pure-function files; no store/component/e2e tests |
| Hardcoded 3-person roster | ⚠️ | `USERS` in seed.ts; `who: int` everywhere; fine for now |
| Security headers (CSP, etc.) | ❌ | vercel.json has cache headers only |
| Input validation (zod) | ❌ | hydrate() trusts Postgres shape |
| Data export/import | ❌ | No JSON backup; localStorage quota unhandled |
| Ask AI (real model) | ❌ | Canned responder; needs serverless proxy to Anthropic |
| Ops runbook | ⚠️ | supabase/README.md exists; no full runbook |

---

## Visual / aesthetic remaining work

Lower priority than backend, but improves daily feel:

1. **Route loading skeleton** — Suspense fallback is `null`; add branded shimmer
2. **Self-host font** — `@fontsource/plus-jakarta-sans` instead of Google Fonts CDN
3. **Contrast pass** — metadata text at `.38–.45` opacity fails WCAG AA; bump floor to ~`.55`
4. **Empty states** — Tasks board, Wins, Content, notifications panel still bare
5. **Dark mode** — tokens are CSS variables; `prefers-color-scheme` palette is straightforward
6. **Favicon** — add proper 32px + SVG (currently uses 192px PWA PNG)
7. **Desktop chat height** — message pane capped at 52vh; should flex like mobile

---

## Recommended work sequence

### Phase A — Make it a real product (1 day)
1. Provision Supabase project
2. Run `supabase/schema.sql` (+ fix activity `at` column)
3. Create 3 auth users matching team emails
4. Set `VITE_SUPABASE_*` in Vercel + `.env.local`
5. Disable local auth bypass in production
6. Add visible sync error toasts (replace silent `.catch`)

### Phase B — Shared realtime workspace (1 day)
1. Add conversations/messages/content tables
2. Extend repo + store hydration
3. Supabase Realtime subscriptions
4. ErrorBoundary + basic Sentry

### Phase C — Production hardening (0.5 day)
1. GitHub Actions CI
2. Persist `migrate()` versioning
3. JSON export/import
4. Security headers in vercel.json

### Phase D — Push + polish (0.5 day)
1. Vercel serverless push API
2. Loading skeletons, font self-host, contrast, remaining empty states

### Phase E — Enterprise (later)
1. Vault client-side encryption
2. Real Ask AI via serverless Anthropic proxy
3. Playwright e2e smoke tests
4. Dark mode

---

## Files to read first

| File | Why |
|------|-----|
| `src/store/types.ts` | Full store contract |
| `src/data/repo.ts` | Backend seam — what syncs, what doesn't |
| `src/lib/useAuth.ts` | Auth modes and local bypass |
| `src/components/Shell.tsx` | Hydration, email→builder mapping |
| `supabase/schema.sql` | Postgres tables + RLS |
| `src/data/seed.ts` | Team roster, empty seeds |
| `vercel.json` | Deploy config |

---

## Secrets & env (not in git)

| Secret | Location |
|--------|----------|
| `VITE_SUPABASE_URL` | `.env.local` / Vercel env |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` / Vercel env |
| VAPID keys | `server/.data/vapid.json` (gitignored, auto-generated) |
| Anthropic API key | Not wired yet; would go in Vercel serverless env |

---

## Git history (recent)

```
f9a3366 feat(ux): visual + navigation polish pass
12cdd3e refactor: code-split routes + lazy Supabase, store slices, dedupe, type tightening, brand sweep
6e2bebe fix(ux): blur-commit edits, branded delete confirms, live open counts, no-project tasks
b7f6026 perf+fix: shrink bundled images 97%, real timestamps, offline nav, a11y baseline
f82cf92 feat(team): message attachments, emoji reactions, @mentions + win confetti
```

---

## Questions for the human

Before starting Phase A, confirm:

1. Supabase project created? (URL + anon key ready?)
2. Should local auth bypass be removed entirely, or kept for `npm run dev` only?
3. Vault: plaintext OK for now, or encrypt before any real keys go in?
4. Push: needed for v1, or defer until chat is realtime?
