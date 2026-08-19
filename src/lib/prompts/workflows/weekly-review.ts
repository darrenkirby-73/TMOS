import type { WorkflowDefinition } from "./types";

export const weeklyReview: WorkflowDefinition = {
  id: "weekly_review",
  label: "Weekly Review Coach",
  blurb: "The week's behavioural pattern and the highest-leverage change.",
  context: ["week_day_records", "week_trades"],
  inputs: [
    {
      name: "went_well",
      label: "What went well this week",
      type: "textarea",
    },
    {
      name: "what_broke_down",
      label: "What broke down",
      type: "textarea",
    },
  ],
  taskPrompt: `Review the trader's week using the supplied check-in and trade data.

Produce:
1. **Weekly summary** — total R, discipline compliance, stress trend across the week (before vs after, and whether it rose), mistakes and lapses, and the most common losing and winning attitudes. Use the supplied figures; if a figure is missing because check-ins were skipped, say so rather than estimating.
2. **Biggest issue** — the single most costly pattern this week, in behavioural terms. Tie it to the data.
3. **Highest-leverage improvement** — one change for next week, stated as a concrete rule or routine the trader can follow, not a sentiment. Prefer a change to process or risk control over anything about trade selection.
4. **Reflection prompts** — three short questions for the trader to answer themselves in the weekly reflection form. They should be specific to this week's data, not generic.

If the trader completed few check-ins this week, note the gap: a review is only as good as the logging behind it. Keep the whole response under 400 words.`,
};
