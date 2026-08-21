-- TMOS demo data — FOR UAT / EVALUATION ONLY
--
-- NOT a migration. This file lives outside supabase/migrations/ deliberately
-- so the GitHub integration never applies it automatically. Run it by hand,
-- from the Supabase SQL editor, only when you want sample data to click
-- around in.
--
-- It generates 62 days of history ending today: around 58 trades across three
-- setups and all three trade types, with matching morning and evening
-- check-ins and two weekly reflections. That is enough to populate every
-- report, including the rolling 20-trade expectancy, which needs 20 closed
-- trades before it will draw anything. Today's trade is left OPEN so you can
-- see how open positions are excluded from the measured statistics.
--
-- HOW TO RUN
--   1. Find your user id: Authentication → Users → click your user → "UID".
--   2. Replace the uuid on the `demo_user` line below.
--   3. Run the whole file.
--
-- HOW TO REMOVE IT AGAIN
--   Run supabase/demo-data-clear.sql with the same uuid. It deletes rows in
--   this date window only, so anything you logged outside those 9 weeks is
--   left alone. If you have logged real trades inside the window, remove
--   them by hand instead.
--
-- The numbers are synthetic and deliberately unremarkable — roughly a 40% win
-- rate and an expectancy near +0.1R, with one setup that genuinely loses money
-- and a cluster of flagged mistakes. That shape is the point: it exercises the
-- discipline and weak-setup views, and it is not a highlight reel.

do $$
declare
  demo_user uuid := 'adcf1596-fa0c-4096-9ece-4acc9d029b9b';  -- <<< PASTE YOUR USER ID
  start_date date := current_date - interval '62 days';
  d date;
  i int := 0;
  r numeric;
  loss_rate numeric;
  win_floor numeric;
  win_range numeric;
  setup_name text;
  sys_name text := 'Swing pullback v1';
  ttype text;
  is_mistake boolean;
  lapse text;
  entry numeric;
  stop numeric;
  exitp numeric;
  qty numeric;
  risk numeric;
  day_id uuid;
  trades_today int;
  total_r numeric;
  compliant int;
  mistakes int;
  lapses int;
