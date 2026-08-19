import type { WorkflowDefinition } from "./types";

export const morningCoach: WorkflowDefinition = {
  id: "morning_coach",
  label: "Morning Check-In Coach",
  blurb: "Readiness, risk limits, and whether to trade or stand aside today.",
  context: ["today_day_record"],
  inputs: [
    { name: "stress_before", label: "Stress right now (0–10)", type: "scale", required: true },
    { name: "energy_before", label: "Energy right now (0–10)", type: "scale", required: true },
    {
      name: "planned_risk_per_trade",
      label: "Planned risk per trade (%)",
      type: "number",
      hint: "your rule: 0.25–0.50",
      required: true,
    },
    {
      name: "max_daily_risk",
      label: "Max daily risk (%)",
      type: "number",
      hint: "your rule: up to 1.0",
      required: true,
    },
    {
      name: "winning_attitude_focus",
      label: "Winning attitude to focus on",
      type: "text",
    },
    {
      name: "losing_attitude_watch",
      label: "Losing attitude to watch for",
      type: "text",
    },
    {
      name: "discipline_commitment",
      label: "I commit to my decision sequence today",
      type: "boolean",
    },
    {
      name: "notes",
      label: "Anything else affecting your state today",
      type: "textarea",
    },
  ],
  taskPrompt: `Produce a short morning readiness assessment with exactly these sections:

1. **Readiness** — one or two sentences on the trader's state, grounded in the stress and energy scores and anything they told you. Say plainly whether their state supports disciplined execution today.

2. **Risk warnings** — check the stated per-trade risk and max daily risk against the trader's own rules (0.25–0.50% per trade, max 1.0% total open risk, 0.5–1.0% new daily risk). Flag any number outside those bands and say what the correct figure would be. If the numbers are within the rules, say so in one line and move on.

3. **Trade or stand aside** — a clear recommendation to trade normally, trade reduced size, or stand aside. Base this ONLY on the trader's own no-trade filters (poor mental state is one of them) and the state data they gave you. This is a judgement about the trader's readiness, never about the market.

If the trader did not commit to their decision sequence, or left the attitude fields blank, name that as an open item rather than ignoring it.

Keep the whole response under 250 words.`,
};
