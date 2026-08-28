"use client";

/**
 * Shared frame for every chart: title, optional note, the plot, and a
 * collapsible table of the same data so identity is never colour-alone.
 */
export function ChartCard({
  title,
  note,
  children,
  table,
  empty,
}: {
  title: string;
  note?: string;
  /** Omitted when `empty` is set — there is no plot to draw. */
  children?: React.ReactNode;
  table?: React.ReactNode;
  empty?: string;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {note ? <p className="mt-0.5 text-xs text-faint">{note}</p> : null}
      {empty ? (
        <p className="py-14 text-center text-sm text-muted">{empty}</p>
      ) : (
        <>
          <div className="mt-4">{children}</div>
          {table ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-muted">
                View data as table
              </summary>
              <div className="mt-2 overflow-x-auto">{table}</div>
            </details>
          ) : null}
        </>
      )}
    </section>
  );
}

export const axisTick = { fill: "var(--muted)", fontSize: 12 };

/**
 * Tooltip for charts with more than one series. `ChartTooltip` reads
 * payload[0] only, which on a two-line chart shows one unlabelled number and
 * silently hides the other — so multi-series charts name every series and
 * omit the ones with nothing recorded for that period.
 */
export function ChartSeriesTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { value: number | null; name?: string; color?: string }[];
  label?: string | number;
  formatter: (value: number) => string;
}) {
  const entries = (payload ?? []).filter(
    (entry): entry is { value: number; name?: string; color?: string } =>
      entry.value !== null && entry.value !== undefined,
  );
  if (!active || entries.length === 0) return null;
  return (
    <div className="card px-3 py-2 text-sm shadow-lg">
      <div className="text-muted">{label}</div>
      <ul className="mt-1 flex flex-col gap-0.5">
        {entries.map((entry) => (
          <li
            key={entry.name}
            className="flex items-center justify-between gap-4"
          >
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-0.5 w-3 rounded"
                style={{ background: entry.color }}
              />
              {entry.name}
            </span>
            <span className="metric font-semibold">
              {formatter(entry.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChartTooltip({
  active,
  payload,
  label,
  labelPrefix = "",
  formatter,
}: {
  active?: boolean;
  payload?: { value: number; name?: string }[];
  label?: string | number;
  labelPrefix?: string;
  formatter: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-sm shadow-lg">
      <div className="text-muted">
        {labelPrefix}
        {label}
      </div>
      <div className="metric font-semibold">{formatter(payload[0].value)}</div>
    </div>
  );
}
