-- TMOS schema — matches docs/PROJECT_CONTEXT.md and the confirmed build spec.
--
-- Single-user app, but every table is RLS-scoped to auth.uid() (project
-- convention). Weekly aggregates are computed views, not stored summary
-- tables. Vocabulary fields (stress_trend, decision_quality, setup, system,
-- lapse types, attitudes) are plain text so the user can evolve their own
-- vocabulary; the app supplies options from the tags table and code defaults.

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
-- day_records: one row per calendar day, filled by the Morning Check-In and
-- Evening Check-In. Evening numeric fields are user-reviewable values that
-- the app pre-fills from the trade log but never forces.
-- ---------------------------------------------------------------------------

create table public.day_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  traded boolean not null default false,

  -- Morning fields
  planned_risk_per_trade numeric,
  max_daily_risk numeric,
  max_trades_planned integer,
  stress_before integer check (stress_before between 0 and 10),
  energy_before integer check (energy_before between 0 and 10),
  conditions_acceptable boolean,
  winning_attitude_focus text,
  losing_attitude_watch text,
  discipline_checklist jsonb,
  decision_sequence text,
  decision_commitment boolean,
  morning_completed_at timestamptz,

  -- Evening fields
  stress_after integer check (stress_after between 0 and 10),
  stress_trend text,
  num_trades integer not null default 0,
  total_r_today numeric,
  plan_compliant_trades integer not null default 0,
  mistakes_count integer not null default 0,
  discipline_lapses_count integer not null default 0,
  top_lapse_type text,
  losing_attitudes_observed text[],
  winning_attitudes_applied text[],
  decision_quality text,
  worst_decision_note text,
  best_catch_note text,
  tomorrow_adjustment text,
  evening_completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create index day_records_user_date on public.day_records (user_id, date desc);

alter table public.day_records enable row level security;

create policy "Own day records" on public.day_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger day_records_updated_at
  before update on public.day_records
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- trades: manually entered. r_result is always a user-reviewable value —
-- the app shows a suggested R for simple trades and requires manual entry
-- when is_complex_trade is true. Nothing here is auto-recomputed.
-- ---------------------------------------------------------------------------

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day_record_id uuid references public.day_records (id) on delete set null,
  date date not null,
  ticker text not null,
  direction text not null check (direction in ('long', 'short')),
  setup text,
  system text,
  entry_price numeric not null check (entry_price > 0),
  stop_price numeric not null check (stop_price > 0),
  exit_price numeric check (exit_price > 0),
  quantity numeric not null check (quantity > 0),
  risk_amount_gbp numeric not null check (risk_amount_gbp > 0),
  r_result numeric,
  is_complex_trade boolean not null default false,
  position_size numeric,
  trade_type text not null check (trade_type in ('shadow', 'live_small', 'live_full')),
  status text not null check (status in ('open', 'closed')),
  plan_compliant boolean not null default true,
  mistake boolean not null default false,
  discipline_lapse boolean not null default false,
  lapse_type text,
  losing_attitude_present boolean not null default false,
  attitude_tag text,
  winning_attitude_applied text,
  decision_quality text,
  stress_before_trade integer check (stress_before_trade between 0 and 10),
  stress_after_trade integer check (stress_after_trade between 0 and 10),
  screenshot_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trades_user_date on public.trades (user_id, date desc);
create index trades_user_status on public.trades (user_id, status);

alter table public.trades enable row level security;

create policy "Own trades" on public.trades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger trades_updated_at
  before update on public.trades
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- tags: user-editable vocabulary powering dropdown suggestions
-- ---------------------------------------------------------------------------

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null check (category in
    ('winning_attitude', 'losing_attitude', 'setup', 'system', 'lapse_type')),
  label text not null,
  created_at timestamptz not null default now(),
  unique (user_id, category, label)
);

alter table public.tags enable row level security;

create policy "Own tags" on public.tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- weekly_reflections: one per week (Monday-start), from the Weekly Review
-- ---------------------------------------------------------------------------

create table public.weekly_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start_date date not null,
  went_well text,
  what_broke_down text,
  improvement_risk text,
  improvement_stress text,
  improvement_attitude_discipline text,
  improvement_decision_process text,
  rules_to_adjust text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start_date)
);

alter table public.weekly_reflections enable row level security;

create policy "Own weekly reflections" on public.weekly_reflections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger weekly_reflections_updated_at
  before update on public.weekly_reflections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- coaching_sessions: log of every coaching interaction (mock or real model)
-- so past sessions can be reviewed in the app
-- ---------------------------------------------------------------------------

