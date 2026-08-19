# TMOS — Trader's Mental Operating System

A private, single-user web app for disciplined trading practice: an
R-multiple trade log, morning and evening check-ins, performance reports, a
weekly behavioural review, and a process-focused coaching agent.

It is **not** a signal generator, a broker integration, or an autonomous
trading system. It makes no market predictions, gives no trade
recommendations, and never invents market data — where a technical condition
can't be verified from your own records, the app asks you to confirm it.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS v4
- [Supabase](https://supabase.com) — Postgres, Auth, Storage
- Recharts
- Claude API for the coaching agent (optional — see below)
- Deploys to Vercel

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com), copy
   the environment file, and fill in your project's URL and anon key
   (Project Settings → API):

   ```bash
   cp .env.example .env.local
   ```

3. **Apply the database migration.** This creates the tables, row-level
   security policies, weekly summary views, the starter-data function, and
   the private `trade-screenshots` storage bucket.

   **Via the GitHub integration (recommended if it's connected).** Supabase
   applies everything in `supabase/migrations/` when changes land on the
   branch configured under Integrations → GitHub — usually your default
   branch, so this work needs merging first. `supabase/config.toml` is what
   makes the repo recognisable as a Supabase project; it must stay at the
   repo root under `supabase/`.

   **Or with the CLI / SQL editor:**

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   > **Check the migration log for one notice.** On hosted Supabase,
   > `storage.objects` is owned by `supabase_storage_admin`, so depending on
   > the role applying the migration the storage policies may be skipped with
   > `Could not create storage policies (must be owner of table objects)`.
   > Everything else — tables, RLS, views, seeds — still applies; the storage
   > block is deliberately non-fatal so a permission there can't roll back
   > your schema. If you see that notice, create a **private** bucket named
   > `trade-screenshots` under Storage and add four policies (select, insert,
   > update, delete) with the condition
   > `bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]`.
   > Screenshot upload is the only feature affected until you do.

4. **Create your user** in the Supabase dashboard (Authentication → Users →
   Add user). This is a single-user app — there is no sign-up flow.

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Signing in seeds your starter tags automatically. Before Supabase is
   configured every page renders with a setup notice rather than failing.

6. **Enable the coaching agent (optional).** Add an `ANTHROPIC_API_KEY` to
   `.env.local`. Without one the coach runs in **mock mode**: it still
   assembles your data, composes the real prompt, and logs the session — it
   just doesn't call a model. Nothing else in the app depends on it.

## Using it

| Page | What it does |
| --- | --- |
| **Dashboard** | Today's check-in status, open positions, running expectancy, recent trades |
| **Trades** | Sortable, filterable trade log; modal entry form with live suggested R; screenshot upload |
| **Morning** | Risk limits, stress/energy, attitude focus, editable discipline checklist, decision sequence |
| **Evening** | Debrief with numbers pre-filled from that day's trades, all overridable |
| **Reports** | Win rate, average R winner/loser, expectancy, cumulative R, R per trade, rolling 20-trade expectancy, performance by setup/system/trade type |
| **Weekly** | Week picker, summary cards, stress and mistake charts, decision-quality distribution, weekly reflection |
| **Coach** | Five coaching workflows over your own records, with a reviewable session history |

### Coaching workflows

Morning Check-In Coach, Pre-Trade Review Coach, Evening Debrief Coach, Trade
Review Analyst, and Weekly Review Coach. Each collects a small set of inputs,
attaches the relevant stored records, and returns process feedback. The coach
is bound by hard constraints in `src/lib/prompts/system.ts` — edit that file
to change its boundaries.

## Project structure

```
src/
  app/
    (app)/              # Authenticated shell
      page.tsx          #   Dashboard
      trades/           #   Trade Log
      morning/          #   Morning Check-In
      evening/          #   Evening Check-In
      reports/          #   Reports
      weekly/           #   Weekly Review
      coach/            #   Coaching Agent + history
    login/              # Email/password sign-in (server actions)
    api/screenshot/     # Signed-URL redirect for trade screenshots
  components/
    charts/             # Recharts wrappers, theme-aware
    ui/                 # Toast, dialog, form fields, button, empty state
  lib/
    r.ts                # R-multiple maths (suggestions only)
    stats.ts            # Win rate, expectancy, rolling windows, grouping
    weekly.ts           # Weekly aggregation
    day-suggestions.ts  # Evening check-in suggestions from the trade log
    dates.ts            # Monday-start week helpers
    coach.ts            # Claude API call + mock mode
    prompts/            # System / role / workflow prompts + payload assembly
    supabase/           # Browser and server clients
  proxy.ts              # Session refresh + auth gating
supabase/migrations/    # Schema, RLS, views, seed function, storage bucket
```

## Conventions

- **Row Level Security** on every table, scoped to `auth.uid()`.
- **R values are suggestions.** Calculated R and 1R are shown next to the
  field with an explicit "use" action; they never overwrite what you typed.
  Complex trades (partial exits, scaling) disable auto-calculation and
  require manual R entry.
- **Missing data is never invented.** Reports state what they exclude, the
  evening check-in flags unresolved trades, and the coach's payload marks
  absent fields as absent.
- **Weekly aggregates are computed SQL views** (`weekly_day_summary`,
  `weekly_trade_summary`), not stored summary tables.
- **Seeded tags and checklist items are placeholders** — clearly commented as
  editable starting points in the migration and in `src/lib/checklist.ts`.
  The seed function is a no-op once you have any tags, so your edits stick.
- **Coaching prompts live in `src/lib/prompts/`**, separate from UI.
- This Next.js version uses `src/proxy.ts`, not `middleware.ts`.

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build (also typechecks)
npm run lint    # ESLint
npm run test    # Vitest unit tests
```
