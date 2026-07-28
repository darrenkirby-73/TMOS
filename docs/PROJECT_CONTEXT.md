# TMOS Project Context

## Project name
TMOS = Trader's Mental Operating System

## Purpose
Build a personal, single-user web app and coaching environment for disciplined trading practice.

This project is NOT:
- a signal generator
- a broker integration
- an autonomous trading system
- a public SaaS app

This project IS:
- a private journaling, coaching, and review tool
- a structured practice environment
- a system for measuring process quality, risk control, discipline, and decision quality
- a way to analyze trading performance using R-multiples and behaviour patterns

## User context
The user is building trading skill over a 3-year period with the goal of replacing approximately £300k annual income using low-risk, systematic trading approaches.

The app must prioritize:
- capital preservation
- low-risk ideas
- deliberate practice
- process over outcome
- small size while learning
- clear feedback loops

## Core philosophy
Use Van Tharp-style principles:
- Start with objectives
- Think in 1R and R-multiples
- Only take trades with clearly defined initial risk
- Prefer low-risk ideas
- Require plausible 3R potential before entry
- Treat position sizing as a core performance driver
- Track expectancy, not just win rate
- Separate valid losses from mistakes
- Build useful beliefs and disciplined routines
- Review psychological patterns as part of system performance

## Primary practice trading system to support
A daily swing trend-following pullback system for liquid US large-cap stocks and index ETFs.

### System rules
1. Long-only for v1
2. Trend filter:
   - price > 50-day moving average
   - 50-day moving average > 200-day moving average
   - price above prior 3-month range midpoint
3. Setup:
   - 2 to 8 bar orderly pullback toward 10-day or 20-day moving average
   - no panic selloff
   - reversal bar or inside-day breakout near support
4. Entry:
   - next day above reversal bar high
5. Initial stop:
   - below reversal bar low or recent swing low
6. Only trade if there is plausible 3R upside before major resistance
7. Position sizing:
   - risk 0.25% to 0.50% of account equity per trade
   - max open risk 1.0%
   - max new daily risk 0.5% to 1.0%
8. No-trade filters:
   - earnings within 5 trading days
   - illiquid names
   - distorted gap entries
   - blocked 3R path
   - poor mental state

## Product requirements
The app must support:
1. Morning Check-In
2. Evening Check-In
3. Weekly Review
4. Trade Log
5. Reports
6. Trading Coaching Agent

## Design direction
Clean, minimal, Apple-style:
- calm neutral palette
- generous whitespace
- system-font or SF Pro-like typography
- rounded cards
- subtle shadows
- simple charts
- mobile-first responsive design
- dark mode optional

## Technical preferences
- Next.js + TypeScript
- Tailwind CSS
- Supabase for auth, database, storage, sync
- Recharts for charts
- Vercel-friendly deployment

## Important constraints
- Single user only
- No public signup flow beyond what is needed for one private account
- No broker API integration in v1
- No market prediction features
- No trade recommendations
- No hallucinated market data
- Ask for confirmation or manual input when data is missing

## Trade data principles
- Always think in R
- Any calculated R value must be editable
- Complex trades (partial exits, scaling, multiple legs) must allow manual R entry
- Do not silently overwrite user-entered calculations
- Position sizing must be explicit and reviewable

## Coaching agent principles
The coaching agent should:
- coach process, not prediction
- ask clarifying questions when inputs are missing
- distinguish valid losses from mistakes
- reinforce discipline and risk control
- emphasize behaviour and expectancy, not excitement
- never tell the user what to buy or sell
- never pretend to validate technical conditions without data

## Prompt architecture preference
Store reusable prompt templates in code.
Keep:
- system prompts
- role prompts
- task prompts
- user data payload assembly

separate from UI components so prompts can be revised later.

## Seed data rule
Any seeded tags, checklist items, attitudes, systems, or lapse types are placeholders only.
Add comments in seed files clearly stating they are editable starting points, not authoritative source material.

## Build strategy
Always plan before coding.
For large features:
1. propose architecture
2. confirm file structure
3. implement one working vertical slice at a time
4. test before moving on

## Build order
1. Project scaffold and auth
2. Trade Log
3. Morning Check-In
4. Evening Check-In
5. Reports
6. Weekly Review
7. Coaching Agent

## Success criteria
A successful v1 lets the user:
- log trades in R
- review setup quality and discipline
- run morning and evening self-checks
- see weekly behavioural and trading patterns
- get structured coaching prompts and summaries
- improve process quality over time
