/**
 * Model identifiers written to `coaching_sessions.model`, and how to show
 * them. Kept apart from `coach.ts` because that module imports the Anthropic
 * SDK — client components need these labels without pulling the SDK into the
 * browser bundle.
 */

/** Real API call: the value stored is the model id Claude reports. */
export const COACH_MODEL = "claude-opus-5";

/** No key configured and no model consulted — plumbing only. */
export const MOCK_MODEL = "mock";

/**
 * Prompt composed here, answered by the user in a Claude chat, response
 * pasted back. No API call, so no API cost.
 */
export const PASTE_MODEL = "paste-through";

export function modelLabel(model: string): string {
  if (model === MOCK_MODEL) return "mock mode";
  if (model === PASTE_MODEL) return "paste-through";
  return model;
}
