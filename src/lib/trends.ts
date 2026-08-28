import { round2 } from "@/lib/r";
import { computeRStats, type RStats } from "@/lib/stats";
import { addDaysIso, parseIsoDate, toIsoDate, weekStartIso } from "@/lib/dates";
import type { DayRecord, Trade } from "@/lib/types";

/**
 * Aggregation over time. Every function here follows one rule: a period with
 * nothing recorded produces null, never zero. A week you didn't trade is not
 * a week with an expectancy of 0R, and plotting it as one would invent a
 * data point and drag every trend line towards the middle.
 */

export type Period = "week" | "month";

/** The bucket an ISO date falls in: a Monday for weeks, YYYY-MM for months. */
export function periodKey(isoDate: string, period: Period): string {
  return period === "week" ? weekStartIso(isoDate) : isoDate.slice(0, 7);
}

/** The next bucket along, used to build a gap-free axis. */
export function nextPeriodKey(key: string, period: Period): string {
  if (period === "week") return addDaysIso(key, 7);
  const [y, m] = key.split("-").map(Number);
  return m === 12
    ? `${y + 1}-01`
    : `${y}-${String(m + 1).padStart(2, "0")}`;
}

export function periodLabel(key: string, period: Period): string {
  if (period === "week") {
    const d = parseIsoDate(key);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "2-digit",
  });
}

/**
 * Every bucket from first to last inclusive, so quiet periods appear as gaps
 * rather than being closed up. Without this the x-axis silently compresses
 * time and a three-week break looks like consecutive weeks.
 */
export function periodRange(
  firstIso: string,
  lastIso: string,
  period: Period,
): string[] {
  const start = periodKey(firstIso, period);
  const end = periodKey(lastIso, period);
  const keys: string[] = [];
  let cursor = start;
  // Bounded so a bad date can never spin here.
  for (let i = 0; i < 600 && cursor <= end; i++) {
    keys.push(cursor);
    cursor = nextPeriodKey(cursor, period);
  }
  return keys;
}

function dateSpan(dates: string[]): { first: string; last: string } | null {
  if (dates.length === 0) return null;
  const sorted = [...dates].sort();
  return { first: sorted[0], last: sorted[sorted.length - 1] };
}

/** Closed trades carrying an R — the only ones that can measure anything. */
export function measurableTrades(trades: Trade[]): Trade[] {
  return trades.filter((t) => t.status === "closed" && t.r_result !== null);
}

export type PeriodPoint = {
  key: string;
  label: string;
  /** null when the period has no measurable trades. */
  expectancy: number | null;
  winRate: number | null;
  avgWinR: number | null;
  avgLossR: number | null;
  totalR: number | null;
  trades: number;
  /** Running total across periods, carried through empty ones. */
  cumulativeR: number | null;
};

export function trendByPeriod(
  trades: Trade[],
  period: Period,
): PeriodPoint[] {
  const measurable = measurableTrades(trades);
  const span = dateSpan(measurable.map((t) => t.date));
  if (!span) return [];

  const buckets = new Map<string, number[]>();
  for (const trade of measurable) {
    const key = periodKey(trade.date, period);
    const arr = buckets.get(key) ?? [];
    arr.push(trade.r_result as number);
    buckets.set(key, arr);
  }

  let running: number | null = null;
  return periodRange(span.first, span.last, period).map((key) => {
    const rs = buckets.get(key);
    if (!rs || rs.length === 0) {
      return {
        key,
        label: periodLabel(key, period),
        expectancy: null,
        winRate: null,
        avgWinR: null,
        avgLossR: null,
        totalR: null,
        trades: 0,
        // The equity curve is continuous even when a period is empty: no
        // trades means no change, which is different from no data.
        cumulativeR: running,
      };
    }
    const stats: RStats = computeRStats(rs);
    running = round2((running ?? 0) + stats.totalR);
    return {
      key,
      label: periodLabel(key, period),
      expectancy: stats.expectancy,
      winRate: stats.winRate,
      avgWinR: stats.avgWinR,
      avgLossR: stats.avgLossR,
      totalR: stats.totalR,
      trades: stats.count,
      cumulativeR: running,
    };
  });
}

export type DisciplinePoint = {
  key: string;
  label: string;
  /** Percentages over trades logged in the period, null when none were. */
  mistakeRate: number | null;
  planCompliance: number | null;
  lapseRate: number | null;
  trades: number;
  /** Means over the check-ins that recorded them, null when none did. */
  stressBefore: number | null;
  stressAfter: number | null;
  energyBefore: number | null;
};

function meanOrNull(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return round2(present.reduce((a, b) => a + b, 0) / present.length);
}

/**
 * Behaviour over time, which is the point of the whole app: mistakes and
 * lapses come from the trade log, stress and energy from the check-ins. The
 * two are counted independently — a day with trades but no check-in
 * contributes to one and not the other, and neither substitutes for the
 * other's missing values.
 */
