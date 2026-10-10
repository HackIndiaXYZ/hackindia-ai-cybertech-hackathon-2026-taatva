-- TAATVA Obsidian - database setup.
-- Paste ALL of this into Supabase: SQL Editor -> New query -> Run. Safe to run again.
--
-- One table, "scans": one row per scanned file. Results only, never the file.
-- Row level security (RLS): each person can only see their OWN scans.
-- Only the backend can add scans. People can only change the decision
-- (approve / reject) on their own Quarantine files that are still waiting.

create table if not exists public.scans (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,  -- who scanned
  user_email        text,
  file_name         text not null,
  file_type         text not null default 'pdf',
  score             integer not null check (score between 0 and 100),
  verdict           text not null check (verdict in ('pass', 'flag', 'quarantine')),
  reasons           jsonb not null default '[]',
  findings          jsonb not null default '[]',
  worst_finding     text,
  pages             jsonb not null default '[]',   -- page sizes only, for drawing red boxes
  timings           jsonb not null default '{}',
  total_time        real,
  witness_agreement integer,
  private_mode      boolean not null default false,
  decision          text not null default 'sent'
                      check (decision in ('waiting', 'sent', 'approved', 'rejected')),
  decided_at        timestamptz,
  decided_by        text,
  scanned_at        timestamptz not null default now()   -- the date
);

create index if not exists scans_user_date on public.scans (user_id, scanned_at desc);

-- Turn on row level security
alter table public.scans enable row level security;

-- Nobody gets anything unless a rule below allows it
revoke all on public.scans from anon, authenticated;
grant select on public.scans to authenticated;
-- People may only ever change the decision column (nothing else)
grant update (decision) on public.scans to authenticated;

-- Rule 1: you can see only your own scans
drop policy if exists "see own scans" on public.scans;
create policy "see own scans" on public.scans
  for select to authenticated
  using (user_id = auth.uid());

-- Rule 2: you can approve / reject only your own Quarantine files that are still waiting
drop policy if exists "decide own quarantine" on public.scans;
create policy "decide own quarantine" on public.scans
  for update to authenticated
  using (user_id = auth.uid() and verdict = 'quarantine' and decision = 'waiting')
  with check (user_id = auth.uid() and decision in ('approved', 'rejected'));

-- No insert or delete rules: only the backend (service_role key) can add scans.

-- Fill in when and by whom the decision was made (people cannot fake this)
create or replace function public.stamp_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.decision is distinct from old.decision then
    new.decided_at := now();
    new.decided_by := coalesce(auth.jwt() ->> 'email', 'unknown');
  end if;
  return new;
end;
$$;

drop trigger if exists stamp_decision on public.scans;
create trigger stamp_decision
  before update on public.scans
  for each row execute function public.stamp_decision();
