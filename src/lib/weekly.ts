import { addDaysIso } from "@/lib/dates";
import { round2 } from "@/lib/r";
import { computeRStats, type RStats } from "@/lib/stats";
import type { DayRecord, Trade } from "@/lib/types";

/**
 * Weekly aggregation for the Weekly Review.
 *
 * Objective counts (R, compliance, mistakes) come from the trade log;
 * subjective measures (stress, decision quality, attitudes) come from the
 * day records written by the check-ins. Nothing is inferred where data is
 * absent — missing values stay null so the UI can say so.
 */

export type WeeklyDay = {
  date: string;
  /** Mon, Tue… */
  label: string;
  stressBefore: number | null;
  stressAfter: number | null;
  mistakes: number;
  decisionQuality: string | null;
  hasRecord: boolean;
};

export type WeeklySummary = {
  days: WeeklyDay[];
  stats: RStats;
  tradeCount: number;
  planCompliantCount: number;
  /** Percentage of the week's trades that followed the plan. */
  disciplineCompliance: number | null;
  avgStressBefore: number | null;
  avgStressAfter: number | null;
  mistakesCount: number;
  lapsesCount: number;
  topLosingAttitude: string | null;
  topWinningAttitude: string | null;
  topLapseType: string | null;
  decisionQualityCounts: { quality: string; count: number }[];
  checkinsCompleted: { morning: number; evening: number };
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function summariseWeek(
  weekStart: string,
  dayRecords: DayRecord[],
  trades: Trade[],
): WeeklySummary {
  const recordByDate = new Map(dayRecords.map((r) => [r.date, r]));

  const days: WeeklyDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDaysIso(weekStart, i);
    const record = recordByDate.get(date);
    return {
      date,
      label: DAY_LABELS[i],
      stressBefore: record?.stress_before ?? null,
      stressAfter: record?.stress_after ?? null,
      mistakes: trades.filter((t) => t.date === date && t.mistake).length,
      decisionQuality: record?.decision_quality ?? null,
      hasRecord: Boolean(record),
    };
  });

  const measured = trades.filter(
    (t) => t.status === "closed" && t.r_result !== null,
  );
  const stats = computeRStats(measured.map((t) => t.r_result as number));
  const planCompliantCount = trades.filter((t) => t.plan_compliant).length;

  return {
    days,
    stats,
    tradeCount: trades.length,
    planCompliantCount,
    disciplineCompliance:
      trades.length > 0
        ? round2((planCompliantCount / trades.length) * 100)
        : null,
    avgStressBefore: average(dayRecords.map((r) => r.stress_before)),
    avgStressAfter: average(dayRecords.map((r) => r.stress_after)),
    mistakesCount: trades.filter((t) => t.mistake).length,
    lapsesCount: trades.filter((t) => t.discipline_lapse).length,
    topLosingAttitude: mostCommon([
      ...dayRecords.flatMap((r) => r.losing_attitudes_observed ?? []),
      ...trades
        .filter((t) => t.losing_attitude_present)
        .map((t) => t.attitude_tag),
    ]),
    topWinningAttitude: mostCommon([
      ...dayRecords.flatMap((r) => r.winning_attitudes_applied ?? []),
      ...trades.map((t) => t.winning_attitude_applied),
    ]),
    topLapseType: mostCommon([
      ...dayRecords.map((r) => r.top_lapse_type),
      ...trades.filter((t) => t.discipline_lapse).map((t) => t.lapse_type),
    ]),
    decisionQualityCounts: countBy(
      dayRecords.map((r) => r.decision_quality),
    ),
    checkinsCompleted: {
      morning: dayRecords.filter((r) => r.morning_completed_at).length,
      evening: dayRecords.filter((r) => r.evening_completed_at).length,
    },
  };
}

function average(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0) return null;
  return round2(present.reduce((a, b) => a + b, 0) / present.length);
}

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

function countBy(values: (string | null)[]): { quality: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([quality, count]) => ({ quality, count }))
    .sort((a, b) => b.count - a.count);
}
