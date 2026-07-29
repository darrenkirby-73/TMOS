import { formatR } from "@/lib/r";
import { computeRStats, statsByGroup } from "@/lib/stats";
import type { DayRecord, Trade } from "@/lib/types";
import type { WeeklySummary } from "@/lib/weekly";
import type { ContextKind } from "./workflows/types";

/**
 * Assembles the stored-data context sent to the coach.
 *
 * Everything here is rendered from the user's own records. Where a record is
 * absent, the payload says so explicitly — the coach must never be handed a
 * plausible-looking placeholder it might treat as real.
 */

export type CoachContext = {
  todayRecord?: DayRecord | null;
  recentTrades?: Trade[];
  allClosedTrades?: Trade[];
  weekDayRecords?: DayRecord[];
  weekTrades?: Trade[];
  weeklySummary?: WeeklySummary | null;
  weekStart?: string;
  today?: string;
};

const MISSING = "NOT RECORDED";

function val(v: unknown): string {
  if (v === null || v === undefined || v === "") return MISSING;
  if (Array.isArray(v)) return v.length > 0 ? v.join(", ") : MISSING;
  if (typeof v === "boolean") return v ? "yes" : "no";
  return String(v);
}

function renderDayRecord(record: DayRecord | null | undefined, label: string) {
  if (!record) {
    return `${label}: NO RECORD — the user has not completed this check-in. Do not infer its contents.`;
  }
  const checklist = record.discipline_checklist ?? [];
  const checked = checklist.filter((i) => i.checked).length;
  return `${label} (${record.date}):
- Morning check-in completed: ${record.morning_completed_at ? "yes" : "NO"}
- Evening check-in completed: ${record.evening_completed_at ? "yes" : "NO"}
- Planned risk per trade: ${val(record.planned_risk_per_trade)}%
- Max daily risk: ${val(record.max_daily_risk)}%
- Max trades planned: ${val(record.max_trades_planned)}
- Stress before: ${val(record.stress_before)} | Energy before: ${val(record.energy_before)}
- Stress after: ${val(record.stress_after)} | Stress trend: ${val(record.stress_trend)}
- Conditions acceptable: ${val(record.conditions_acceptable)}
- Winning attitude focus: ${val(record.winning_attitude_focus)}
- Losing attitude to watch: ${val(record.losing_attitude_watch)}
- Discipline checklist: ${checklist.length > 0 ? `${checked}/${checklist.length} ticked` : MISSING}
- Decision sequence: ${val(record.decision_sequence)}
- Committed to sequence: ${val(record.decision_commitment)}
- Traded: ${val(record.traded)} | Trades: ${val(record.num_trades)} | Total R: ${val(record.total_r_today)}
- Plan-compliant trades: ${val(record.plan_compliant_trades)} | Mistakes: ${val(record.mistakes_count)} | Lapses: ${val(record.discipline_lapses_count)}
- Top lapse type: ${val(record.top_lapse_type)}
- Losing attitudes observed: ${val(record.losing_attitudes_observed)}
- Winning attitudes applied: ${val(record.winning_attitudes_applied)}
- Decision quality: ${val(record.decision_quality)}
- Worst decision: ${val(record.worst_decision_note)}
- Best catch: ${val(record.best_catch_note)}
- Tomorrow's adjustment: ${val(record.tomorrow_adjustment)}`;
}

function renderTradeLine(t: Trade): string {
  const flags = [
    t.plan_compliant ? null : "NOT plan compliant",
    t.mistake ? "MISTAKE" : null,
    t.discipline_lapse ? `lapse: ${t.lapse_type ?? "unspecified"}` : null,
    t.losing_attitude_present
      ? `losing attitude: ${t.attitude_tag ?? "unspecified"}`
      : null,
    t.is_complex_trade ? "complex (R entered manually)" : null,
  ].filter(Boolean);
  return `- ${t.date} ${t.ticker} ${t.direction} | ${t.trade_type} | setup: ${val(t.setup)} | system: ${val(t.system)} | status: ${t.status} | risk £${t.risk_amount_gbp} | R: ${t.r_result === null ? MISSING : formatR(t.r_result)}${flags.length ? ` | ${flags.join("; ")}` : ""}`;
}

function renderTrades(trades: Trade[], label: string): string {
  if (trades.length === 0) {
    return `${label}: NONE LOGGED. Do not assume trades were taken.`;
  }
  return `${label} (${trades.length}):\n${trades.map(renderTradeLine).join("\n")}`;
}

