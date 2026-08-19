@AGENTS.md

# Project: TMOS — Trader's Mental Operating System

Full authoritative spec: `docs/PROJECT_CONTEXT.md`. Read it before building
any feature. Summary of what matters most below.

## What this is
A personal, single-user web app and coaching environment for disciplined
trading practice: journaling, morning/evening check-ins, weekly reviews, an
R-multiple trade log, reports, and a process-focused coaching agent.

It is NOT a signal generator, broker integration, autonomous trading system,
or public SaaS. No market prediction, no trade recommendations, no
hallucinated market data — ask for confirmation or manual input when data is
missing.

## Core philosophy (Van Tharp-style)
- Think in 1R and R-multiples; every trade has clearly defined initial risk
- Track expectancy, not just win rate
- Separate valid losses from mistakes
- Position sizing is explicit and reviewable (0.25–0.50% risk per trade)
- Process over outcome; capital preservation first

## Tech stack
- Next.js (App Router), TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth) for backend and cloud sync
- Recharts for visualizations
- Deploy target: Vercel

## Design direction
Clean, minimal, "Apple-style", mobile-first responsive:
- Neutral light background, dark mode toggle (`.dark` class on `<html>`)
- SF Pro-like system font stack (fallback: Inter)
- Generous white space, 12-16px rounded corners, subtle shadows
- One calm accent color (teal `#0d9488`) used sparingly for primary actions
- Large legible numbers (tabular-nums) — use the `metric` utility class
- Card-based layout throughout — use the `card` utility class
- Design tokens live in `src/app/globals.css` as CSS variables mapped into
  Tailwind via `@theme inline`

## Build strategy
Always plan before coding. For large features: propose architecture →
confirm file structure → implement one working vertical slice at a time →
test before moving on.

Build order: 1. Scaffold/auth ✓ → 2. Trade Log → 3. Morning Check-In →
4. Evening Check-In → 5. Reports → 6. Weekly Review → 7. Coaching Agent

## Conventions
- All Supabase tables use Row Level Security scoped to auth.uid()
- Seed/placeholder content (tags, checklist items, attitudes, systems,
  lapse types) must be clearly commented in migration/seed files as
  "editable starting points, not authoritative"
- Prefer computed SQL views for weekly aggregates over stored summary
  tables unless performance requires caching
- Any calculated R value is an editable suggestion — never silently
  overwrite user-entered values; complex trades (partial exits, scaling)
  must allow fully manual R entry
- Coaching prompts (system/role/task templates and data payload assembly)
  live in `src/lib/prompts/`, separate from UI components
- This Next.js version uses `src/proxy.ts` (not `middleware.ts`) for
  request interception — see AGENTS.md and `node_modules/next/dist/docs/`
