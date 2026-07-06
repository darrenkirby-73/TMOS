@AGENTS.md

# Project: TMOS — Trader's Mental Operating System

## What this is
A personal, single-user web app for tracking trading psychology and
performance, based on a risk / stress / attitude / discipline / decision
process framework. Built for one user only — no multi-tenant features.

## Tech stack
- Next.js (App Router), TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth) for backend and cloud sync
- Recharts for visualizations
- Deploy target: Vercel

## Design direction
Clean, minimal, "Apple-style":
- Neutral light background, dark mode optional toggle
- SF Pro-like system font stack (fallback: Inter)
- Generous white space, 12-16px rounded corners, subtle shadows
- One calm accent color (teal `#0d9488`) used sparingly for primary actions
- Large legible numbers (tabular-nums) for scores/metrics — use the
  `metric` utility class
- Minimal transitions, no flashy animation
- Card-based layout throughout — use the `card` utility class

## Non-goals for v1
- No multi-user support, no admin roles, no billing
- No broker API integration — trades entered manually
- No AI trade suggestions — this is a journaling/analysis tool only

## Conventions
- All Supabase tables use Row Level Security scoped to auth.uid()
- Seed/placeholder content (tags, checklist defaults) must be clearly
  commented in migration files as "editable starting points, not
  authoritative" — the user will review and replace these
- Prefer computed SQL views for weekly aggregates over stored summary
  tables unless performance requires caching
- Auto-calculated fields (e.g. R-multiple) must always be shown as
  editable/overridable suggestions, never silently overwritten
- This Next.js version uses `src/proxy.ts` (not `middleware.ts`) for
  request interception — see AGENTS.md and `node_modules/next/dist/docs/`
- Design tokens live in `src/app/globals.css` as CSS variables mapped into
  Tailwind via `@theme inline`; dark mode is the `.dark` class on `<html>`
