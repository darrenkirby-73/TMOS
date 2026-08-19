import type { ChecklistItem } from "@/lib/types";

/**
 * Default morning discipline checklist.
 *
 * PLACEHOLDER STARTING POINTS — editable, not authoritative source material.
 * The user edits items freely in the Morning Check-In; once a day record
 * exists, its stored checklist is the source of truth for that day, and new
 * mornings start from the most recent day's list (falling back to these).
 */
export const DEFAULT_CHECKLIST_LABELS: string[] = [
  "Reviewed the economic calendar and overnight news",
  "Confirmed no earnings within 5 trading days on my watchlist",
  "Marked support/resistance and checked plausible 3R paths",
  "Confirmed trend filters on candidate setups",
  "Set max daily risk and per-trade risk before the open",
  "Yesterday's trades fully journaled — no open loops",
];

export function defaultChecklist(): ChecklistItem[] {
  return DEFAULT_CHECKLIST_LABELS.map((label, i) => ({
    id: `item-${i + 1}`,
    label,
    checked: false,
  }));
}

/** Carry a stored checklist forward to a new day: keep labels, uncheck all. */
export function resetChecklist(items: ChecklistItem[]): ChecklistItem[] {
  return items.map((item) => ({ ...item, checked: false }));
}
