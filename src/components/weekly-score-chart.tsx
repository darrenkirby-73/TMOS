"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type WeeklyScore = {
  /** Short label for the week, e.g. "May 4" */
  week: string;
  /** Average composite check-in score for that week, 1–10 */
  score: number;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-sm shadow-md">
      <div className="text-muted">Week of {label}</div>
      <div className="metric font-semibold">{payload[0].value.toFixed(1)}</div>
    </div>
  );
}

export function WeeklyScoreChart({ data }: { data: WeeklyScore[] }) {
  return (
    <div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border-subtle)"
              strokeDasharray="0"
            />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
              tickMargin={8}
            />
            <YAxis
              domain={[0, 10]}
              ticks={[0, 2.5, 5, 7.5, 10]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted)", fontSize: 12 }}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "var(--faint)", strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-muted">
          View data as table
        </summary>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-1 font-medium">Week</th>
              <th className="py-1 font-medium">Average score</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.week} className="border-t border-border-subtle">
                <td className="py-1">{d.week}</td>
                <td className="metric py-1">{d.score.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
