import type { WorkflowDefinition } from "./types";

export const tradeAnalyst: WorkflowDefinition = {
  id: "trade_analyst",
  label: "Trade Review Analyst",
  blurb: "Read your logged history: expectancy, patterns, valid losses vs mistakes.",
  context: ["all_closed_trades"],
  inputs: [
    {
      name: "focus",
      label: "Anything specific to look at?",
      type: "textarea",
      hint: "optional — e.g. a setup you suspect is weak",
    },
  ],
  taskPrompt: `Analyse the trader's logged trade history, which is supplied below as data. Work only from that data — do not speculate about trades that are not in it.

Report:
1. **The numbers** — trade count, win rate, average winning R, average losing R, expectancy (mean R per trade), and total R. If the pre-computed statistics are supplied, use them rather than recomputing.
2. **By setup** — which setups carry the total R and which drag on it. Note where the sample is too small to conclude anything (fewer than about 10 trades in a group is not evidence).
3. **Valid losses vs mistakes** — how the losses split, and whether the mistakes cluster around a particular setup, trade type, or lapse type.
4. **Pattern detection** — the one behavioural pattern the data actually supports. Be honest if the sample is too small to support any pattern; that is a legitimate finding.
5. **One high-value question** — the single most useful thing to investigate next, phrased as a question the trader can answer from their own future logging.

Be quantitative and specific. Quote the numbers you are reasoning from. Do not offer opinions about instruments or market conditions.`,
};
