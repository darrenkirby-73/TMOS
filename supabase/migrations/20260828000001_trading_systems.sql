-- ---------------------------------------------------------------------------
-- Trading systems: what a system actually IS, not just its name.
--
-- Trades already carry a free-text `system` label, and the `tags` table holds
-- the vocabulary of names. Neither says what the system's rules are, so
-- "Swing pullback v1" appears in reports without anywhere to read or revise
-- its definition. This table is that missing record.
--
-- Deliberately NOT a foreign key from trades. Trades store the system as text
-- so a trade can be logged with a name that has no definition yet, and so
-- renaming or retiring a definition can never rewrite trade history. The name
-- is the join, and the app treats a missing definition as missing rather than
-- an error.
-- ---------------------------------------------------------------------------

create table if not exists public.trading_systems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  -- 'testing' matters here: a system being traded at shadow or small size is
  -- a different thing from one you have committed capital to.
  status text not null default 'active'
    check (status in ('active', 'testing', 'retired')),
  markets text,
  timeframe text,
  entry_rules text,
  exit_rules text,
  stop_rules text,
  position_sizing text,
  edge_rationale text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.trading_systems enable row level security;

drop policy if exists "Own trading systems" on public.trading_systems;
create policy "Own trading systems" on public.trading_systems
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists trading_systems_user_name_idx
  on public.trading_systems (user_id, name);

drop trigger if exists trading_systems_updated_at on public.trading_systems;
create trigger trading_systems_updated_at
  before update on public.trading_systems
  for each row execute function public.set_updated_at();
