import { round2, stopDistance, stopSideError } from "@/lib/r";
import type { Direction } from "@/lib/types";

/**
 * Position sizing.
 *
 * Both instrument modes reduce to the same identity:
 *
 *   units = risk in account currency ÷ (risk per unit × rate to account currency)
 *
 * For shares a "unit" is one share and the rate converts the instrument's
 * currency to the account's. For an FX pair a unit is one unit of the base
 * currency, risk per unit is the stop distance in the quote currency, and the
 * rate converts the quote currency to the account's. Lots are units ÷ 100,000
 * and are presentation only — the maths never works in lots or pips, so no
 * broker-specific pip convention is baked in.
 *
 * Three rules this module will not break:
 *
 *   1. Nothing is invented. No price, no exchange rate, no contract size is
 *      fetched or guessed; every input comes from the user. An absent rate is
 *      absent, not assumed to be 1.
 *   2. Size rounds DOWN. Rounding up puts more at risk than the limit allows,
 *      so a fractional share is dropped and the realised risk comes in under
 *      the target rather than over it.
 *   3. The realised risk is reported, not the requested risk. Rounding down
 *      means you almost never risk exactly the target, and showing the target
 *      as though it were the outcome would be a quiet lie.
 */

export type Instrument = "shares" | "fx";

/** One unit of the base currency in a standard FX lot. */
export const FX_UNITS_PER_LOT = 100_000;

export type SizingInput = {
  instrument: Instrument;
  direction: Direction;
  /** Account equity in the account currency. */
  equity: number;
  /** Percentage of equity to risk on this trade. */
  riskPercent: number;
  entryPrice: number;
  stopPrice: number;
  /**
   * Instrument currency (shares) or quote currency (FX) → account currency.
   * null when not supplied; 1 means same currency and must be stated, not
   * inferred, so a forgotten rate can never silently pass as parity.
   */
  rateToAccount: number | null;
};

export type SizingProblem = {
  field: "equity" | "riskPercent" | "entryPrice" | "stopPrice" | "rateToAccount";
  message: string;
};

export type SizingResult = {
  /** Target risk in account currency, before rounding. */
  targetRisk: number;
  /** Stop distance in the instrument's own currency, per unit. */
  riskPerUnit: number;
  /** Stop distance converted to the account currency, per unit. */
  riskPerUnitInAccount: number;
  /** Whole units affordable within the target risk. Shares, or base units. */
  units: number;
  /** FX only: units expressed as standard lots. */
  lots: number | null;
  /** What you actually risk at this size, after rounding down. */
  realisedRisk: number;
  /** realisedRisk as a percentage of equity. */
  realisedRiskPercent: number;
  /** Notional exposure in the account currency. */
  notional: number;
  /** Price 1R away from entry, in the trade's direction. */
  oneRPrice: number;
  /** Price 3R away from entry — the spec's minimum plausible upside. */
  threeRPrice: number;
};

function positive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Everything wrong with the inputs, rather than the first thing wrong, so the
 * form can show all of it at once instead of one error per attempt.
 */
export function sizingProblems(input: SizingInput): SizingProblem[] {
  const problems: SizingProblem[] = [];

  if (!positive(input.equity)) {
    problems.push({
      field: "equity",
      message: "Account equity must be a positive amount",
    });
  }
  if (!positive(input.riskPercent)) {
    problems.push({
      field: "riskPercent",
      message: "Risk percent must be greater than zero",
    });
  } else if (input.riskPercent > 100) {
    problems.push({
      field: "riskPercent",
      message: "Risk percent cannot exceed 100",
    });
  }
  if (!positive(input.entryPrice)) {
    problems.push({ field: "entryPrice", message: "Entry must be a positive price" });
  }
  if (!positive(input.stopPrice)) {
    problems.push({ field: "stopPrice", message: "Stop must be a positive price" });
  }
  if (
    positive(input.entryPrice) &&
    positive(input.stopPrice) &&
    input.entryPrice === input.stopPrice
  ) {
    problems.push({
      field: "stopPrice",
      message: "Entry and stop cannot be the same price — risk per unit would be zero",
    });
  }

  // A long stopping above its entry isn't a sizing question, it's a broken
  // trade: reuse the trade log's own rule rather than restating it.
  const sideError = stopSideError(
    input.direction,
    input.entryPrice,
    input.stopPrice,
  );
  if (sideError) problems.push({ field: "stopPrice", message: sideError });

  if (input.rateToAccount === null) {
    problems.push({
      field: "rateToAccount",
      message:
        "Enter the rate from the instrument's currency to your account currency — use 1 if they are the same",
    });
  } else if (!positive(input.rateToAccount)) {
    problems.push({
      field: "rateToAccount",
      message: "Exchange rate must be greater than zero",
    });
  }

  return problems;
}

