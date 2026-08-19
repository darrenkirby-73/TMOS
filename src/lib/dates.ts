/**
 * Date helpers. Weeks start Monday, matching the Postgres
 * date_trunc('week', ...) used by the weekly views.
 *
 * "Today" is resolved in one fixed timezone rather than the runtime's local
 * zone. Server components and server actions run in UTC on most hosts while
 * the browser runs in the user's zone, so `new Date()` would disagree between
 * them — during BST, a check-in at 00:30 would be filed against the previous
 * day by the server while the trade form defaulted to the current one.
 * Single-user app, so a single configured zone is the honest fix.
 */
export const APP_TIMEZONE = "Europe/London";

/** The calendar date in `timeZone` at instant `d`, as YYYY-MM-DD. */
export function isoDateInTimezone(d: Date, timeZone: string): string {
  // en-CA renders ISO-style YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Today as YYYY-MM-DD, in the app's configured timezone. */
export function todayIso(): string {
  return isoDateInTimezone(new Date(), APP_TIMEZONE);
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

/**
 * True only for a real calendar date in YYYY-MM-DD form. Round-tripping
 * rejects values that JavaScript would silently roll over — "2026-02-30"
 * becomes 2 March, and "2026-13-45" lands in the following year, either of
 * which would quietly show the wrong period. Use this on anything arriving
 * from a URL before it reaches a query.
 */
export function isValidIsoDate(value: string | undefined | null): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseIsoDate(value);
  return !Number.isNaN(parsed.getTime()) && toIsoDate(parsed) === value;
}

/** A URL-supplied date, or today when it is missing or malformed. */
export function safeDateParam(value: string | undefined | null): string {
  return isValidIsoDate(value) ? (value as string) : todayIso();
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
