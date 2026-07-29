import type { WorkflowDefinition } from "./types";

export const preTradeReview: WorkflowDefinition = {
  id: "pre_trade_review",
  label: "Pre-Trade Review Coach",
  blurb:
    "Check a proposed trade against your own rules, sizing, and no-trade filters.",
  context: ["today_day_record"],
  inputs: [
    { name: "ticker", label: "Ticker", type: "text", required: true },
    { name: "setup", label: "Setup", type: "text", required: true },
    { name: "entry_price", label: "Intended entry", type: "number", required: true },
    { name: "stop_price", label: "Initial stop", type: "number", required: true },
    {
      name: "target_area",
      label: "Target / resistance area",
      type: "text",
      hint: "where the move is likely to stall",
    },
    { name: "account_size", label: "Account size (£)", type: "number", required: true },
    { name: "intended_risk_gbp", label: "Intended £ risk", type: "number", required: true },
    {
      name: "earnings_near",
      label: "Earnings within 5 trading days?",
      type: "select",
      // "not checked" is first so it is the default — the coach must never
      // assume a no-trade filter was verified when it wasn't.
      options: ["not checked", "no", "yes"],
      required: true,
    },
    {
      name: "trend_filter_confirmed",
      label: "Trend filter confirmed manually?",
      type: "select",
      // Unverified by default, for the same reason.
      options: [
        "not checked",
        "partially confirmed",
        "confirmed: price > 50MA, 50MA > 200MA, above 3-month midpoint",
      ],
      required: true,
    },
    { name: "stress_now", label: "Stress right now (0–10)", type: "scale", required: true },
    { name: "notes", label: "Anything else about this idea", type: "textarea" },
  ],
  taskPrompt: `Review this proposed trade against the trader's own system. You have NO market data — you cannot see the chart, the price, the moving averages, the trend, or the earnings calendar. Work only from what the trader typed.

Compute and show:
- **Risk per share** = |entry − stop|
- **Position size** = intended £ risk ÷ risk per share (round DOWN to a whole number of shares)
- **Actual £ risk** at that size, and what percentage of the stated account size it represents
- **1R** in £ and the price level that represents **3R** from entry in the trade's direction

State every calculation explicitly so the trader can check it.

Then give a verdict of exactly one of: **VALID**, **INVALID**, or **NEEDS CLARIFICATION**.
- INVALID if a no-trade filter is tripped (earnings within 5 trading days, risk outside 0.25–0.50% of account, poor mental state) or the stop is on the wrong side of the entry.
- NEEDS CLARIFICATION if the trend filter was not confirmed, earnings were not checked, or the 3R path cannot be assessed because no resistance area was given. Do not guess these.
- VALID only if every one of the trader's stated criteria is satisfied by the information provided.

Then list:
- **Reasons** — why you reached that verdict, referencing the specific rule.
- **Missing data checklist** — every input you needed and did not get. If the trend filter or earnings were "not checked", they go here. Ask the trader to confirm them manually.
- **Position sizing guidance** — the sizing maths above, plus a note if the intended £ risk is outside 0.25–0.50% of the account.
- **Reminders** — the 3R rule and any no-trade filter relevant to this idea.

Never say whether you think the trade will work.`,
};
