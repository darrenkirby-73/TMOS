export function ScoreTile({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="card flex flex-col gap-1 p-5">
      <span className="text-sm text-muted">{label}</span>
      <span className="metric text-4xl font-semibold">
        {value ?? "—"}
        {value !== null ? (
          <span className="text-lg font-normal text-faint"> / 10</span>
        ) : null}
      </span>
    </div>
  );
}
