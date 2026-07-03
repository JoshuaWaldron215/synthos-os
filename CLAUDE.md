# Synthos OS — Claude Code project guide

Internal ops workspace for Synthos, a 3-person software/AI agency. One installable PWA for projects, tasks, content, vault, wins, team chat, and intake.

**Live demo:** https://synthos-os.vercel.app  
**Repo:** https://github.com/JoshuaWaldron215/synthos-os  
**Latest handoff:** see `docs/HANDOFF.md`

---

## Stack

- **Frontend:** Vite + React 19 + TypeScript (SPA)
- **State:** Zustand with `persist` (`synthos-os-v2`), split into domain slices under `src/store/slices/`
- **Routing:** React Router (lazy-loaded surfaces in `src/App.tsx`)
- **Styling:** CSS variables in `src/index.css`, inline styles + a few CSS modules; Plus Jakarta Sans
- **PWA:** vite-plugin-pwa + Workbox (`src/sw.ts`)
- **Backend (optional):** Supabase (Postgres, Storage, Auth) via `src/data/repo.ts`
- **Push (local dev):** Express server in `server/index.mjs` (not deployed to Vercel yet)
- **Deploy:** Vercel (`vercel.json`), auto-deploy on push to `main`

---

## Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm run dev:all      # dev + local push server (port 4000)
npm run build        # tsc -b && vite build
npm test             # vitest
npm run lint         # oxlint
npm run icons        # regenerate PWA icons from assets-src/app-icon.png
```

---

## Repo layout

```
src/
  surfaces/          # Page-level views (Projects, Tasks, Team, …)
  components/        # Shared UI (Shell, modals, SearchBar, …)
  store/
    slices/          # ui, profiles, data, tasks, vault, chat, team, content, intake
    types.ts         # StoreState contract
    useStore.ts      # Combines slices + persist config
  data/
    repo.ts          # Supabase/local data seam — components never import supabase directly
    seed.ts          # Team roster (USERS), empty workspace seed, system channels
  lib/               # Utilities (time, format, profile, push, board, …)
  sw.ts              # Service worker (precache, offline nav, font cache, push handlers)
server/              # Local Web Push API (dev only)
supabase/            # schema.sql + setup README
docs/
  HANDOFF.md         # Production roadmap + Cursor → Claude Code context
  screenshots/       # README images
```

---

## Architecture

**Local-first by default.** Without `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`, the app runs on localStorage + IndexedDB. Login is simulated (`src/lib/useAuth.ts` — any email/password works). Each browser is an isolated sandbox.

**Shared mode:** Set env vars → `repo.ts` reads/writes Supabase. Auth uses Supabase password login. `Shell.tsx` maps session email to a builder slot via `profiles` in the store.

**What syncs today (via repo):** projects, tasks, vault keys, activity, wins, project files.  
**What does NOT sync yet:** team chat (`teamMsgs`, `conversations`), content pipeline, user profiles/prefs in the store. These are localStorage-only.

**Realtime:** Not implemented. `hydrate()` runs once on load; no Supabase Realtime subscriptions.

---

## Team roster

Hardcoded in `src/data/seed.ts` as `USERS` (ids 0, 1, 2):

| ID | Name | Default email |
|----|------|---------------|
| 0 | Josh Waldron | josh@synthos.dev |
| 1 | Sadeq Wahab | sadeq@synthos.dev |
| 2 | Aqeel Bacchus | aqeel@synthos.dev |

Profiles (name, username, avatar, status, github, bio) are editable in Settings and persist per-browser.

---

## Design system

- **Palette:** Cloud `#F6F8FA` bg, Midnight `#0B0F19` ink, pastel status dots only (sky/mint/blush/lav)
- **Typography:** Plus Jakarta Sans, lowercase page headings, numbered `Eyebrow` sections matching sidebar order
- **Links:** `↗` reserved for external navigation only; primary actions use `✦` or icons
- **Mobile:** breakpoint `760px` (`useIsMobile`), bottom tabs, slide drawer, bottom-sheet modals, stacked collapsible kanban lanes
- **Tokens:** CSS vars in `src/index.css` (`--sky-dot`, `--danger`, `--mention`, etc.)

---

## Conventions (follow these)

1. **Minimize scope** — small, focused diffs; match existing patterns in surrounding code
2. **No mock data** — workspace seeds empty; only system channels (#general, #builds, #clients) exist
3. **Repo pattern** — all backend access through `src/data/repo.ts`, never direct Supabase in components
4. **Store slices** — add actions to the appropriate slice in `src/store/slices/`, extend `StoreState` in `types.ts`
5. **Commits** — only when explicitly asked; never force-push main
6. **Debounced writes** — use `useDraft` for fields that persist to the store (avoid per-keystroke serialization)
7. **Deletes** — use `ConfirmDialog`, not `window.confirm`
8. **Timestamps** — new records use `at: number` (epoch ms); `timeAgo()` / `whenLabel()` in `src/lib/time.ts`

---

## Environment

Copy `.env.example` → `.env.local`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Vercel production env vars must be set separately (`vercel env pull` or dashboard).

Local push server data (`server/.data/`, includes VAPID private key) is gitignored.

---

## Known production gaps (priority order)

Read `docs/HANDOFF.md` for the full audit. Top blockers:

1. **Wire Supabase for real** — provision project, run `supabase/schema.sql`, create auth users, set Vercel env vars, disable local auth bypass in production builds
2. **Fix activity schema drift** — app writes `at` (number) but schema has `"time" text`; all repo writes silently `.catch(() => {})`
3. **Sync chat + content + profiles** — add tables, extend repo, add Realtime subscriptions
4. **ErrorBoundary + CI** — no error containment; no GitHub Actions workflow
5. **Push via Vercel serverless** — local Express push server doesn't run in production
6. **Vault encryption** — secrets are plaintext in Postgres (acceptable for trusted 3-person team short-term)

---

## Recent work (main @ f9a3366)

Four commits after the team-chat feature set:

- `b7f6026` — image compression, real timestamps, offline SW nav, a11y baseline
- `6e2bebe` — blur-commit edits, ConfirmDialog deletes, live open counts, unassigned tasks
- `12cdd3e` — route code-splitting, lazy Supabase client, store slices, type tightening, brand sweep
- `f9a3366` — mobile full-height chat, URL-synced project tabs with counts, empty states, search→vault highlight

Initial bundle dropped from ~619 kB to ~276 kB via lazy routes.

---

## Suggested first task in Claude Code

> Read CLAUDE.md and docs/HANDOFF.md. Priority: wire Supabase for real team use — provision schema, fix activity column drift, set production auth (no local bypass), add visible sync errors. Propose a step-by-step plan before changing code.
