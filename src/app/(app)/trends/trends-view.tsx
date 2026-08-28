"use client";

import { useMemo, useState } from "react";
import {
  ExpectancyTrend,
  GroupTrendGrid,
  MistakeTrend,
  PlanComplianceTrend,
  StressTrend,
  VolumeTrend,
  WinRateTrend,
} from "@/components/charts/trend-charts";
import { formatPercent, formatR } from "@/lib/r";
import {
  compareLatest,
  disciplineByPeriod,
  groupTrendByPeriod,
  trendByPeriod,
  type Period,
} from "@/lib/trends";
import type { DayRecord, Trade } from "@/lib/types";

const PERIODS: { value: Period; label: string }[] = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

const DIMENSIONS = [
  { value: "setup", label: "Setup" },
  { value: "system", label: "System" },
] as const;

type Dimension = (typeof DIMENSIONS)[number]["value"];

function Toggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium">{label}</span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-full px-3 py-1 text-sm transition-colors ${
            value === option.value
              ? "bg-accent-soft font-medium text-accent"
              : "border border-border-subtle text-muted hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Direction of travel for one measure. States the comparison explicitly —
 * "latest vs the average before it" — because a bare arrow invites you to
 * read more into one period than it can support.
 */
function DeltaTile({
  title,
  values,
  format,
  goodWhen,
  unit,
}: {
  title: string;
  values: (number | null)[];
  format: (v: number | null) => string;
  /** Which direction counts as improvement for this measure. */
  goodWhen: "higher" | "lower";
  unit: string;
}) {
  const { latest, previousAverage, delta } = compareLatest(values);
  const improving =
    delta === null || delta === 0
      ? null
      : goodWhen === "higher"
        ? delta > 0
        : delta < 0;

  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{title}</p>
      <p className="metric mt-1 text-2xl font-semibold">{format(latest)}</p>
      {delta === null ? (
        <p className="mt-0.5 text-xs text-faint">
          {previousAverage === null && latest !== null
            ? "No earlier period to compare with yet"
            : "Not enough history yet"}
        </p>
      ) : (
        <p
          className={`mt-0.5 text-xs ${
            improving === null
              ? "text-muted"
              : improving
                ? "text-positive"
                : "text-negative"
          }`}
        >
          {delta > 0 ? "+" : ""}
          {format(delta)}
          {unit} vs {format(previousAverage)} average before
        </p>
      )}
    </div>
  );
}

export function TrendsView({
  trades,
  dayRecords,
}: {
  trades: Trade[];
  dayRecords: DayRecord[];
}) {
  const [period, setPeriod] = useState<Period>("week");
  const [dimension, setDimension] = useState<Dimension>("setup");

  const performance = useMemo(
    () => trendByPeriod(trades, period),
    [trades, period],
  );
  const discipline = useMemo(
    () => disciplineByPeriod(trades, dayRecords, period),
    [trades, dayRecords, period],
  );
  const groups = useMemo(
    () =>
      groupTrendByPeriod(trades, period, (t) =>
        dimension === "setup" ? t.setup : t.system,
      ),
    [trades, period, dimension],
  );

  const dimensionLabel = DIMENSIONS.find((d) => d.value === dimension)!.label;

  return (
    <div className="flex flex-col gap-6">
      <div className="card flex flex-wrap items-center justify-between gap-4 p-4">
        <Toggle
          label="Group by"
          value={period}
          options={PERIODS}
          onChange={setPeriod}
        />
        <p className="text-xs text-faint">
          Open trades and closed trades without an R are excluded from every
          performance measure. Discipline counts every logged trade.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-muted">Direction of travel</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DeltaTile
            title="Expectancy"
            values={performance.map((p) => p.expectancy)}
            format={formatR}
            goodWhen="higher"
            unit=""
          />
          <DeltaTile
            title="Win rate"
            values={performance.map((p) => p.winRate)}
            format={formatPercent}
            goodWhen="higher"
            unit=""
          />
          <DeltaTile
            title="Plan compliance"
            values={discipline.map((d) => d.planCompliance)}
            format={formatPercent}
            goodWhen="higher"
            unit=""
          />
          <DeltaTile
            title="Mistake rate"
            values={discipline.map((d) => d.mistakeRate)}
            format={formatPercent}
            goodWhen="lower"
            unit=""
          />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-muted">Performance</h2>
        <ExpectancyTrend data={performance} period={period} />
        <div className="grid gap-4 lg:grid-cols-2">
          <WinRateTrend data={performance} period={period} />
          <VolumeTrend data={performance} period={period} />
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-muted">Discipline</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <PlanComplianceTrend data={discipline} period={period} />
          <MistakeTrend data={discipline} period={period} />
        </div>
        <StressTrend data={discipline} period={period} />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-muted">By {dimensionLabel.toLowerCase()}</h2>
          <Toggle
            label="Break down by"
            value={dimension}
            options={DIMENSIONS}
            onChange={setDimension}
          />
        </div>
        <GroupTrendGrid
          groups={groups}
          period={period}
          dimensionLabel={dimensionLabel}
        />
      </section>
    </div>
  );
}
