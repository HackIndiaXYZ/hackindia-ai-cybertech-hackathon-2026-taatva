-- TAATVA Obsidian - Attack Lab counter table.
-- Paste ALL of this into Supabase: SQL Editor -> New query -> Run. Safe to run again.
--
-- One row per Attack Lab try: trick, score, verdict, caught, time.
-- There is NO column for the sentence: it is never saved.
-- Only the backend (service_role key) can read or add rows. The website cannot.

create table if not exists public.lab_attempts (
  id          bigint generated always as identity primary key,
  trick       text not null check (trick in ('white', 'tiny', 'offpage', 'unknown')),
  score       integer not null check (score between 0 and 100),
  verdict     text not null check (verdict in ('pass', 'flag', 'quarantine')),
  caught      boolean not null,
  created_at  timestamptz not null default now()   -- the time
);

-- Row level security ON, and no rules = nobody but the backend gets in
alter table public.lab_attempts enable row level security;
revoke all on public.lab_attempts from anon, authenticated;
