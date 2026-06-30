-- ---------------------------------------------------------------------------
-- PSV Dashboard — Supabase setup
-- Run this once in your Supabase project: SQL Editor → New query → paste → Run.
-- It creates the single shared-state table, locks it to signed-in users, and
-- enables live (realtime) sync so everyone sees the same data instantly.
-- ---------------------------------------------------------------------------

create table if not exists public.app_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Only authenticated (signed-in) users may read or write the shared state.
drop policy if exists "authenticated read" on public.app_state;
create policy "authenticated read"
  on public.app_state for select
  to authenticated
  using (true);

drop policy if exists "authenticated insert" on public.app_state;
create policy "authenticated insert"
  on public.app_state for insert
  to authenticated
  with check (true);

drop policy if exists "authenticated update" on public.app_state;
create policy "authenticated update"
  on public.app_state for update
  to authenticated
  using (true)
  with check (true);

-- Enable realtime so edits broadcast live to everyone who is signed in.
alter publication supabase_realtime add table public.app_state;
