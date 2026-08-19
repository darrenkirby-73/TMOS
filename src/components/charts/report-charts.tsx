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
import { ChartCard, ChartTooltip, axisTick } from "./chart-card";
import { formatPercent, formatR } from "@/lib/r";
import type { RStats } from "@/lib/stats";

const rFormatter = (v: number) => formatR(v);

/** Cumulative R after each closed trade, in chronological order. */
export function EquityCurve({
  data,
}: {
  data: { index: number; label: string; cumulative: number }[];
}) {
  if (data.length === 0) {
    return (
      <ChartCard
        title="Cumulative R"
        empty="No closed trades with an R result yet."
      />
    );
  }
  return (
    <ChartCard
      title="Cumulative R"
      note="Every closed trade with a recorded R, oldest first"
      table={
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">#</th>
              <th className="py-1 font-medium">Trade</th>
              <th className="py-1 font-medium">Cumulative R</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.index} className="border-t border-border-subtle">
                <td className="metric py-1">{d.index}</td>
                <td className="py-1">{d.label}</td>
                <td className="metric py-1">{formatR(d.cumulative)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="index"
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              width={48}
            />
            <ReferenceLine y={0} stroke="var(--faint)" strokeWidth={1} />
            <Tooltip
              content={
                <ChartTooltip formatter={rFormatter} labelPrefix="Trade " />
              }
              cursor={{ stroke: "var(--faint)", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/** R per trade. Sign is encoded by position around the zero baseline as
 *  well as colour, so the chart never relies on colour alone. */
export function RPerTradeChart({
  data,
}: {
  data: { index: number; label: string; r: number }[];
}) {
  if (data.length === 0) {
    return (
      <ChartCard
        title="R per trade"
        empty="No closed trades with an R result yet."
      />
    );
  }
  return (
    <ChartCard
      title="R per trade"
      note="Above the line is a win, below is a loss"
      table={
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">#</th>
              <th className="py-1 font-medium">Trade</th>
              <th className="py-1 font-medium">R</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.index} className="border-t border-border-subtle">
                <td className="metric py-1">{d.index}</td>
                <td className="py-1">{d.label}</td>
                <td className="metric py-1">{formatR(d.r)}</td>
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
              dataKey="index"
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              width={48}
            />
            <ReferenceLine y={0} stroke="var(--faint)" strokeWidth={1} />
            <Tooltip
              content={
                <ChartTooltip formatter={rFormatter} labelPrefix="Trade " />
              }
              cursor={{ fill: "var(--chart-grid)" }}
            />
            <Bar dataKey="r" radius={[4, 4, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell
                  key={d.index}
                  fill={
                    d.r >= 0
                      ? "var(--chart-positive)"
                      : "var(--chart-negative)"
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

/** Rolling expectancy over a trailing window of closed trades. */
export function RollingExpectancyChart({
  data,
  window,
  totalTrades,
}: {
  data: { index: number; expectancy: number }[];
  window: number;
  totalTrades: number;
}) {
  if (data.length === 0) {
    return (
      <ChartCard
        title={`Rolling ${window}-trade expectancy`}
        empty={`Needs ${window} closed trades with an R result — you have ${totalTrades}.`}
      />
    );
  }
  return (
    <ChartCard
      title={`Rolling ${window}-trade expectancy`}
      note={`Mean R over the trailing ${window} trades`}
      table={
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">Through trade #</th>
              <th className="py-1 font-medium">Expectancy</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.index} className="border-t border-border-subtle">
                <td className="metric py-1">{d.index}</td>
                <td className="metric py-1">{formatR(d.expectancy)}</td>
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
              dataKey="index"
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              width={48}
            />
            <ReferenceLine y={0} stroke="var(--faint)" strokeWidth={1} />
            <Tooltip
              content={
                <ChartTooltip formatter={rFormatter} labelPrefix="Through trade " />
              }
              cursor={{ stroke: "var(--faint)", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="expectancy"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

/** Total R by group (setup / system / trade type) with a full stats table. */
export function GroupPerformance({
  title,
  groups,
}: {
  title: string;
  groups: { key: string; stats: RStats }[];
}) {
  if (groups.length === 0) {
    return <ChartCard title={title} empty="No closed trades with an R result yet." />;
  }
  const data = groups.map((g) => ({ key: g.key, total: g.stats.totalR }));
  const height = Math.max(140, data.length * 44);

  return (
    <ChartCard
      title={title}
      note="Total R by group; expand for the full breakdown"
      table={
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">Group</th>
              <th className="py-1 text-right font-medium">Trades</th>
              <th className="py-1 text-right font-medium">Win rate</th>
              <th className="py-1 text-right font-medium">Avg win</th>
              <th className="py-1 text-right font-medium">Avg loss</th>
              <th className="py-1 text-right font-medium">Expectancy</th>
              <th className="py-1 text-right font-medium">Total R</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.key} className="border-t border-border-subtle">
                <td className="py-1">{g.key}</td>
                <td className="metric py-1 text-right">{g.stats.count}</td>
                <td className="metric py-1 text-right">
                  {formatPercent(g.stats.winRate)}
                </td>
                <td className="metric py-1 text-right">
                  {formatR(g.stats.avgWinR)}
                </td>
                <td className="metric py-1 text-right">
                  {formatR(g.stats.avgLossR)}
                </td>
                <td className="metric py-1 text-right">
                  {formatR(g.stats.expectancy)}
                </td>
                <td className="metric py-1 text-right">
                  {formatR(g.stats.totalR)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={axisTick}
            />
            <YAxis
              type="category"
              dataKey="key"
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              width={130}
            />
            <ReferenceLine x={0} stroke="var(--faint)" strokeWidth={1} />
            <Tooltip
              content={<ChartTooltip formatter={rFormatter} />}
              cursor={{ fill: "var(--chart-grid)" }}
            />
            <Bar dataKey="total" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell
                  key={d.key}
                  fill={
                    d.total >= 0
                      ? "var(--chart-positive)"
                      : "var(--chart-negative)"
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
