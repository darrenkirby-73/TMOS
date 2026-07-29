/**
 * Date helpers. All "today" logic is user-local (the user's clock), matching
 * how check-ins and trades are dated. Weeks start Monday, matching
 * Postgres date_trunc('week', ...) used by the weekly views.
 */

/** Local today as YYYY-MM-DD. */
export function todayIso(): string {
  return toIsoDate(new Date());
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday of the week containing the given ISO date. */
export function weekStartIso(isoDate: string): string {
  const d = parseIsoDate(isoDate);
  const dow = d.getDay(); // 0 = Sunday
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return toIsoDate(d);
}

export function addDaysIso(isoDate: string, days: number): string {
  const d = parseIsoDate(isoDate);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function parseIsoDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "Mon 6 Jul" style label. */
export function shortDayLabel(isoDate: string): string {
  return parseIsoDate(isoDate).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** "6 Jul – 12 Jul 2026" style label for a Monday-start week. */
export function weekRangeLabel(weekStartIsoDate: string): string {
  const start = parseIsoDate(weekStartIsoDate);
  const end = parseIsoDate(addDaysIso(weekStartIsoDate, 6));
  const startLabel = start.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  const endLabel = end.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}
