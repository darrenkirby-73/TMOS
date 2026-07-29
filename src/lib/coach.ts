import Anthropic from "@anthropic-ai/sdk";
import { mockResponse } from "@/lib/prompts/mock";
import type { ComposedPrompt } from "@/lib/prompts";
import type { CoachWorkflow } from "@/lib/types";

/**
 * Runs a composed coaching prompt against the Claude API, or against the
 * mock responder when no API key is configured.
 *
 * Model choice and request shape live here so they can be changed in one
 * place; the prompts themselves are in src/lib/prompts/.
 */

export const COACH_MODEL = "claude-opus-5";
export const MOCK_MODEL = "mock";

/** Server-only: never exposed to the browser. */
export function isCoachConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export type CoachResult = {
  response: string;
  model: string;
};

export async function runCoach(
  workflow: CoachWorkflow,
  prompt: ComposedPrompt,
): Promise<CoachResult> {
  if (!isCoachConfigured()) {
    return {
      response: mockResponse(workflow, prompt.userMessage),
      model: MOCK_MODEL,
    };
  }

  const client = new Anthropic();

  const message = await client.beta.messages.create({
    model: COACH_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    // Safety classifiers can decline a request; route declines to the
    // recommended fallback model rather than surfacing a dead end.
    fallbacks: "default",
    system: prompt.system,
    messages: [{ role: "user", content: prompt.userMessage }],
  });

  if (message.stop_reason === "refusal") {
    return {
      response:
        "The coaching request was declined by the model's safety systems, so no guidance was produced. This can happen on benign requests; try rephrasing your notes, or review the data yourself in the Reports and Weekly Review pages.",
      model: message.model,
    };
  }

  const text = message.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  return {
    response:
      text === ""
        ? "The model returned an empty response. Try running the workflow again."
        : text,
    model: message.model,
  };
}

/** Maps SDK errors onto messages worth showing the user. */
export function describeCoachError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return "Claude rejected the API key. Check ANTHROPIC_API_KEY in .env.local.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "Rate limited by the Claude API. Wait a moment and try again.";
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "Couldn't reach the Claude API. Check your connection and try again.";
  }
  if (error instanceof Anthropic.APIError) {
    return `Claude API error (${error.status}): ${error.message}`;
  }
  return error instanceof Error ? error.message : "Unknown error";
}
