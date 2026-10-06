-- ---------------------------------------------------------------------------
-- Position sizing: account equity over time, and the risk limits in force.
--
-- Equity is HISTORY, not a single current figure. Sizing a trade is only
-- defensible against the equity at the time it was taken, and a balance that
-- gets overwritten makes every past sizing decision unreviewable — which
-- defeats the point of recording them. One row per as-of date; the figure in
-- force on any date is the most recent row on or before it.
--
-- Risk limits are per-user and seeded from src/lib/risk-rules.ts. They live in
-- the database as well as in code because the user can change them here, and
-- the calculator must size against what the user actually set.
-- ---------------------------------------------------------------------------

create table if not exists public.account_equity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  as_of_date date not null,
  -- Account currency throughout (GBP). Must be positive: a zero or negative
  -- equity makes every percentage-of-equity calculation meaningless.
  amount numeric(14, 2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, as_of_date)
);

alter table public.account_equity enable row level security;

drop policy if exists "Own account equity" on public.account_equity;
create policy "Own account equity" on public.account_equity
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists account_equity_user_date_idx
  on public.account_equity (user_id, as_of_date desc);

drop trigger if exists account_equity_updated_at on public.account_equity;
create trigger account_equity_updated_at
  before update on public.account_equity
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table if not exists public.risk_settings (
  -- One row per user: the primary key IS the user.
  user_id uuid primary key default auth.uid()
    references auth.users (id) on delete cascade,
  per_trade_percent numeric(5, 3) not null default 1.0
    check (per_trade_percent > 0 and per_trade_percent <= 100),
  max_open_risk_percent numeric(5, 3) not null default 3.0
    check (max_open_risk_percent > 0 and max_open_risk_percent <= 100),
  max_new_daily_risk_percent numeric(5, 3) not null default 2.0
    check (max_new_daily_risk_percent > 0 and max_new_daily_risk_percent <= 100),
  -- A per-trade limit above the open cap would reject its own guidance.
  constraint risk_limits_coherent
    check (max_open_risk_percent >= per_trade_percent
           and max_new_daily_risk_percent >= per_trade_percent),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.risk_settings enable row level security;

drop policy if exists "Own risk settings" on public.risk_settings;
create policy "Own risk settings" on public.risk_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists risk_settings_updated_at on public.risk_settings;
create trigger risk_settings_updated_at
  before update on public.risk_settings
  for each row execute function public.set_updated_at();
