-- Remove TMOS demo data.
--
-- Deletes only rows inside the window demo-data.sql writes to (the last 62
-- days, ending today), for one user. Anything you logged outside that window
-- is untouched.
--
-- WARNING: if you have logged real trades or check-ins inside those 62 days,
-- this deletes them too. It cannot tell demo rows from real ones by date
-- alone. Trades created by the demo script carry the note "Demo data —
-- generated for UAT, safe to delete."; check the trade log first if you are
-- unsure, and delete by hand instead.
--
-- Coaching sessions are left alone — they are your own history, and the demo
-- script never creates any.
--
--   1. Replace the uuid below with your user id.
--   2. Run the whole file.

do $$
declare
  demo_user uuid := '00000000-0000-0000-0000-000000000000';  -- <<< PASTE YOUR USER ID
  window_start date := current_date - interval '62 days';
  n_trades int;
  n_days int;
  n_reflections int;
begin
  if not exists (select 1 from auth.users where id = demo_user) then
    raise exception
      'No auth user with id %. Set demo_user to your own id from Authentication -> Users -> UID.', demo_user;
  end if;

  delete from public.trades
   where user_id = demo_user and date >= window_start;
  get diagnostics n_trades = row_count;

  delete from public.day_records
   where user_id = demo_user and date >= window_start;
  get diagnostics n_days = row_count;

  delete from public.weekly_reflections
   where user_id = demo_user
     and week_start_date >= date_trunc('week', window_start)::date;
  get diagnostics n_reflections = row_count;

  raise notice 'Deleted % trades, % day records and % weekly reflections from % onwards.',
    n_trades, n_days, n_reflections, window_start;
end;
$$;