create table public.coaching_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  workflow text not null check (workflow in
    ('morning_coach', 'pre_trade_review', 'evening_debrief',
     'trade_analyst', 'weekly_review')),
  input_payload jsonb not null,
  response text not null,
  model text not null, -- records "mock" or the actual model id used
  created_at timestamptz not null default now()
);

create index coaching_sessions_user_created
  on public.coaching_sessions (user_id, created_at desc);

alter table public.coaching_sessions enable row level security;

create policy "Own coaching sessions" on public.coaching_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Weekly aggregate views (computed, not cached — project convention).
-- security_invoker so RLS on the underlying tables applies to the caller.
-- Weeks start Monday (date_trunc('week', ...) is ISO / Monday-based).
-- ---------------------------------------------------------------------------

create view public.weekly_day_summary
  with (security_invoker = true) as
select
  user_id,
  date_trunc('week', date)::date as week_start,
  count(*) as day_count,
  count(*) filter (where traded) as traded_days,
  round(avg(stress_before), 2) as avg_stress_before,
  round(avg(stress_after), 2) as avg_stress_after,
  sum(num_trades) as total_trades,
  sum(total_r_today) as total_r,
  sum(plan_compliant_trades) as plan_compliant_trades,
  sum(mistakes_count) as mistakes,
  sum(discipline_lapses_count) as discipline_lapses
from public.day_records
group by user_id, date_trunc('week', date);

create view public.weekly_trade_summary
  with (security_invoker = true) as
select
  user_id,
  date_trunc('week', date)::date as week_start,
  count(*) as trade_count,
  count(*) filter (where status = 'closed') as closed_count,
  count(*) filter (where status = 'closed' and r_result > 0) as winners,
  count(*) filter (where status = 'closed' and r_result < 0) as losers,
  count(*) filter (where plan_compliant) as plan_compliant_count,
  count(*) filter (where mistake) as mistake_count,
  count(*) filter (where discipline_lapse) as lapse_count,
  round(sum(r_result) filter (where status = 'closed'), 2) as total_r,
  round(avg(r_result) filter (where status = 'closed'), 2) as avg_r
from public.trades
group by user_id, date_trunc('week', date);

-- ---------------------------------------------------------------------------
-- Seed defaults
--
-- NOTE: every value inserted by seed_defaults() is a PLACEHOLDER STARTING
-- POINT — editable, not authoritative source material. Review and replace
-- these with your own vocabulary. The function runs as the signed-in user
-- (RLS applies) and is a no-op once the user has any tags, so edits and
-- deletions are never re-seeded. The app calls it on first use; it can also
-- be run manually:  select public.seed_defaults();
-- ---------------------------------------------------------------------------

create or replace function public.seed_defaults()
returns void
language plpgsql
as $$
begin
  if exists (select 1 from public.tags where user_id = auth.uid()) then
    return;
  end if;

  insert into public.tags (category, label) values
    -- Placeholder starting points, editable, not authoritative:
    ('winning_attitude', 'Patient — wait for the setup'),
    ('winning_attitude', 'Process over outcome'),
    ('winning_attitude', 'Risk first, always'),
    ('winning_attitude', 'One good trade at a time'),
    ('winning_attitude', 'Losses are business costs'),
    ('losing_attitude', 'FOMO'),
    ('losing_attitude', 'Revenge trading'),
    ('losing_attitude', 'Needing to be right'),
    ('losing_attitude', 'Outcome obsession'),
    ('losing_attitude', 'Overconfidence after wins'),
    ('setup', 'Pullback to 10MA'),
    ('setup', 'Pullback to 20MA'),
    ('setup', 'Inside-day breakout'),
    ('setup', 'Reversal bar at support'),
    ('system', 'Swing pullback v1'),
    ('lapse_type', 'Moved stop'),
    ('lapse_type', 'Oversized position'),
    ('lapse_type', 'Chased entry'),
    ('lapse_type', 'Early exit'),
    ('lapse_type', 'No 3R path'),
    ('lapse_type', 'Traded near earnings'),
    ('lapse_type', 'Traded in poor mental state');
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for trade screenshots, paths namespaced by user id
-- ({user_id}/{trade_id}/{filename}); files are served via signed URLs.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('trade-screenshots', 'trade-screenshots', false)
on conflict (id) do nothing;

create policy "Own screenshots select" on storage.objects
  for select using (
    bucket_id = 'trade-screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Own screenshots insert" on storage.objects
  for insert with check (
    bucket_id = 'trade-screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Own screenshots update" on storage.objects
  for update using (
    bucket_id = 'trade-screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Own screenshots delete" on storage.objects
  for delete using (
    bucket_id = 'trade-screenshots'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