export function disciplineByPeriod(
  trades: Trade[],
  dayRecords: DayRecord[],
  period: Period,
): DisciplinePoint[] {
  const span = dateSpan([
    ...trades.map((t) => t.date),
    ...dayRecords.map((d) => d.date),
  ]);
  if (!span) return [];

  const tradeBuckets = new Map<string, Trade[]>();
  for (const trade of trades) {
    const key = periodKey(trade.date, period);
    tradeBuckets.set(key, [...(tradeBuckets.get(key) ?? []), trade]);
  }
  const dayBuckets = new Map<string, DayRecord[]>();
  for (const day of dayRecords) {
    const key = periodKey(day.date, period);
    dayBuckets.set(key, [...(dayBuckets.get(key) ?? []), day]);
  }

  return periodRange(span.first, span.last, period).map((key) => {
    const periodTrades = tradeBuckets.get(key) ?? [];
    const periodDays = dayBuckets.get(key) ?? [];
    const n = periodTrades.length;
    const pct = (count: number) => (n > 0 ? round2((count / n) * 100) : null);

    return {
      key,
      label: periodLabel(key, period),
      mistakeRate: pct(periodTrades.filter((t) => t.mistake).length),
      planCompliance: pct(periodTrades.filter((t) => t.plan_compliant).length),
      lapseRate: pct(periodTrades.filter((t) => t.discipline_lapse).length),
      trades: n,
      stressBefore: meanOrNull(periodDays.map((d) => d.stress_before)),
      stressAfter: meanOrNull(periodDays.map((d) => d.stress_after)),
      energyBefore: meanOrNull(periodDays.map((d) => d.energy_before)),
    };
  });
}

export type GroupTrend = {
  group: string;
  /** Aligned to the shared period axis; null where the group didn't trade. */
  points: { key: string; label: string; expectancy: number | null; trades: number }[];
  totalTrades: number;
  overallExpectancy: number | null;
};

/**
 * One series per setup or system across a shared axis, so a setup that is
 * decaying can be told apart from one that is merely quiet. Groups are
 * returned busiest-first; the caller decides how many to draw.
 */
export function groupTrendByPeriod(
  trades: Trade[],
  period: Period,
  getGroup: (trade: Trade) => string | null,
): GroupTrend[] {
  const measurable = measurableTrades(trades);
  const span = dateSpan(measurable.map((t) => t.date));
  if (!span) return [];

  const axis = periodRange(span.first, span.last, period);
  const groups = new Map<string, Map<string, number[]>>();

  for (const trade of measurable) {
    const group = getGroup(trade) ?? "(none)";
    const key = periodKey(trade.date, period);
    const byPeriod = groups.get(group) ?? new Map<string, number[]>();
    byPeriod.set(key, [...(byPeriod.get(key) ?? []), trade.r_result as number]);
    groups.set(group, byPeriod);
  }

  return [...groups.entries()]
    .map(([group, byPeriod]) => {
      const all: number[] = [];
      const points = axis.map((key) => {
        const rs = byPeriod.get(key) ?? [];
        all.push(...rs);
        return {
          key,
          label: periodLabel(key, period),
          expectancy: rs.length > 0 ? computeRStats(rs).expectancy : null,
          trades: rs.length,
        };
      });
      return {
        group,
        points,
        totalTrades: all.length,
        overallExpectancy: all.length > 0 ? computeRStats(all).expectancy : null,
      };
    })
    .sort((a, b) => b.totalTrades - a.totalTrades);
}

/**
 * Direction of travel: the latest period against the mean of the ones before
 * it. Returns null rather than a spurious 0 when there isn't enough history
 * to compare, which is the common case early on.
 */
export type TrendDelta = {
  latest: number | null;
  previousAverage: number | null;
  delta: number | null;
};

export function compareLatest(
  values: (number | null)[],
): TrendDelta {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return { latest: null, previousAverage: null, delta: null };
  const latest = present[present.length - 1];
  const earlier = present.slice(0, -1);
  if (earlier.length === 0)
    return { latest, previousAverage: null, delta: null };
  const previousAverage = round2(
    earlier.reduce((a, b) => a + b, 0) / earlier.length,
  );
  return { latest, previousAverage, delta: round2(latest - previousAverage) };
}

/** Latest N periods, for the dashboard strip. */
export function lastPeriods<T>(points: T[], n: number): T[] {
  return points.slice(Math.max(0, points.length - n));
}

/** ISO date N months back, for bounding a query. */
export function monthsAgoIso(isoDate: string, months: number): string {
  const d = parseIsoDate(isoDate);
  d.setMonth(d.getMonth() - months);
  return toIsoDate(d);
}
