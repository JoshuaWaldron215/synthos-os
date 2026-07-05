-- Synthos OS — Supabase schema
-- Run in the Supabase SQL editor (or `supabase db push`) to provision the
-- shared backend. Designed for a small, trusted team: any authenticated
-- member can read/write. Tighten the policies if you add external users.

-- ---------------------------------------------------------------------------
-- profiles (mirrors the in-app builders; linked to auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  builder_id int,                       -- maps to the app's 0/1/2 builder slot
  name text not null default '',
  role text not null default '',
  email text,
  avatar_url text,
  status text default 'online',
  username text,
  github text,
  bio text,
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_builder_id_key
  on public.profiles (builder_id) where builder_id is not null;

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id text primary key,
  client text not null,
  tagline text default '',
  description text default '',
  status text not null default 'in progress',
  health text not null default 'sky',
  "open" int not null default 0,
  builders jsonb not null default '[]',
  rev text default '',
  earned text default '',
  stack jsonb not null default '[]',
  links jsonb not null default '[]',
  image_url text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
create table if not exists public.tasks (
  id text primary key,
  title text not null,
  col text not null default 'build',
  who int not null default 0,
  pri text not null default 'med',
  blocked boolean not null default false,
  proj text references public.projects (id) on delete set null,
  notes text default '',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- vault_keys
-- ---------------------------------------------------------------------------
create table if not exists public.vault_keys (
  id text primary key,
  label text not null,
  val text not null,
  proj text not null default 'shared',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- activity (audit log)
-- `at` is epoch ms, written by the app (src/store/slices/data.ts). The legacy
-- `"time" text` column was dropped — it caused inserts to fail silently after
-- the timestamp refactor. `time?` is still accepted on the model for any
-- entries persisted locally before the switch.
-- ---------------------------------------------------------------------------
create table if not exists public.activity (
  id text primary key,
  who int not null default 0,
  action text not null,
  target text not null default '',
  at bigint,
  proj text not null default 'shared',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- wins
-- ---------------------------------------------------------------------------
create table if not exists public.wins (
  id text primary key,
  who int not null default 0,
  title text not null,
  tag text default '',
  amount text default '',
  proj text references public.projects (id) on delete set null,
  note text default '',
  created_at bigint not null
);

-- ---------------------------------------------------------------------------
-- project_files (metadata; blobs live in Storage)
-- ---------------------------------------------------------------------------
create table if not exists public.project_files (
  id text primary key,
  proj text references public.projects (id) on delete cascade,
  name text not null,
  kind text default '',
  size bigint not null default 0,
  path text not null,
  who int not null default 0,
  created_at bigint not null
);

-- ---------------------------------------------------------------------------
-- conversations (channels / group chats / project chats)
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id text primary key,
  type text not null default 'channel',
  name text not null,
  proj text,
  members jsonb not null default '[]',
  guests jsonb not null default '[]',
  system boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- messages (attachments/reactions ride along as jsonb)
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id text primary key,
  convo text not null references public.conversations (id) on delete cascade,
  who int not null default 0,
  text text not null default '',
  at bigint,
  attachments jsonb,
  reactions jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_convo_at_idx on public.messages (convo, at);

-- ---------------------------------------------------------------------------
-- content_items (marketing pipeline kanban)
-- ---------------------------------------------------------------------------
create table if not exists public.content_items (
  id text primary key,
  lane text not null default 'idea',
  title text not null,
  kind text not null default 'post',
  who int not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- leads (outbound client CRM)
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id text primary key,
  name text not null,
  contact text default '',
  source text not null default 'outbound',
  quality text not null default 'warm',
  status text not null default 'new',
  notes text default '',
  last_follow_up bigint,
  next_follow_up bigint,
  who int not null default 0,
  created_at bigint not null
);

-- ---------------------------------------------------------------------------
-- push_subscriptions (Web Push; one row per browser endpoint, owned by a builder)
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  who int not null default 0,
  sub jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- seed system channels so every client agrees on their ids
-- ---------------------------------------------------------------------------
insert into public.conversations (id, type, name, members, guests, system) values
  ('general', 'channel', 'general', '[0,1,2]', '[]', true),
  ('builds',  'channel', 'builds',  '[0,1,2]', '[]', true),
  ('clients', 'channel', 'clients', '[0,1,2]', '[]', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security: any authenticated team member has full access
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.projects      enable row level security;
alter table public.tasks         enable row level security;
alter table public.vault_keys    enable row level security;
alter table public.activity      enable row level security;
alter table public.wins          enable row level security;
alter table public.project_files enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.content_items enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.leads         enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles','projects','tasks','vault_keys','activity','wins','project_files','conversations','messages','content_items','push_subscriptions','leads']
  loop
    execute format('drop policy if exists %I on public.%I;', t || '_team_rw', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true);',
      t || '_team_rw', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Realtime: publish every synced table so clients stay live (idempotent)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['projects','tasks','vault_keys','activity','wins','project_files','profiles','conversations','messages','content_items','leads']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage bucket for project files (private; access via signed URLs)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

create policy "project_files_team_rw"
  on storage.objects for all to authenticated
  using (bucket_id = 'project-files')
  with check (bucket_id = 'project-files');
