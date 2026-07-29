"use client";

export const inputClass =
  "w-full rounded-xl border border-border-subtle bg-background px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-50";

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm font-medium ${className}`}>
      <span>
        {label}
        {hint ? (
          <span className="ml-2 font-normal text-faint">{hint}</span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="col-span-full mt-2 border-b border-border-subtle pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </h3>
  );
}

export function CheckboxField({
  label,
  name,
  checked,
  onChange,
  hint,
}: {
  label: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--accent)]"
      />
      <span className="font-medium">{label}</span>
      {hint ? <span className="text-faint">{hint}</span> : null}
    </label>
  );
}

/** 0–10 scale input rendered as a range slider with a visible value. */
export function ScaleField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      <span className="flex items-center justify-between">
        {label}
        <span className="metric text-base">{value}</span>
      </span>
      <input
        type="range"
        name={name}
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-[var(--accent)]"
      />
    </label>
  );
}
