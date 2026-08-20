import type { CoachWorkflow } from "@/lib/types";
import { ROLE_PROMPTS } from "./roles";
import { SYSTEM_PROMPT } from "./system";
import { assembleContext, assembleInputs, type CoachContext } from "./payload";
import { eveningDebrief } from "./workflows/evening-debrief";
import { morningCoach } from "./workflows/morning-coach";
import { preTradeReview } from "./workflows/pre-trade-review";
import { tradeAnalyst } from "./workflows/trade-analyst";
import { weeklyReview } from "./workflows/weekly-review";
import type { WorkflowDefinition } from "./workflows/types";

export const WORKFLOWS: Record<CoachWorkflow, WorkflowDefinition> = {
  morning_coach: morningCoach,
  pre_trade_review: preTradeReview,
  evening_debrief: eveningDebrief,
  trade_analyst: tradeAnalyst,
  weekly_review: weeklyReview,
};

export const WORKFLOW_LIST = Object.values(WORKFLOWS);

export type ComposedPrompt = {
  system: string;
  userMessage: string;
};

/**
 * Compose the full prompt for a coaching run: shared system prompt + role +
 * task instructions as the system turn, and the assembled data payload +
 * user inputs as the user turn.
 *
 * The same composition feeds the mock responder, so the prompt architecture
 * is exercised end-to-end whether or not an API key is configured.
 */
export function composePrompt(
  workflow: CoachWorkflow,
  inputs: Record<string, unknown>,
  context: CoachContext,
): ComposedPrompt {
  const def = WORKFLOWS[workflow];

  const system = [
    SYSTEM_PROMPT,
    `## Your role\n${ROLE_PROMPTS[workflow]}`,
    `## This task\n${def.taskPrompt}`,
  ].join("\n\n");

  const contextBlock = assembleContext(def.context, context);
  const userMessage = [
    "Here is the stored data from my TMOS records. Anything marked NOT RECORDED or NO RECORD is genuinely absent — do not fill it in.",
    contextBlock,
    assembleInputs(inputs),
  ]
    .filter((s) => s.trim() !== "")
    .join("\n\n");

  return { system, userMessage };
}

/**
 * Flatten a composed prompt into one block of text for paste-through mode.
 *
 * A Claude chat has no separate system field, so the system turn is folded
 * into the message under a heading rather than dropped — the constraints in
 * SYSTEM_PROMPT are the whole point, and a paste that loses them would get
 * coaching this app is explicitly designed not to give.
 */
export function renderForPaste(prompt: ComposedPrompt): string {
  return [
    "You are acting as the coach described below. Follow these instructions exactly, including the constraints.",
    "",
    prompt.system,
    "",
    "---",
    "",
    prompt.userMessage,
  ].join("\n");
}

export { SYSTEM_PROMPT, ROLE_PROMPTS };
export type { CoachContext, WorkflowDefinition };