begin
  -- Checking the user actually exists catches both the untouched placeholder
  -- and a mistyped id, and does not depend on the placeholder's literal value
  -- surviving a find-and-replace.
  if not exists (select 1 from auth.users where id = demo_user) then
    raise exception
      'No auth user with id %. Set demo_user to your own id from Authentication -> Users -> UID.', demo_user;
  end if;

  -- Deterministic, so re-running gives the same dataset.
  perform setseed(0.42);

  d := start_date;
  while d <= current_date loop
    -- Weekdays only; skip roughly one day in six as a no-trade day.
    if extract(isodow from d) <= 5 then
      trades_today := 0;
      total_r := 0;
      compliant := 0;
      mistakes := 0;
      lapses := 0;

      insert into public.day_records (
        user_id, date, traded,
        planned_risk_per_trade, max_daily_risk, max_trades_planned,
        stress_before, energy_before, conditions_acceptable,
        winning_attitude_focus, losing_attitude_watch,
        discipline_checklist, decision_sequence, decision_commitment,
        morning_completed_at
      ) values (
        demo_user, d, false,
        0.25, 1.0, 2,
        2 + (random() * 5)::int,
        5 + (random() * 4)::int,
        random() > 0.15,
        (array['Patient — wait for the setup','Process over outcome','Risk first, always'])[1 + floor(random()*3)],
        (array['FOMO','Revenge trading','Needing to be right'])[1 + floor(random()*3)],
        '[{"id":"item-1","label":"Reviewed the economic calendar and overnight news","checked":true},
          {"id":"item-2","label":"Confirmed no earnings within 5 trading days on my watchlist","checked":true},
          {"id":"item-3","label":"Marked support/resistance and checked plausible 3R paths","checked":true},
          {"id":"item-4","label":"Confirmed trend filters on candidate setups","checked":true},
          {"id":"item-5","label":"Set max daily risk and per-trade risk before the open","checked":true},
          {"id":"item-6","label":"Yesterday''s trades fully journaled — no open loops","checked":false}]'::jsonb,
        'Trend filter → setup quality → 3R path → size → no-trade filters → enter',
        true,
        d + time '07:15'
      )
      on conflict (user_id, date) do nothing
      returning id into day_id;

      -- 0–2 trades per day.
      for j in 1..(random() * 2.4)::int loop
        i := i + 1;
        -- floor(), not ::int — a cast rounds, which halves the weight of the
        -- first and last element of every array picked this way.
        setup_name := (array['Pullback to 10MA','Pullback to 20MA','Inside-day breakout'])[1 + floor(random()*3)];
        ttype := (array['shadow','shadow','live_small','live_full'])[1 + floor(random()*4)];

        -- Realistic R distribution rather than a flattering one: more losers
        -- than winners, most losses stopping out at exactly -1R, and winners
        -- fewer but larger. Net expectancy lands modestly positive — the shape
        -- a developing trader should expect, not a highlight reel.
        -- "Inside-day breakout" is deliberately the losing setup so the
        -- performance-by-setup report has something real to show.
        -- A weak setup loses more often AND wins smaller, so it stays
        -- negative rather than depending on sampling luck.
        if setup_name = 'Inside-day breakout' then
          loss_rate := 0.78; win_floor := 0.8; win_range := 0.9;
        else
          loss_rate := 0.62; win_floor := 1.0; win_range := 1.8;
        end if;

        if random() < loss_rate then
          -- Most stops are hit cleanly at -1R; occasionally cut early, or
          -- slipped through on a fast move.
          r := (array[-1.0, -1.0, -1.0, -1.0, -0.5, -1.3])[1 + floor(random() * 6)];
        else
          r := round((win_floor + random() * win_range)::numeric, 2);
        end if;

        -- Around one trade in six is a mistake, and mistakes cluster on losses.
        is_mistake := (r < 0 and random() < 0.3) or (r > 0 and random() < 0.05);
        lapse := case when is_mistake
          then (array['Moved stop','Chased entry','Early exit','Oversized position'])[1 + floor(random()*4)]
          else null end;

        entry := round((80 + random() * 400)::numeric, 2);
        stop := round((entry * (1 - (0.015 + random() * 0.02)))::numeric, 2);
        qty := (10 + random() * 60)::int;
        risk := round(((entry - stop) * qty)::numeric, 2);
        exitp := round((entry + (entry - stop) * r)::numeric, 2);

        insert into public.trades (
          user_id, day_record_id, date, ticker, direction, setup, system,
          entry_price, stop_price, exit_price, quantity, risk_amount_gbp,
          r_result, is_complex_trade, trade_type, status,
          plan_compliant, mistake, discipline_lapse, lapse_type,
          losing_attitude_present, attitude_tag, winning_attitude_applied,
          decision_quality, stress_before_trade, stress_after_trade, notes
        ) values (
          demo_user, day_id, d,
          (array['AAPL','MSFT','NVDA','SPY','QQQ','COST','AMD','GOOGL'])[1 + floor(random()*8)],
          'long', setup_name, sys_name,
          entry, stop,
          case when d = current_date then null else exitp end,
          qty, risk,
          case when d = current_date then null else r end,
          false, ttype,
          case when d = current_date then 'open' else 'closed' end,
          not is_mistake, is_mistake, is_mistake, lapse,
          is_mistake, case when is_mistake then 'FOMO' else null end,
          case when not is_mistake then 'Patient — wait for the setup' else null end,
          case when is_mistake then 'poor' when r > 0 then 'good' else 'mixed' end,
          2 + (random() * 4)::int, 3 + (random() * 5)::int,
          'Demo data — generated for UAT, safe to delete.'
        );

        trades_today := trades_today + 1;
        if d <> current_date then total_r := total_r + r; end if;
        if not is_mistake then compliant := compliant + 1; end if;
        if is_mistake then mistakes := mistakes + 1; lapses := lapses + 1; end if;
      end loop;

      -- Evening check-in reflecting the day that was generated.
      update public.day_records set
        traded = trades_today > 0,
        stress_after = least(10, greatest(0, stress_before + case when total_r < 0 then 2 else -1 end)),
        stress_trend = case when total_r < 0 then 'worse' when total_r > 0 then 'improved' else 'stable' end,
        num_trades = trades_today,
        total_r_today = case when trades_today > 0 then round(total_r, 2) else null end,
        plan_compliant_trades = compliant,
        mistakes_count = mistakes,
        discipline_lapses_count = lapses,
        top_lapse_type = case when lapses > 0 then 'Moved stop' else null end,
        losing_attitudes_observed = case when mistakes > 0 then array['FOMO'] else array[]::text[] end,
        winning_attitudes_applied = case when compliant > 0 then array['Patient — wait for the setup'] else array[]::text[] end,
        decision_quality = case when mistakes > 0 then 'poor' when total_r > 0 then 'good' else 'mixed' end,
        worst_decision_note = case when mistakes > 0 then 'Took a setup outside the plan after an early loss.' else null end,
        best_catch_note = case when compliant > 0 then 'Stood aside on a gap that broke the entry rule.' else null end,
        tomorrow_adjustment = case when mistakes > 0 then 'No new positions after two losses in a session.' else 'Same process, same size.' end,
        evening_completed_at = d + time '20:30'
      where user_id = demo_user and date = d;
    end if;

    d := d + 1;
  end loop;

  -- A couple of weekly reflections so the Weekly Review has saved text.
  insert into public.weekly_reflections (
    user_id, week_start_date, went_well, what_broke_down,
    improvement_risk, improvement_stress,
    improvement_attitude_discipline, improvement_decision_process,
    rules_to_adjust
  )
  select
    demo_user,
    date_trunc('week', current_date - (n * interval '7 days'))::date,
    'Sizing stayed inside the plan every day. No position exceeded 0.5%.',
    'Two entries taken after the first loss of the session — both were mistakes.',
    'Cap new risk at 0.5% once the day is red.',
    'Walk away for ten minutes after any loss before looking at the screen again.',
    'Name the losing attitude out loud before entering, not after.',
    'Write the 3R path down before the entry, not from memory afterwards.',
    'Add an explicit rule: no third trade in a session, regardless of setup quality.'
  from generate_series(1, 2) as n
  on conflict (user_id, week_start_date) do nothing;

  raise notice 'Demo data created: % trades across % days ending today.', i, (current_date - start_date::date);
end;
$$;
