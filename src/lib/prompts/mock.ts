import type { CoachWorkflow } from "@/lib/types";
import { WORKFLOWS } from "./index";

/**
 * Mock response mode.
 *
 * Used when no Claude API key is configured. It derives its output from the
 * same composed prompt the real model would receive, so the prompt
 * architecture, payload assembly, UI, and session logging are all exercised
 * end-to-end before any LLM integration is switched on.
 *
 * Mock responses deliberately contain no coaching judgement — they restate
 * the inputs and name what is missing. That keeps them obviously artificial
 * and avoids fabricated guidance.
 */
export function mockResponse(
  workflow: CoachWorkflow,
  composedUserMessage: string,
): string {
  const def = WORKFLOWS[workflow];
  const missingCount = (composedUserMessage.match(/NOT RECORDED/g) ?? []).length;
  const noRecord = composedUserMessage.includes("NO RECORD");
  const noTrades = composedUserMessage.includes("NONE LOGGED");

  const observations = [
    `${missingCount} field${missingCount === 1 ? "" : "s"} in your records ${missingCount === 1 ? "is" : "are"} not filled in.`,
    noRecord ? "At least one check-in has no record for the period." : null,
    noTrades ? "No trades were logged for the period in question." : null,
  ].filter(Boolean);

  return `**Mock response — no Claude API key configured.**

This is the ${def.label} workflow running in mock mode. The prompt was composed and your data was assembled exactly as it would be for a real request, and this session has been logged so you can review it later. No model was called and no coaching judgement was produced.

**What the assembled payload contained**
${observations.map((o) => `- ${o}`).join("\n")}

**What the real coach would return here**
${def.taskPrompt
  .split("\n")
  .filter((line) => /^\d\.\s|^-\s/.test(line.trim()))
  .slice(0, 6)
  .map((line) => `  ${line.trim()}`)
  .join("\n")}

To enable real coaching, set \`ANTHROPIC_API_KEY\` in \`.env.local\` and restart the dev server.`;
}
