import { round2 } from "@/lib/r";

/**
 * Performance statistics over closed trades with a recorded R.
 * Pure functions over r_result values the user has saved — no hidden
 * recalculation from prices.
 */

export type RStats = {
  count: number;
  winners: number;
  losers: number;
  scratches: number;
  winRate: number | null; // winners / (winners + losers), null with no decided trades
  avgWinR: number | null;
  avgLossR: number | null;
  expectancy: number | null; // mean R across all counted trades
  totalR: number;
};

export function computeRStats(rValues: number[]): RStats {
  const count = rValues.length;
  const wins = rValues.filter((r) => r > 0);
  const losses = rValues.filter((r) => r < 0);
  const scratches = count - wins.length - losses.length;
  const decided = wins.length + losses.length;
  return {
    count,
    winners: wins.length,
    losers: losses.length,
    scratches,
    winRate: decided > 0 ? round2((wins.length / decided) * 100) : null,
    avgWinR: wins.length > 0 ? round2(mean(wins)) : null,
    avgLossR: losses.length > 0 ? round2(mean(losses)) : null,
    expectancy: count > 0 ? round2(mean(rValues)) : null,
    totalR: round2(sum(rValues)),
  };
}

/** Cumulative R after each trade, in the order given (chronological). */
export function cumulativeR(rValues: number[]): number[] {
  let running = 0;
  return rValues.map((r) => {
    running = round2(running + r);
    return running;
  });
}

/**
 * Rolling expectancy over a trailing window. Returns one point per trade
 * from index (window − 1) onward; empty if fewer than `window` trades.
 */
export function rollingExpectancy(
  rValues: number[],
  window: number,
): number[] {
  if (rValues.length < window) return [];
  const out: number[] = [];
  for (let i = window - 1; i < rValues.length; i++) {
    out.push(round2(mean(rValues.slice(i - window + 1, i + 1))));
  }
  return out;
}

/** Group R values by a key (setup, system, trade_type…) and compute stats. */
export function statsByGroup<T>(
  items: T[],
  getKey: (item: T) => string | null,
  getR: (item: T) => number | null,
): { key: string; stats: RStats }[] {
  const groups = new Map<string, number[]>();
  for (const item of items) {
    const r = getR(item);
    if (r === null) continue;
    const key = getKey(item) ?? "(none)";
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }
  return [...groups.entries()]
    .map(([key, rs]) => ({ key, stats: computeRStats(rs) }))
    .sort((a, b) => b.stats.totalR - a.stats.totalR);
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

function mean(xs: number[]): number {
  return sum(xs) / xs.length;
}
