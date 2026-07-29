"use client";

import {
  DecisionQualityChart,
  MistakesByDayChart,
  StressTrendChart,
} from "@/components/charts/weekly-charts";
import { formatPercent, formatR } from "@/lib/r";
import type { WeeklySummary } from "@/lib/weekly";

function Card({
  label,
  value,
  tone,
  note,
  /** Attitude labels are free text and can be long — render them smaller. */
  small = false,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
  note?: string;
  small?: boolean;
}) {
  return (
    <div className="card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`metric font-semibold ${small ? "mt-1 text-base leading-snug" : "text-2xl"} ${
          tone === "positive"
            ? "text-positive"
            : tone === "negative"
              ? "text-negative"
              : ""
        }`}
      >
        {value}
      </p>
      {note ? <p className="mt-0.5 text-xs text-faint">{note}</p> : null}
    </div>
  );
}

export function WeeklySummaryView({ summary }: { summary: WeeklySummary }) {
  const {
    stats,
    disciplineCompliance,
    planCompliantCount,
    tradeCount,
    avgStressBefore,
    avgStressAfter,
    mistakesCount,
    lapsesCount,
    topLosingAttitude,
    topWinningAttitude,
    topLapseType,
    checkinsCompleted,
    days,
    decisionQualityCounts,
  } = summary;

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-label="Week summary"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <Card
          label="Total R"
          value={stats.count > 0 ? formatR(stats.totalR) : "—"}
          tone={
            stats.totalR > 0
              ? "positive"
              : stats.totalR < 0
                ? "negative"
                : undefined
          }
          note={`${stats.count} closed trade${stats.count === 1 ? "" : "s"} with R`}
        />
        <Card
          label="Discipline compliance"
          value={formatPercent(disciplineCompliance)}
          note={
            tradeCount > 0
              ? `${planCompliantCount} of ${tradeCount} trades followed the plan`
              : "No trades this week"
          }
        />
        <Card
          label="Avg stress before"
          value={avgStressBefore !== null ? String(avgStressBefore) : "—"}
          note={`${checkinsCompleted.morning} morning check-in${checkinsCompleted.morning === 1 ? "" : "s"}`}
        />
        <Card
          label="Avg stress after"
          value={avgStressAfter !== null ? String(avgStressAfter) : "—"}
          note={`${checkinsCompleted.evening} evening check-in${checkinsCompleted.evening === 1 ? "" : "s"}`}
        />
        <Card
          label="Mistakes"
          value={String(mistakesCount)}
          note="Trades flagged as mistakes"
        />
        <Card
          label="Discipline lapses"
          value={String(lapsesCount)}
          note={topLapseType ? `Most common: ${topLapseType}` : "None recorded"}
        />
        <Card
          label="Top losing attitude"
          value={topLosingAttitude ?? "—"}
          small
        />
        <Card
          label="Top winning attitude"
          value={topWinningAttitude ?? "—"}
          small
        />
      </section>

      <StressTrendChart days={days} />
      <MistakesByDayChart days={days} />
      <DecisionQualityChart counts={decisionQualityCounts} />
    </div>
  );
}
