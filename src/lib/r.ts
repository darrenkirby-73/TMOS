import type { Direction } from "@/lib/types";

/**
 * R-multiple math. Everything here produces SUGGESTIONS: calculated values
 * are shown to the user for review and are never written to the database
 * without an explicit save, never silently overwrite a user-entered value,
 * and are disabled entirely for complex trades (is_complex_trade = true),
 * which require manual R entry.
 */

/** Distance between entry and stop — the per-share risk. */
export function stopDistance(entryPrice: number, stopPrice: number): number {
  return Math.abs(entryPrice - stopPrice);
}

/**
 * Suggested initial risk (1R) in account currency from entry, stop, and
 * quantity. The user reviews this against the risk_amount_gbp they enter.
 */
export function suggestedRiskAmount(
  entryPrice: number,
  stopPrice: number,
  quantity: number,
): number | null {
  if (
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(stopPrice) ||
    !Number.isFinite(quantity) ||
    entryPrice <= 0 ||
    stopPrice <= 0 ||
    quantity <= 0 ||
    entryPrice === stopPrice
  ) {
    return null;
  }
  return round2(stopDistance(entryPrice, stopPrice) * quantity);
}

/** Raw P&L in account currency. Long: (exit − entry) × qty; short reversed. */
export function rawPnl(
  direction: Direction,
  entryPrice: number,
  exitPrice: number,
  quantity: number,
): number {
  const perShare =
    direction === "long" ? exitPrice - entryPrice : entryPrice - exitPrice;
  return perShare * quantity;
}

/**
 * Suggested R for a SIMPLE trade: raw_pnl / risk_amount_gbp.
 * Returns null when inputs are missing/invalid — the UI then asks for
 * manual entry instead of guessing.
 */
export function suggestedR(args: {
  direction: Direction;
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  riskAmountGbp: number;
}): number | null {
  const { direction, entryPrice, exitPrice, quantity, riskAmountGbp } = args;
  if (
    exitPrice === null ||
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(exitPrice) ||
    !Number.isFinite(quantity) ||
    !Number.isFinite(riskAmountGbp) ||
    entryPrice <= 0 ||
    exitPrice <= 0 ||
    quantity <= 0 ||
    riskAmountGbp <= 0
  ) {
    return null;
  }
  return round2(rawPnl(direction, entryPrice, exitPrice, quantity) / riskAmountGbp);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Format an R value for display, e.g. "+2.5R" / "−0.8R". */
export function formatR(r: number | null | undefined): string {
  if (r === null || r === undefined) return "—";
  const sign = r > 0 ? "+" : "";
  return `${sign}${r.toFixed(2)}R`;
}

/** Format a percentage for display — whole numbers keep the UI calm. */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value)}%`;
}

/** Format a GBP amount for display. */
export function formatGbp(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(amount);
}
