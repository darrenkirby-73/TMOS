"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard, axisTick } from "./chart-card";
import type { WeeklyDay } from "@/lib/weekly";

/** Stress before vs after, by day. Two series of the same 0–10 measure on
 *  one axis — legend plus a table so identity is never colour-alone. */
export function StressTrendChart({ days }: { days: WeeklyDay[] }) {
  const hasData = days.some(
    (d) => d.stressBefore !== null || d.stressAfter !== null,
  );
  if (!hasData) {
    return (
      <ChartCard
        title="Stress by day"
        empty="No stress scores recorded this week — complete a check-in to see the trend."
      />
    );
  }
  return (
    <ChartCard
      title="Stress by day"
      note="0–10, recorded at the morning and evening check-ins"
      table={
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">Day</th>
              <th className="py-1 font-medium">Before</th>
              <th className="py-1 font-medium">After</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date} className="border-t border-border-subtle">
                <td className="py-1">{d.label}</td>
                <td className="metric py-1">{d.stressBefore ?? "—"}</td>
                <td className="metric py-1">{d.stressAfter ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="mb-1 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-0.5 w-4 rounded"
            style={{ background: "var(--series-1)" }}
          />
          Before
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-0.5 w-4 rounded"
            style={{ background: "var(--series-2)" }}
          />
          After
        </span>
      </div>
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              tickMargin={8}
            />
            <YAxis
              domain={[0, 10]}
              ticks={[0, 5, 10]}
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 12,
                fontSize: 13,
              }}
              labelStyle={{ color: "var(--muted)" }}
              itemStyle={{ color: "var(--foreground)" }}
              cursor={{ stroke: "var(--faint)", strokeWidth: 1 }}
            />
            <Line
              name="Before"
              type="monotone"
              dataKey="stressBefore"
              stroke="var(--series-1)"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              name="After"
              type="monotone"
              dataKey="stressAfter"
              stroke="var(--series-2)"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function MistakesByDayChart({ days }: { days: WeeklyDay[] }) {
  const total = days.reduce((sum, d) => sum + d.mistakes, 0);
  if (total === 0) {
    return (
      <ChartCard
        title="Mistakes by day"
        empty="No mistakes flagged on this week's trades."
      />
    );
  }
  return (
    <ChartCard
      title="Mistakes by day"
      note="Trades you flagged as mistakes, separate from valid losses"
      table={
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">Day</th>
              <th className="py-1 font-medium">Mistakes</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date} className="border-t border-border-subtle">
                <td className="py-1">{d.label}</td>
                <td className="metric py-1">{d.mistakes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={days} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
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
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 12,
                fontSize: 13,
              }}
              labelStyle={{ color: "var(--muted)" }}
              itemStyle={{ color: "var(--foreground)" }}
              cursor={{ fill: "var(--chart-grid)" }}
            />
            <Bar
              name="Mistakes"
              dataKey="mistakes"
              fill="var(--chart-negative)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function DecisionQualityChart({
  counts,
}: {
  counts: { quality: string; count: number }[];
}) {
  if (counts.length === 0) {
    return (
      <ChartCard
        title="Decision quality"
        empty="No evening check-ins recorded this week."
      />
    );
  }
  return (
    <ChartCard
      title="Decision quality"
      note="Days by the rating you gave your decisions"
      table={
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">Rating</th>
              <th className="py-1 font-medium">Days</th>
            </tr>
          </thead>
          <tbody>
            {counts.map((c) => (
              <tr key={c.quality} className="border-t border-border-subtle">
                <td className="py-1">{c.quality}</td>
                <td className="metric py-1">{c.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={counts}
            layout="vertical"
            margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
            <XAxis
              type="number"
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={axisTick}
            />
            <YAxis
              type="category"
              dataKey="quality"
              tickLine={false}
              axisLine={false}
              tick={axisTick}
              width={70}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: 12,
                fontSize: 13,
              }}
              labelStyle={{ color: "var(--muted)" }}
              itemStyle={{ color: "var(--foreground)" }}
              cursor={{ fill: "var(--chart-grid)" }}
            />
            <Bar
              name="Days"
              dataKey="count"
              fill="var(--series-1)"
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
