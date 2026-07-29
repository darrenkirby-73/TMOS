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