/**
 * Returns null when the inputs can't support a calculation. The caller shows
 * `sizingProblems` instead — it never falls back to a partial or guessed size.
 */
export function calculateSize(input: SizingInput): SizingResult | null {
  if (sizingProblems(input).length > 0) return null;

  const rate = input.rateToAccount as number;
  const targetRisk = round2((input.equity * input.riskPercent) / 100);
  const riskPerUnit = stopDistance(input.entryPrice, input.stopPrice);
  const riskPerUnitInAccount = riskPerUnit * rate;

  // Rule 2: floor, so realised risk lands under the limit rather than over it.
  const units = Math.floor(targetRisk / riskPerUnitInAccount);

  const realisedRisk = round2(units * riskPerUnitInAccount);
  const direction = input.direction === "long" ? 1 : -1;

  return {
    targetRisk,
    // Both use roundSig, not round2: an FX stop distance of 0.0050 rounds to
    // 0.00 at two decimals, which would display a zero risk per unit beside a
    // six-figure position size. Display only — the maths above is unrounded.
    riskPerUnit: roundSig(riskPerUnit),
    riskPerUnitInAccount: roundSig(riskPerUnitInAccount),
    units,
    lots: input.instrument === "fx" ? roundSig(units / FX_UNITS_PER_LOT) : null,
    realisedRisk,
    realisedRiskPercent:
      input.equity > 0 ? round2((realisedRisk / input.equity) * 100) : 0,
    notional: round2(units * input.entryPrice * rate),
    oneRPrice: roundSig(input.entryPrice + direction * riskPerUnit),
    threeRPrice: roundSig(input.entryPrice + direction * riskPerUnit * 3),
  };
}

/**
 * Five significant figures. FX prices carry four or five decimals and a stop
 * distance can be 0.0005, which round2 would flatten to zero — reporting a
 * risk per unit of £0.00 and an infinite position size.
 */
export function roundSig(n: number): number {
  if (!Number.isFinite(n) || n === 0) return 0;
  const magnitude = Math.floor(Math.log10(Math.abs(n)));
  const factor = Math.pow(10, 4 - magnitude);
  return Math.round(n * factor) / factor;
}

export type LimitCheck = {
  /** Risk already committed across open positions, in account currency. */
  openRisk: number;
  /** Risk opened today, in account currency. */
  todayRisk: number;
  openRiskPercent: number;
  todayRiskPercent: number;
  /** True when adding this trade would exceed the limit. */
  breachesOpenLimit: boolean;
  breachesDailyLimit: boolean;
  /** Risk still available under each limit, floored at zero. */
  openRiskRemaining: number;
  dailyRiskRemaining: number;
};

/**
 * What a proposed trade does to the limits, given risk already committed.
 *
 * Counts risk from open positions and from trades opened today — the two
 * limits the spec sets beyond the per-trade one. A trade can satisfy the
 * per-trade limit and still be wrong because of what is already on.
 */
export function checkLimits(args: {
  equity: number;
  proposedRisk: number;
  /** risk_amount_gbp of currently open trades. */
  openTradeRisks: number[];
  /** risk_amount_gbp of trades dated today, open or closed. */
  todayTradeRisks: number[];
  maxOpenRiskPercent: number;
  maxNewDailyRiskPercent: number;
}): LimitCheck {
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const openRisk = round2(sum(args.openTradeRisks));
  const todayRisk = round2(sum(args.todayTradeRisks));

  const openCap = (args.equity * args.maxOpenRiskPercent) / 100;
  const dailyCap = (args.equity * args.maxNewDailyRiskPercent) / 100;

  return {
    openRisk,
    todayRisk,
    openRiskPercent: args.equity > 0 ? round2((openRisk / args.equity) * 100) : 0,
    todayRiskPercent: args.equity > 0 ? round2((todayRisk / args.equity) * 100) : 0,
    breachesOpenLimit: openRisk + args.proposedRisk > openCap,
    breachesDailyLimit: todayRisk + args.proposedRisk > dailyCap,
    openRiskRemaining: round2(Math.max(0, openCap - openRisk)),
    dailyRiskRemaining: round2(Math.max(0, dailyCap - todayRisk)),
  };
}

/**
 * The equity figure in force on a date: the most recent entry on or before it.
 * Returns null when no entry predates the date — sizing a trade against an
 * equity that didn't exist yet would be worse than refusing.
 */
export function equityAsOf(
  entries: { as_of_date: string; amount: number }[],
  isoDate: string,
): { as_of_date: string; amount: number } | null {
  const eligible = entries
    .filter((e) => e.as_of_date <= isoDate)
    .sort((a, b) => b.as_of_date.localeCompare(a.as_of_date));
  return eligible[0] ?? null;
}
