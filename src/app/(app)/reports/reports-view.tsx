"use client";

import { useMemo, useState } from "react";
import {
  EquityCurve,
  GroupPerformance,
  RPerTradeChart,
  RollingExpectancyChart,
} from "@/components/charts/report-charts";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass } from "@/components/ui/form";
import { formatPercent, formatR } from "@/lib/r";
import { computeRStats, cumulativeR, rollingExpectancy, statsByGroup } from "@/lib/stats";
import type { Trade } from "@/lib/types";
import { TRADE_TYPES } from "@/lib/types";

const ROLLING_WINDOW = 20;

type Dimension = "setup" | "system" | "trade_type";

const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: "setup", label: "Setup" },
  { value: "system", label: "System" },
  { value: "trade_type", label: "Trade type" },
];

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="card p-5">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`metric text-3xl font-semibold ${
          tone === "positive"
            ? "text-positive"
            : tone === "negative"
              ? "text-negative"
              : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function ReportsView({ trades }: { trades: Trade[] }) {
  const [dimension, setDimension] = useState<Dimension>("setup");
  const [tradeTypeFilter, setTradeTypeFilter] = useState("");

  // Only closed trades with a recorded R can be measured.
  const measured = useMemo(() => {
    return trades
      .filter((t) => t.status === "closed" && t.r_result !== null)
      .filter((t) => !tradeTypeFilter || t.trade_type === tradeTypeFilter)
      .slice()
      .sort((a, b) =>
        a.date === b.date
          ? a.created_at.localeCompare(b.created_at)
          : a.date.localeCompare(b.date),
      );
  }, [trades, tradeTypeFilter]);

  const rValues = measured.map((t) => t.r_result as number);
  const stats = computeRStats(rValues);

  const equityData = cumulativeR(rValues).map((cumulative, i) => ({
    index: i + 1,
    label: `${measured[i].ticker} · ${measured[i].date}`,
    cumulative,
  }));

  const barData = measured.map((t, i) => ({
    index: i + 1,
    label: `${t.ticker} · ${t.date}`,
    r: t.r_result as number,
  }));

  const rollingData = rollingExpectancy(rValues, ROLLING_WINDOW).map(
    (expectancy, i) => ({ index: i + ROLLING_WINDOW, expectancy }),
  );

  const groups = useMemo(() => {
    if (dimension === "trade_type") {
      return statsByGroup(
        measured,
        (t) =>
          TRADE_TYPES.find((x) => x.value === t.trade_type)?.label ??
          t.trade_type,
        (t) => t.r_result,
      );
    }
    return statsByGroup(
      measured,
      (t) => t[dimension],
      (t) => t.r_result,
    );
  }, [measured, dimension]);

  const openCount = trades.filter((t) => t.status === "open").length;
  const unresolvedCount = trades.filter(
    (t) => t.status === "closed" && t.r_result === null,
  ).length;

  if (trades.length === 0) {
    return (
      <EmptyState title="No trades logged yet">
        Reports appear once you have closed trades with a recorded R.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card flex flex-wrap items-end gap-4 p-4">
        <Field label="Trade type">
          <select
            value={tradeTypeFilter}
            onChange={(e) => setTradeTypeFilter(e.target.value)}
            className={inputClass}
          >
            <option value="">All</option>
            {TRADE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <p className="ml-auto text-xs text-muted">
          Measuring {stats.count} closed trade
          {stats.count === 1 ? "" : "s"} with a recorded R
          {openCount > 0 || unresolvedCount > 0
            ? ` · excluded: ${openCount} open, ${unresolvedCount} closed without R`
            : ""}
        </p>
      </div>

      {stats.count === 0 ? (
        <EmptyState title="Nothing to measure yet">
          Close a trade and record its R to see performance statistics.
        </EmptyState>
      ) : (
        <>
          <section
            aria-label="Headline statistics"
            className="grid grid-cols-2 gap-4 lg:grid-cols-5"
          >
            <StatTile
              label="Win rate"
              value={formatPercent(stats.winRate)}
            />
            <StatTile label="Avg R winner" value={formatR(stats.avgWinR)} />
            <StatTile label="Avg R loser" value={formatR(stats.avgLossR)} />
            <StatTile
              label="Expectancy"
              value={formatR(stats.expectancy)}
              tone={
                (stats.expectancy ?? 0) > 0
                  ? "positive"
                  : (stats.expectancy ?? 0) < 0
                    ? "negative"
                    : undefined
              }
            />
            <StatTile
              label="Total R"
              value={formatR(stats.totalR)}
              tone={
                stats.totalR > 0
                  ? "positive"
                  : stats.totalR < 0
                    ? "negative"
                    : undefined
              }
            />
          </section>

          <EquityCurve data={equityData} />
          <RPerTradeChart data={barData} />
          <RollingExpectancyChart
            data={rollingData}
            window={ROLLING_WINDOW}
            totalTrades={stats.count}
          />

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Performance by</span>
              {DIMENSIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  aria-pressed={dimension === d.value}
                  onClick={() => setDimension(d.value)}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    dimension === d.value
                      ? "bg-accent-soft font-medium text-accent"
                      : "border border-border-subtle text-muted hover:text-foreground"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <GroupPerformance
              title={`Performance by ${DIMENSIONS.find((d) => d.value === dimension)?.label.toLowerCase()}`}
              groups={groups}
            />
          </div>
        </>
      )}
    </div>
  );
}