function renderClosedTradeStats(trades: Trade[]): string {
  const measured = trades.filter(
    (t) => t.status === "closed" && t.r_result !== null,
  );
  if (measured.length === 0) {
    return "No closed trades with a recorded R. There is no performance history to analyse yet — say so rather than inferring one.";
  }
  const stats = computeRStats(measured.map((t) => t.r_result as number));
  const bySetup = statsByGroup(
    measured,
    (t) => t.setup,
    (t) => t.r_result,
  );
  const byType = statsByGroup(
    measured,
    (t) => t.trade_type,
    (t) => t.r_result,
  );
  const openCount = trades.filter((t) => t.status === "open").length;
  const unresolved = trades.filter(
    (t) => t.status === "closed" && t.r_result === null,
  ).length;

  return `Pre-computed statistics over ${stats.count} closed trades with a recorded R:
- Win rate: ${stats.winRate ?? MISSING}% (${stats.winners} winners, ${stats.losers} losers, ${stats.scratches} scratches)
- Average winning R: ${formatR(stats.avgWinR)} | Average losing R: ${formatR(stats.avgLossR)}
- Expectancy (mean R per trade): ${formatR(stats.expectancy)}
- Total R: ${formatR(stats.totalR)}
- Mistakes flagged: ${measured.filter((t) => t.mistake).length} | Discipline lapses: ${measured.filter((t) => t.discipline_lapse).length} | Not plan compliant: ${measured.filter((t) => !t.plan_compliant).length}
- Excluded from these figures: ${openCount} open trade(s), ${unresolved} closed trade(s) with no R recorded

By setup:
${bySetup.map((g) => `- ${g.key}: ${g.stats.count} trades, expectancy ${formatR(g.stats.expectancy)}, total ${formatR(g.stats.totalR)}, win rate ${g.stats.winRate ?? MISSING}%`).join("\n")}

By trade type:
${byType.map((g) => `- ${g.key}: ${g.stats.count} trades, expectancy ${formatR(g.stats.expectancy)}, total ${formatR(g.stats.totalR)}`).join("\n")}`;
}

function renderWeeklySummary(
  summary: WeeklySummary,
  weekStart: string,
): string {
  return `Week beginning ${weekStart}:
- Check-ins completed: ${summary.checkinsCompleted.morning} morning, ${summary.checkinsCompleted.evening} evening (out of 7 days)
- Trades: ${summary.tradeCount} | Closed with R: ${summary.stats.count}
- Total R: ${summary.stats.count > 0 ? formatR(summary.stats.totalR) : MISSING}
- Expectancy: ${formatR(summary.stats.expectancy)} | Win rate: ${summary.stats.winRate ?? MISSING}%
- Discipline compliance: ${summary.disciplineCompliance ?? MISSING}% (${summary.planCompliantCount} of ${summary.tradeCount} trades followed the plan)
- Average stress before: ${summary.avgStressBefore ?? MISSING} | after: ${summary.avgStressAfter ?? MISSING}
- Mistakes: ${summary.mistakesCount} | Discipline lapses: ${summary.lapsesCount} | Most common lapse: ${val(summary.topLapseType)}
- Top losing attitude: ${val(summary.topLosingAttitude)} | Top winning attitude: ${val(summary.topWinningAttitude)}
- Decision quality by day: ${summary.decisionQualityCounts.length > 0 ? summary.decisionQualityCounts.map((c) => `${c.quality} ×${c.count}`).join(", ") : MISSING}

Day by day:
${summary.days.map((d) => `- ${d.label} ${d.date}: ${d.hasRecord ? `stress ${d.stressBefore ?? MISSING} → ${d.stressAfter ?? MISSING}, decision quality ${val(d.decisionQuality)}, mistakes ${d.mistakes}` : "NO CHECK-IN RECORDED"}`).join("\n")}`;
}

/** Render the requested context blocks into a single text payload. */
export function assembleContext(
  kinds: ContextKind[],
  ctx: CoachContext,
): string {
  const blocks: string[] = [];

  for (const kind of kinds) {
    switch (kind) {
      case "today_day_record":
        blocks.push(renderDayRecord(ctx.todayRecord, "Today's day record"));
        break;
      case "recent_trades":
        blocks.push(renderTrades(ctx.recentTrades ?? [], "Today's trades"));
        break;
      case "all_closed_trades":
        blocks.push(renderClosedTradeStats(ctx.allClosedTrades ?? []));
        blocks.push(
          renderTrades(
            (ctx.allClosedTrades ?? []).slice(-40),
            "Most recent trades (up to 40)",
          ),
        );
        break;
      case "week_day_records":
        if (ctx.weeklySummary && ctx.weekStart) {
          blocks.push(renderWeeklySummary(ctx.weeklySummary, ctx.weekStart));
        } else {
          blocks.push("Weekly summary: NOT AVAILABLE.");
        }
        break;
      case "week_trades":
        blocks.push(renderTrades(ctx.weekTrades ?? [], "This week's trades"));
        break;
      case "tags":
        break;
    }
  }

  return blocks.join("\n\n");
}

/** Render the user's typed inputs for this run. */
export function assembleInputs(inputs: Record<string, unknown>): string {
  const lines = Object.entries(inputs).map(
    ([key, value]) => `- ${key}: ${val(value)}`,
  );
  if (lines.length === 0) return "The user provided no additional inputs.";
  return `Inputs the user provided just now:\n${lines.join("\n")}`;
}
