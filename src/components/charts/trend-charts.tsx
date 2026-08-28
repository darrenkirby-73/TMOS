"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartCard,
  ChartSeriesTooltip,
  ChartTooltip,
  axisTick,
} from "./chart-card";
import { formatPercent, formatR } from "@/lib/r";
import type { DisciplinePoint, GroupTrend, PeriodPoint } from "@/lib/trends";

const rFormat = (v: number) => formatR(v);
const pctFormat = (v: number) => formatPercent(v);
const oneDp = (v: number) => v.toFixed(1);

/**
 * Recharts joins across nulls unless told otherwise. Every series here uses
 * connectNulls={false} so a period with nothing recorded reads as a gap
 * rather than an interpolated line through data that doesn't exist.
 */
const GAPPED = { connectNulls: false, strokeWidth: 2, dot: false } as const;

const PERIOD_NOUN = { week: "week", month: "month" } as const;
export type PeriodName = keyof typeof PERIOD_NOUN;

function periodNote(period: PeriodName, suffix: string): string {
  return `By ${PERIOD_NOUN[period]} · ${suffix}`;
}

/** Expectancy per period — the headline "is the process improving" chart. */
export function ExpectancyTrend({
  data,
  period,
}: {
  data: PeriodPoint[];
  period: PeriodName;
}) {
  if (data.length === 0) {
    return (
      <ChartCard
        title="Expectancy over time"
        empty="No closed trades with an R result yet."
      />
    );
  }
  return (
    <ChartCard
      title="Expectancy over time"
      note={periodNote(period, "mean R per trade; empty periods are gaps, not zeros")}
      table={
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">Period</th>
              <th className="py-1 font-medium">Trades</th>
              <th className="py-1 font-medium">Expectancy</th>
              <th className="py-1 font-medium">Win rate</th>
              <th className="py-1 font-medium">Avg win</th>
              <th className="py-1 font-medium">Avg loss</th>
              <th className="py-1 font-medium">Total R</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.key} className="border-t border-border-subtle">
                <td className="py-1">{d.label}</td>
                <td className="metric py-1">{d.trades}</td>
                <td className="metric py-1">{formatR(d.expectancy)}</td>
                <td className="metric py-1">{formatPercent(d.winRate)}</td>
                <td className="metric py-1">{formatR(d.avgWinR)}</td>
                <td className="metric py-1">{formatR(d.avgLossR)}</td>
                <td className="metric py-1">{formatR(d.totalR)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              tickMargin={8}
            />
            <YAxis tickLine={false} axisLine={false} tick={axisTick} width={48} />
            <ReferenceLine y={0} stroke="var(--faint)" strokeWidth={1} />
            <Tooltip
              cursor={{ fill: "var(--chart-grid)" }}
              content={<ChartTooltip formatter={rFormat} />}
            />
            <Bar dataKey="expectancy" radius={[4, 4, 0, 0]}>
              {data.map((d) => (
                <Cell
                  key={d.key}
                  fill={
                    (d.expectancy ?? 0) >= 0
                      ? "var(--positive)"
                      : "var(--negative)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/** Win rate and trade volume, which have to be read together. */
export function WinRateTrend({
  data,
  period,
}: {
  data: PeriodPoint[];
  period: PeriodName;
}) {
  if (data.length === 0) {
    return <ChartCard title="Win rate over time" empty="No closed trades yet." />;
  }
  return (
    <ChartCard
      title="Win rate over time"
      note={periodNote(period, "winners as a share of decided trades")}
      table={
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">Period</th>
              <th className="py-1 font-medium">Win rate</th>
              <th className="py-1 font-medium">Trades</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.key} className="border-t border-border-subtle">
                <td className="py-1">{d.label}</td>
                <td className="metric py-1">{formatPercent(d.winRate)}</td>
                <td className="metric py-1">{d.trades}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              tickMargin={8}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              width={48}
            />
            <Tooltip content={<ChartTooltip formatter={pctFormat} />} />
            <Line
              type="monotone"
              dataKey="winRate"
              stroke="var(--series-1)"
              {...GAPPED}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/** How much you traded — context for every other line on the page. */
export function VolumeTrend({
  data,
  period,
}: {
  data: PeriodPoint[];
  period: PeriodName;
}) {
  if (data.length === 0) {
    return <ChartCard title="Trades per period" empty="No closed trades yet." />;
  }
  return (
    <ChartCard
      title="Trades per period"
      note={periodNote(period, "closed trades carrying an R")}
    >
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              tickMargin={8}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              width={48}
            />
            <Tooltip
              cursor={{ fill: "var(--chart-grid)" }}
              content={<ChartTooltip formatter={(v) => String(v)} />}
            />
            <Bar
              dataKey="trades"
              fill="var(--series-1)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/** Two-series legend rendered as text, so series are never colour-only. */
function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-4">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5 text-xs text-muted">
          <span
            aria-hidden
            className="inline-block h-0.5 w-4 rounded"
            style={{ background: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function PlanComplianceTrend({
  data,
  period,
}: {
  data: DisciplinePoint[];
  period: PeriodName;
}) {
  if (data.length === 0) {
    return <ChartCard title="Plan compliance" empty="No trades logged yet." />;
  }
  return (
    <ChartCard
      title="Plan compliance"
      note={periodNote(period, "share of trades that followed the plan")}
      table={
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">Period</th>
              <th className="py-1 font-medium">Compliant</th>
              <th className="py-1 font-medium">Trades</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.key} className="border-t border-border-subtle">
                <td className="py-1">{d.label}</td>
                <td className="metric py-1">{formatPercent(d.planCompliance)}</td>
                <td className="metric py-1">{d.trades}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              tickMargin={8}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              width={48}
            />
            <Tooltip content={<ChartTooltip formatter={pctFormat} />} />
            <Line
              type="monotone"
              dataKey="planCompliance"
              stroke="var(--series-1)"
              {...GAPPED}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/** Mistakes and lapses: the two lines you want falling. */
export function MistakeTrend({
  data,
  period,
}: {
  data: DisciplinePoint[];
  period: PeriodName;
}) {
  if (data.length === 0) {
    return <ChartCard title="Mistakes and lapses" empty="No trades logged yet." />;
  }
  return (
    <ChartCard
      title="Mistakes and lapses"
      note={periodNote(period, "share of trades flagged; lower is better")}
      table={
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">Period</th>
              <th className="py-1 font-medium">Mistakes</th>
              <th className="py-1 font-medium">Lapses</th>
              <th className="py-1 font-medium">Trades</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.key} className="border-t border-border-subtle">
                <td className="py-1">{d.label}</td>
                <td className="metric py-1">{formatPercent(d.mistakeRate)}</td>
                <td className="metric py-1">{formatPercent(d.lapseRate)}</td>
                <td className="metric py-1">{d.trades}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              tickMargin={8}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              width={48}
            />
            <Tooltip content={<ChartSeriesTooltip formatter={pctFormat} />} />
            <Line
              type="monotone"
              dataKey="mistakeRate"
              name="Mistakes"
              stroke="var(--series-1)"
              {...GAPPED}
            />
            <Line
              type="monotone"
              dataKey="lapseRate"
              name="Discipline lapses"
              stroke="var(--series-2)"
              {...GAPPED}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Legend
        items={[
          { label: "Mistakes", color: "var(--series-1)" },
          { label: "Discipline lapses", color: "var(--series-2)" },
        ]}
      />
    </ChartCard>
  );
}

export function StressTrend({
  data,
  period,
}: {
  data: DisciplinePoint[];
  period: PeriodName;
}) {
  const hasAny = data.some(
    (d) => d.stressBefore !== null || d.stressAfter !== null,
  );
  if (!hasAny) {
    return (
      <ChartCard
        title="Stress over time"
        empty="No check-ins have recorded stress yet."
      />
    );
  }
  return (
    <ChartCard
      title="Stress over time"
      note={periodNote(period, "mean of the check-ins that recorded it, 1–5")}
      table={
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">Period</th>
              <th className="py-1 font-medium">Before</th>
              <th className="py-1 font-medium">After</th>
              <th className="py-1 font-medium">Energy</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.key} className="border-t border-border-subtle">
                <td className="py-1">{d.label}</td>
                <td className="metric py-1">
                  {d.stressBefore === null ? "—" : d.stressBefore.toFixed(1)}
                </td>
                <td className="metric py-1">
                  {d.stressAfter === null ? "—" : d.stressAfter.toFixed(1)}
                </td>
                <td className="metric py-1">
                  {d.energyBefore === null ? "—" : d.energyBefore.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              tickMargin={8}
            />
            <YAxis
              domain={[1, 5]}
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              width={48}
            />
            <Tooltip content={<ChartSeriesTooltip formatter={oneDp} />} />
            <Line
              type="monotone"
              dataKey="stressBefore"
              name="Before"
              stroke="var(--series-1)"
              {...GAPPED}
            />
            <Line
              type="monotone"
              dataKey="stressAfter"
              name="After"
              stroke="var(--series-2)"
              {...GAPPED}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <Legend
        items={[
          { label: "Before the session", color: "var(--series-1)" },
          { label: "After the session", color: "var(--series-2)" },
        ]}
      />
    </ChartCard>
  );
}

/**
 * Small multiples rather than one chart with a line per group. Five setups on
 * a shared axis is five colours to tell apart; five small panels on a shared
 * scale compares shapes directly and stays readable regardless of colour
 * vision. The y-domain is shared so panel heights mean the same thing.
 */
export function GroupTrendGrid({
  groups,
  period,
  dimensionLabel,
}: {
  groups: GroupTrend[];
  period: PeriodName;
  dimensionLabel: string;
}) {
  if (groups.length === 0) {
    return (
      <ChartCard
        title={`${dimensionLabel} over time`}
        empty="No closed trades with an R result yet."
      />
    );
  }

  const all = groups.flatMap((g) =>
    g.points.map((p) => p.expectancy).filter((v): v is number => v !== null),
  );
  const max = Math.max(1, ...all.map(Math.abs));
  const domain: [number, number] = [-max, max];

  return (
    <ChartCard
      title={`${dimensionLabel} over time`}
      note={periodNote(
        period,
        "expectancy per panel on a shared scale; gaps are periods it wasn't traded",
      )}
      table={
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">{dimensionLabel}</th>
              <th className="py-1 font-medium">Trades</th>
              <th className="py-1 font-medium">Overall expectancy</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.group} className="border-t border-border-subtle">
                <td className="py-1">{g.group}</td>
                <td className="metric py-1">{g.totalTrades}</td>
                <td className="metric py-1">{formatR(g.overallExpectancy)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.group}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">{g.group}</span>
              <span className="text-xs text-muted">
                <span className="metric">{formatR(g.overallExpectancy)}</span>
                {" · "}
                <span className="metric">{g.totalTrades}</span>{" "}
                {g.totalTrades === 1 ? "trade" : "trades"}
              </span>
            </div>
            <div className="mt-1 h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={g.points}
                  margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
                >
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ ...axisTick, fontSize: 10 }}
                    tickMargin={4}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={domain}
                    tickLine={false}
                    axisLine={false}
                    tick={{ ...axisTick, fontSize: 10 }}
                    width={40}
                  />
                  <ReferenceLine y={0} stroke="var(--faint)" strokeWidth={1} />
                  <Tooltip content={<ChartTooltip formatter={rFormat} />} />
                  <Line
                    type="monotone"
                    dataKey="expectancy"
                    stroke="var(--series-1)"
                    connectNulls={false}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
