import type { WorkflowDefinition } from "./types";

export const eveningDebrief: WorkflowDefinition = {
  id: "evening_debrief",
  label: "Evening Debrief Coach",
  blurb: "Separate execution from outcome; one behaviour to keep, one to fix.",
  context: ["today_day_record", "recent_trades"],
  inputs: [
    { name: "num_trades", label: "Number of trades", type: "number", required: true },
    { name: "total_r", label: "Total R today", type: "number" },
    { name: "mistakes_count", label: "Mistakes", type: "number", required: true },
    {
      name: "discipline_lapses_count",
      label: "Discipline lapses",
      type: "number",
      required: true,
    },
    {
      name: "losing_attitudes_observed",
      label: "Losing attitudes observed",
      type: "text",
      hint: "comma separated",
    },
    {
      name: "winning_attitudes_applied",
      label: "Winning attitudes applied",
      type: "text",
      hint: "comma separated",
    },
    { name: "worst_decision", label: "Worst decision today", type: "textarea" },
    { name: "best_catch", label: "Best catch today", type: "textarea" },
    {
      name: "tomorrow_adjustment",
      label: "Your proposed adjustment for tomorrow",
      type: "textarea",
    },
  ],
  taskPrompt: `Debrief the trading day. Structure your response as:

1. **Process summary** — what actually happened in terms of execution: how many trades, how many followed the plan, how many were mistakes or lapses. Use the numbers given.

2. **Outcome vs execution** — state the day's R separately from the day's execution quality, and say explicitly which one matters. A green day with mistakes is a warning; a red day with clean execution is a good day. If total R was not provided, say so and assess execution alone.

3. **One behaviour to reinforce** — a single, specific thing they did well, drawn from what they told you. Name it concretely.

4. **One behaviour to correct** — a single, specific thing to change, with the smallest concrete action that would prevent a repeat. If they proposed their own adjustment, evaluate it rather than replacing it.

Do not list more than one item in sections 3 and 4 — the value is in the selection. Never comment on whether the trades themselves were good ideas. Keep the whole response under 300 words.`,
};
