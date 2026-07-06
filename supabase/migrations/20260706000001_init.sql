-- TMOS initial schema
--
-- Single-user app, but every table is still scoped to auth.uid() via RLS
-- (project convention). Weekly aggregates are computed views, not stored
-- summary tables.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Daily check-ins: one row per day scoring the five pillars 1–10
-- ---------------------------------------------------------------------------

create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  checkin_date date not null default current_date,
  risk_score smallint not null check (risk_score between 1 and 10),
  stress_score smallint not null check (stress_score between 1 and 10),
  attitude_score smallint not null check (attitude_score between 1 and 10),
  discipline_score smallint not null check (discipline_score between 1 and 10),
  process_score smallint not null check (process_score between 1 and 10),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

alter table public.daily_checkins enable row level security;

create policy "Own check-ins" on public.daily_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger daily_checkins_updated_at
  before update on public.daily_checkins
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Trades: manually entered; R-multiple is an app-suggested value the user
-- can always override, so it is stored as a plain editable column
-- ---------------------------------------------------------------------------

create type public.trade_direction as enum ('long', 'short');

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  symbol text not null,
  direction public.trade_direction not null,
  quantity numeric(18,6) not null check (quantity > 0),
  entry_price numeric(18,6) not null check (entry_price > 0),
  exit_price numeric(18,6) check (exit_price > 0),
  initial_stop numeric(18,6) check (initial_stop > 0),
  target_price numeric(18,6) check (target_price > 0),
  fees numeric(18,6) not null default 0,
  entered_at timestamptz not null,
  exited_at timestamptz,
  -- Suggested by the app from entry/stop/exit; user-editable, never
  -- silently recomputed once set.
  r_multiple numeric(10,2),
  setup text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trades_user_entered_at on public.trades (user_id, entered_at desc);

alter table public.trades enable row level security;

create policy "Own trades" on public.trades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trades_updated_at
  before update on public.trades
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Tags (for trades)
-- ---------------------------------------------------------------------------

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.tags enable row level security;

create policy "Own tags" on public.tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.trade_tags (
  trade_id uuid not null references public.trades (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  primary key (trade_id, tag_id)
);

alter table public.trade_tags enable row level security;

create policy "Own trade tags" on public.trade_tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Pre-market checklist
-- ---------------------------------------------------------------------------

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.checklist_items enable row level security;

create policy "Own checklist items" on public.checklist_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.checklist_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid not null references public.checklist_items (id) on delete cascade,
  completion_date date not null default current_date,
  completed_at timestamptz not null default now(),
  unique (user_id, item_id, completion_date)
);

alter table public.checklist_completions enable row level security;

create policy "Own checklist completions" on public.checklist_completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Seed defaults
--
-- NOTE: everything inserted by seed_defaults() below is an EDITABLE STARTING
-- POINT, not authoritative — review and replace these tags and checklist
-- items with your own. The function runs as the signed-in user (RLS applies)
-- and is a no-op once the user has any tags or checklist items, so edits
-- and deletions are never re-seeded. Call it once after first sign-in:
--   select public.seed_defaults();
-- ---------------------------------------------------------------------------

create or replace function public.seed_defaults()
returns void
language plpgsql
as $$
begin
  if not exists (select 1 from public.tags where user_id = auth.uid()) then
    insert into public.tags (name) values
      -- Editable starting points, not authoritative:
      ('breakout'),
      ('pullback'),
      ('reversal'),
      ('news'),
      ('fomo'),
      ('revenge-trade'),
      ('plan-followed');
  end if;

  if not exists (select 1 from public.checklist_items where user_id = auth.uid()) then
    insert into public.checklist_items (label, sort_order) values
      -- Editable starting points, not authoritative:
      ('Reviewed overnight news and the economic calendar', 1),
      ('Defined max loss for the day', 2),
      ('Marked key levels on my watchlist', 3),
      ('Rated my mental state honestly (check-in done)', 4),
      ('Committed to my position-sizing rules', 5),
      ('No open loops: yesterday''s trades journaled', 6);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Weekly aggregate views (computed, not cached — project convention)
-- security_invoker so RLS on the underlying tables applies to the caller
-- ---------------------------------------------------------------------------

create view public.weekly_checkin_averages
  with (security_invoker = true) as
select
  user_id,
  date_trunc('week', checkin_date)::date as week_start,
  round(avg(risk_score), 2) as risk_avg,
  round(avg(stress_score), 2) as stress_avg,
  round(avg(attitude_score), 2) as attitude_avg,
  round(avg(discipline_score), 2) as discipline_avg,
  round(avg(process_score), 2) as process_avg,
  round(avg((risk_score + stress_score + attitude_score
             + discipline_score + process_score) / 5.0), 2) as composite_avg,
  count(*) as checkin_count
from public.daily_checkins
group by user_id, date_trunc('week', checkin_date);

create view public.weekly_trade_stats
  with (security_invoker = true) as
select
  user_id,
  date_trunc('week', coalesce(exited_at, entered_at))::date as week_start,
  count(*) as trade_count,
  count(*) filter (where r_multiple > 0) as winning_trades,
  count(*) filter (where r_multiple < 0) as losing_trades,
  round(avg(r_multiple), 2) as avg_r,
  round(sum(r_multiple), 2) as total_r
from public.trades
group by user_id, date_trunc('week', coalesce(exited_at, entered_at));
