import { round2 } from "@/lib/r";
import type { Trade } from "@/lib/types";

/**
 * Evening Check-In suggestions derived from that day's logged trades.
 *
 * These are SUGGESTIONS ONLY. The Evening form pre-fills them but every
 * field stays editable, and nothing is recomputed after the user edits it.
 * Counts cover all trades logged for the day; total R only counts closed
 * trades that have a recorded R (open trades have no result yet).
 */
export type DaySuggestions = {
  traded: boolean;
  numTrades: number;
  totalRToday: number | null;
  planCompliantTrades: number;
  mistakesCount: number;
  disciplineLapsesCount: number;
  topLapseType: string | null;
  losingAttitudes: string[];
  winningAttitudes: string[];
  /** Closed trades still missing an R — the user should complete these first. */
  closedWithoutR: number;
  openTrades: number;
};

export function suggestFromTrades(trades: Trade[]): DaySuggestions {
  const withR = trades.filter(
    (t) => t.status === "closed" && t.r_result !== null,
  );

  return {
    traded: trades.length > 0,
    numTrades: trades.length,
    totalRToday:
      withR.length > 0
        ? round2(withR.reduce((sum, t) => sum + (t.r_result as number), 0))
        : null,
    planCompliantTrades: trades.filter((t) => t.plan_compliant).length,
    mistakesCount: trades.filter((t) => t.mistake).length,
    disciplineLapsesCount: trades.filter((t) => t.discipline_lapse).length,
    topLapseType: mostCommon(
      trades.filter((t) => t.discipline_lapse).map((t) => t.lapse_type),
    ),
    losingAttitudes: unique(
      trades
        .filter((t) => t.losing_attitude_present)
        .map((t) => t.attitude_tag),
    ),
    winningAttitudes: unique(trades.map((t) => t.winning_attitude_applied)),
    closedWithoutR: trades.filter(
      (t) => t.status === "closed" && t.r_result === null,
    ).length,
    openTrades: trades.filter((t) => t.status === "open").length,
  };
}

function unique(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))];
}

/** Most frequent non-null value; ties resolve to the first seen. */
function mostCommon(values: (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}
