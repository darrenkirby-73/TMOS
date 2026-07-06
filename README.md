# TMOS — Trader's Mental Operating System

A personal, single-user web app for tracking trading psychology and
performance, built around five pillars: **risk, stress, attitude, discipline,
and decision process**.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- Tailwind CSS v4
- [Supabase](https://supabase.com) (Postgres + Auth)
- Recharts
- Deploys to Vercel

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com), then
   copy the environment file and fill in your project's URL and anon key
   (Project Settings → API):

   ```bash
   cp .env.example .env.local
   ```

3. **Apply the database migration.** Either paste
   `supabase/migrations/20260706000001_init.sql` into the Supabase SQL editor,
   or use the CLI:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

4. **Create your user** in the Supabase dashboard (Authentication → Users →
   Add user). This is a single-user app — there is no sign-up flow.

5. **Seed the starting defaults** (optional). After signing in once, run this
   in the SQL editor while authenticated as your user, or call it from the
   app later:

   ```sql
   select public.seed_defaults();
   ```

   The seeded tags and checklist items are editable starting points, not
   authoritative — review and replace them.

6. **Run the dev server**

   ```bash
   npm run dev
   ```

   Before Supabase is configured the app renders with a setup notice and
   sample chart data, so you can preview the UI immediately.

## Project structure

```
src/
  app/
    (app)/            # Authenticated app shell: dashboard, journal, trades, checklist
    login/            # Email/password sign-in (server actions)
  components/         # UI: nav, theme toggle, score tiles, charts
  lib/
    env.ts            # Env guards (app renders before Supabase is configured)
    supabase/         # Browser + server Supabase clients (@supabase/ssr)
  proxy.ts            # Session refresh + auth gating (Next.js proxy convention)
supabase/
  migrations/         # Schema: tables with RLS, seed function, weekly views
```

## Conventions

- Every table has Row Level Security scoped to `auth.uid()`.
- Weekly aggregates are computed SQL views (`weekly_checkin_averages`,
  `weekly_trade_stats`), not stored summary tables.
- Auto-calculated fields (e.g. R-multiple) are suggestions the user can
  override — never silently recomputed.
- Dark mode is a manual toggle (defaults to system preference), persisted in
  `localStorage`.
