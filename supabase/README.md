# Synthos OS — Supabase backend

Synthos OS runs in two modes:

- **Local mode (default):** no credentials. All data lives in the browser
  (`localStorage` for rows, IndexedDB for file blobs). Login accepts any
  email + password. Great for development and demos — but data is per-browser,
  so teammates don't see each other's changes.
- **Shared mode:** add Supabase credentials and the whole team shares one
  source of truth (Postgres + Storage + Auth).

## Going live

1. Create a Supabase project.
2. Open the SQL editor and run [`schema.sql`](./schema.sql). This creates the
   tables, the private `project-files` storage bucket, and RLS policies.
3. Create your team members under **Authentication → Users** (email + password).
4. Copy `.env.example` to `.env.local` and fill in:

   ```
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```

5. Restart the dev server. The app now reads/writes Supabase and gates behind
   real logins.

## Known schema drift

The app's activity log now writes `at` (epoch ms) but `schema.sql` still defines
a `"time" text` column. Before going live, add:

```sql
alter table public.activity add column if not exists at bigint;
```

See `docs/HANDOFF.md` for the full production checklist.

## Security notes

- The anon key ships to the browser, so **RLS is the real gate.** The policies
  in `schema.sql` allow access only to `authenticated` users — never `anon`.
- The vault stores secrets in Postgres. That's acceptable for a small, trusted,
  authenticated team, but treat the project as sensitive: restrict who can sign
  in, and consider rotating keys that pass through it.
- The `project-files` bucket is **private**; files are served via short-lived
  signed URLs, not public links.
