"use client";

import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltip } from "./chart-card";
import { formatPercent, formatR } from "@/lib/r";
import type { TrendDelta } from "@/lib/trends";

/**
 * Compact direction-of-travel strip for the dashboard. The tiles above it are
 * all-time aggregates, which say nothing about whether things are getting
 * better — this answers that in one glance without becoming a second Reports
 * page.
 */
/**
 * `format` is a NAME, not a function, and deliberately so: this is a client
 * component rendered from the dashboard server component, and React cannot
 * serialize a function across that boundary — passing one throws at request
 * time, which a `force-dynamic` page will not surface until someone loads it.
 */
export type StripMeasure = {
  label: string;
  delta: TrendDelta;
  format: FormatName;
  goodWhen: "higher" | "lower";
};

export type FormatName = "r" | "percent";

const FORMATTERS: Record<FormatName, (v: number | null) => string> = {
  r: formatR,
  percent: formatPercent,
};

function Delta({ measure }: { measure: StripMeasure }) {
  const format = FORMATTERS[measure.format];
  const { latest, previousAverage, delta } = measure.delta;
  const improving =
    delta === null || delta === 0
      ? null
      : measure.goodWhen === "higher"
        ? delta > 0
        : delta < 0;

  return (
    <div>
      <p className="text-xs text-muted">{measure.label}</p>
      <p className="metric mt-0.5 text-lg font-semibold">
        {format(latest)}
      </p>
      {delta === null ? (
        <p className="text-xs text-faint">
          {previousAverage === null && latest !== null
            ? "first week"
            : "no data yet"}
        </p>
      ) : (
        <p
          className={`text-xs ${
            improving === null
              ? "text-muted"
              : improving
                ? "text-positive"
                : "text-negative"
          }`}
        >
          {delta > 0 ? "+" : ""}
          {format(delta)} vs earlier
        </p>
      )}
    </div>
  );
}

export function TrendStrip({
  sparkline,
  measures,
  weeks,
}: {
  sparkline: { label: string; expectancy: number | null }[];
  measures: StripMeasure[];
  weeks: number;
}) {
  const plotted = sparkline.filter((p) => p.expectancy !== null).length;

  return (
    <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="grid grid-cols-3 gap-4">
        {measures.map((measure) => (
          <Delta key={measure.label} measure={measure} />
        ))}
      </div>
      <div className="h-16 w-full sm:w-56">
        {plotted < 2 ? (
          <p className="flex h-full items-center justify-center text-xs text-faint sm:justify-end">
            {plotted === 0
              ? "No closed trades yet"
              : "One week of history — no trend to draw yet"}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={sparkline}
              margin={{ top: 4, right: 2, bottom: 4, left: 2 }}
            >
              <ReferenceLine y={0} stroke="var(--faint)" strokeWidth={1} />
              <Tooltip
                content={<ChartTooltip formatter={(v) => formatR(v)} />}
              />
              <Line
                type="monotone"
                dataKey="expectancy"
                stroke="var(--series-1)"
                strokeWidth={2}
                dot={false}
                // Quiet weeks are gaps, never interpolated through.
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="text-xs text-faint sm:col-span-2">
        Weekly expectancy over the last {weeks} weeks. Each figure compares the
        most recent week against the average of the weeks before it.
      </p>
    </div>
  );
}
