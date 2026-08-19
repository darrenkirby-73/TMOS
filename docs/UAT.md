# TMOS — User acceptance testing

How to get TMOS running against your own Supabase project and what to check
before you trust it with real trades.

---

## 1. Get it running

### Database

The migration applies automatically when changes land on the branch Supabase
watches (Integrations → GitHub). After the first apply, confirm in the
dashboard:

- **Database → Tables** shows `day_records`, `trades`, `tags`,
  `weekly_reflections`, `coaching_sessions`.
- **Database → Migrations** lists `20260706000001_init`.
- **Storage** has a **private** bucket named `trade-screenshots`.

If the bucket is missing, the migration's storage block was skipped for
permissions — expected on hosted Supabase depending on the role used. It logs
`Could not create storage policies (must be owner of table objects)`. Create
the private bucket by hand and add four policies (select, insert, update,
delete), each with:

```
bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]
```

Screenshot upload is the only feature affected; everything else works without it.

### Your user

There is no sign-up flow — this is a single-user app. Create yourself under
**Authentication → Users → Add user** and note the UID.

### The app

Deploy to Vercel (or run locally with `npm run dev`) with these environment
variables:

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Project Settings → API |
| `ANTHROPIC_API_KEY` | no | Omit to run the coach in mock mode |

Without the Supabase variables the app still renders, showing a setup notice
on every page — useful for checking the deploy before wiring the database.

### Sample data (recommended)

Reports and the weekly review are hard to judge against an empty database,
and the rolling 20-trade expectancy needs 20 closed trades before it draws
anything. To load 62 days of synthetic history:

1. Open `supabase/demo-data.sql`, paste your UID into the `demo_user` line.
2. Run it in the SQL editor.

It creates ~58 trades, matching morning and evening check-ins, and two weekly
reflections. The numbers are deliberately mediocre — about a 40% win rate and
an expectancy near +0.1R, with one setup that genuinely loses money and a
cluster of flagged mistakes — so the discipline views have something to show.
Today's trade is left open so you can see how open positions are excluded.

Remove it later with `supabase/demo-data-clear.sql` (same UID). It deletes
rows in that 62-day window only — **including any real ones you logged in the
same period**, so clear it before you start logging for real.

---

## 2. What to test

Tick these off in order. Each is written as an observable outcome rather than
a click path.

### Access control

- [ ] Signed out, visiting `/trades` (or any page) redirects to `/login`.
- [ ] Signing in lands on the dashboard.
- [ ] Sign out returns you to `/login` and protected pages redirect again.

### Trade Log

- [ ] Logging a trade with entry 100, stop 98, quantity 50 shows a suggested
      risk of **£100**; clicking *use* fills the risk field.
- [ ] With exit 106 and risk £100, the R field offers a suggested **+3.00R**.
      It is *not* filled in until you click *use* — confirm nothing is written
      on your behalf.
- [ ] Type your own R over the suggestion, save, reopen: **your value is still
      there.** This is the rule that matters most — a calculated value must
      never overwrite a value you entered.
- [ ] Tick *Complex trade*: the suggestion disappears and R becomes required.
      Saving a closed complex trade without an R is rejected.
- [ ] A long with the stop *above* the entry is rejected, with the reason
      shown inline as you type.
- [ ] Every filter narrows the table: date range, ticker, setup, system, trade
      type, status, mistake, discipline lapse. The summary tiles above recompute
      to match the filtered set.
- [ ] Sorting by date, ticker, risk and R all work in both directions.
- [ ] Upload a screenshot, then reopen the trade — the `img` link opens it.
      *(Skip if you didn't create the storage bucket.)*
- [ ] Delete a trade: it asks first, and the row disappears afterwards.
- [ ] A setup or system you typed once is offered as a suggestion next time.

### Morning Check-In

- [ ] Saving records the completion time; the dashboard pill turns green.
- [ ] Reloading shows your saved values, not blank defaults.
- [ ] Edit a checklist item, save, then open tomorrow's check-in — your edited
      wording carries forward, unticked.
- [ ] Saving again later does not reset the original completion time.

### Evening Check-In

- [ ] Trade count, total R and plan-compliant count arrive **pre-filled from
      that day's trades**, each labelled as matching the trade log.
- [ ] Change one, and its label switches from *matches trade log* to
      *suggested N · use*. Clicking *use* restores the derived value.
- [ ] With an open or R-less trade on that day, a notice says so and explains
      that today's total R excludes it.
- [ ] Entering more plan-compliant trades than total trades is rejected.
- [ ] Saving preserves the morning half of the same day.

### Reports

- [ ] Headline tiles agree with the trade log for the same filter.
- [ ] The excluded-trades line names your open and R-less trades.
- [ ] Cumulative R ends at the same total R shown in the tiles.
- [ ] Rolling 20-trade expectancy draws once you have 20 closed trades with an
      R, and before that says how many you have.
- [ ] Switching between setup / system / trade type regroups the chart, and the
      table under *View data as table* matches the bars.
- [ ] The trade-type filter changes every statistic on the page.

### Weekly Review

- [ ] Previous / Next move a week at a time; *Next* is disabled on the current
      week; *This week* returns.
- [ ] Summary cards match the trade log and check-ins for that week.
- [ ] Stress chart plots before and after, labelled, with gaps where no
      check-in exists rather than zeros.
- [ ] A week with no data shows empty states, not errors or zeros.
- [ ] The reflection saves and is still there after a reload and a week switch.

### Coach

- [ ] Without `ANTHROPIC_API_KEY`, a mock-mode notice appears and running a
      workflow returns an obviously-labelled mock response.
- [ ] With a key, each of the five workflows returns process feedback.
- [ ] **Pre-Trade Review** defaults *earnings* and *trend filter* to
      **not checked**, and the response lists them as missing data to confirm
      manually rather than assuming them.
- [ ] The coach never names an instrument to buy or sell, never predicts a
      market, and never asserts a price, moving average or trend it was not
      given. **If it ever does, stop and tell me** — that is the constraint the
      whole design rests on.
- [ ] Position sizing in the pre-trade response shows its arithmetic.
- [ ] Every run appears in `/coach/history`, mock runs included.

### Presentation

- [ ] Usable at phone width: nothing overflows sideways, all seven nav items
      reachable, forms and tables readable.
- [ ] Dark mode toggles, survives a reload, and every chart stays legible.
- [ ] Empty states read sensibly on a fresh account before any data exists.

---

## 3. Known limits

Worth knowing before you judge anything as a bug:

- **Single user by design.** No sign-up, sharing, or multi-account support.
- **No market data, ever.** No prices, moving averages, trends or earnings
  dates. Anything requiring them asks you to confirm manually.
- **Manual trade entry only.** No broker import.
- **Partial exits and scaling** are not modelled leg-by-leg. Tick *Complex
  trade* and enter the net R yourself.
- **Currency is GBP** throughout.
- **Weeks start Monday** everywhere, matching the SQL views.
- **Coaching quality is untested at scale.** The constraints are enforced by
  prompt, and the prompts have only been exercised against synthetic data.
  Treat early coach output as something to review, not to rely on.

---

## 4. Reporting problems

Useful to include: the page, what you did, what you expected, what happened,
and whether the data involved came from the demo script or your own entry.
For anything numeric, the trade or day it relates to makes it much faster to
pin down.
