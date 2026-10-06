"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/form";
import { formatGbp, formatPercent } from "@/lib/r";
import { RISK_RULE_TEXT } from "@/lib/risk-rules";
import {
  calculateSize,
  checkLimits,
  sizingProblems,
  type Instrument,
  type SizingInput,
} from "@/lib/sizing";
import type { Direction } from "@/lib/types";

const INSTRUMENTS: { value: Instrument; label: string; hint: string }[] = [
  {
    value: "shares",
    label: "Shares",
    hint: "Any market. Size comes out as a whole number of shares.",
  },
  {
    value: "fx",
    label: "FX pair",
    hint: "Size comes out as base-currency units and standard lots.",
  },
];

export type RiskLimits = {
  perTradePercent: number;
  maxOpenRiskPercent: number;
  maxNewDailyRiskPercent: number;
};

/** A number field that distinguishes empty from zero. */
function numberValue(raw: string): number {
  return raw.trim() === "" ? NaN : Number(raw);
}

function Row({
  label,
  value,
  emphasis = false,
  note,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className={`text-sm ${emphasis ? "font-medium" : "text-muted"}`}>
        {label}
        {note ? (
          <span className="mt-0.5 block text-xs text-faint">{note}</span>
        ) : null}
      </span>
      <span
        className={`metric shrink-0 ${emphasis ? "text-lg font-semibold" : "text-sm"}`}
      >
        {value}
      </span>
    </div>
  );
}

export function SizingCalculator({
  equity,
  equityAsOfDate,
  limits,
  openTradeRisks,
  todayTradeRisks,
}: {
  /** Equity in force today, or null when none has been recorded. */
  equity: number | null;
  equityAsOfDate: string | null;
  limits: RiskLimits;
  openTradeRisks: number[];
  todayTradeRisks: number[];
}) {
  const [instrument, setInstrument] = useState<Instrument>("shares");
  const [direction, setDirection] = useState<Direction>("long");
  // Equity prefills from Settings but stays editable — sizing a hypothetical
  // against a different balance is a legitimate thing to want.
  const [equityRaw, setEquityRaw] = useState(equity === null ? "" : String(equity));
  const [riskRaw, setRiskRaw] = useState(String(limits.perTradePercent));
  const [entryRaw, setEntryRaw] = useState("");
  const [stopRaw, setStopRaw] = useState("");
  const [rateRaw, setRateRaw] = useState("1");

  const input: SizingInput = useMemo(
    () => ({
      instrument,
      direction,
      equity: numberValue(equityRaw),
      riskPercent: numberValue(riskRaw),
      entryPrice: numberValue(entryRaw),
      stopPrice: numberValue(stopRaw),
      rateToAccount: rateRaw.trim() === "" ? null : Number(rateRaw),
    }),
    [instrument, direction, equityRaw, riskRaw, entryRaw, stopRaw, rateRaw],
  );

  // Only complain once there is something to complain about — an untouched
  // form should not be covered in errors.
  const touched = entryRaw !== "" || stopRaw !== "";
  const problems = sizingProblems(input);
  const result = calculateSize(input);

  const limitCheck = result
    ? checkLimits({
        equity: input.equity,
        proposedRisk: result.realisedRisk,
        openTradeRisks,
        todayTradeRisks,
        maxOpenRiskPercent: limits.maxOpenRiskPercent,
        maxNewDailyRiskPercent: limits.maxNewDailyRiskPercent,
      })
    : null;

  const overPerTrade =
    result !== null && input.riskPercent > limits.perTradePercent;

  function reset() {
    setEntryRaw("");
    setStopRaw("");
    setRateRaw("1");
    setRiskRaw(String(limits.perTradePercent));
    setEquityRaw(equity === null ? "" : String(equity));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <section className="card flex flex-col gap-5 p-6">
        <div>
          <h2 className="text-base font-semibold">The trade</h2>
          <p className="mt-0.5 text-sm text-muted">
            Nothing here is fetched. Every figure is one you supply, including
            the exchange rate.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {INSTRUMENTS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={instrument === option.value}
              onClick={() => setInstrument(option.value)}
              className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                instrument === option.value
                  ? "bg-accent-soft font-medium text-accent"
                  : "border border-border-subtle text-muted hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="-mt-2 text-xs text-faint">
          {INSTRUMENTS.find((o) => o.value === instrument)!.hint}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Account equity (£)"
            hint={
              equityAsOfDate
                ? `From Settings, as at ${equityAsOfDate}`
                : "No equity recorded yet — add one in Settings"
            }
          >
            <input
              type="number"
              step="any"
              min="0"
              value={equityRaw}
              onChange={(e) => setEquityRaw(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field
            label="Risk this trade (%)"
            hint={`Your rule: ${RISK_RULE_TEXT.perTrade}`}
          >
            <input
              type="number"
              step="0.05"
              min="0"
              value={riskRaw}
              onChange={(e) => setRiskRaw(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Direction" hint="Determines which side the stop sits on">
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as Direction)}
              className={inputClass}
            >
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </Field>

          <Field
            label="Rate to GBP"
            hint="1 if the instrument is already in GBP"
          >
            <input
              type="number"
              step="any"
              min="0"
              value={rateRaw}
              onChange={(e) => setRateRaw(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Entry price" hint={instrument === "fx" ? "e.g. 1.2750" : ""}>
            <input
              type="number"
              step="any"
              min="0"
              value={entryRaw}
              onChange={(e) => setEntryRaw(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field
            label="Initial stop"
            hint={direction === "long" ? "Below the entry" : "Above the entry"}
          >
            <input
              type="number"
              step="any"
              min="0"
              value={stopRaw}
              onChange={(e) => setStopRaw(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        {touched && problems.length > 0 ? (
          <ul className="flex flex-col gap-1" role="alert">
            {problems.map((problem) => (
              <li key={problem.field + problem.message} className="text-sm text-negative">
                {problem.message}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={reset}>
            Reset
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="card p-6">
          <h2 className="text-base font-semibold">Size</h2>
          {result === null ? (
            <p className="mt-3 text-sm text-muted">
              Enter an entry and a stop to see a size. Nothing is estimated
              from partial input.
            </p>
          ) : (
            <>
              <div className="mt-3 divide-y divide-border-subtle">
                <Row
                  label={instrument === "fx" ? "Units (base currency)" : "Shares"}
                  value={result.units.toLocaleString("en-GB")}
                  emphasis
                />
                {result.lots !== null ? (
                  <Row label="Standard lots" value={result.lots.toString()} />
                ) : null}
                <Row
                  label="You actually risk"
                  value={formatGbp(result.realisedRisk)}
                  emphasis
                  note={`Target was ${formatGbp(result.targetRisk)} — size rounds down, so this comes in under`}
                />
                <Row
                  label="As % of equity"
                  value={formatPercent(result.realisedRiskPercent)}
                />
                <Row label="Notional exposure" value={formatGbp(result.notional)} />
              </div>

              {result.units === 0 ? (
                <p className="mt-4 text-sm text-negative">
                  One unit risks more than your whole per-trade budget. Either
                  the stop is too wide for this equity, or the instrument is
                  too large to trade at this risk level.
                </p>
              ) : null}
            </>
          )}
        </div>

        {result !== null ? (
          <div className="card p-6">
            <h2 className="text-base font-semibold">Workings</h2>
            <p className="mt-0.5 text-xs text-faint">
              Shown so you can check it rather than trust it.
            </p>
            <div className="mt-3 divide-y divide-border-subtle">
              <Row
                label="Risk per unit (instrument currency)"
                value={result.riskPerUnit.toString()}
                note="|entry − stop|"
              />
              <Row
                label="Risk per unit (GBP)"
                value={result.riskPerUnitInAccount.toString()}
                note="× rate to GBP"
              />
              <Row
                label="Target risk"
                value={formatGbp(result.targetRisk)}
                note={`${formatGbp(input.equity)} × ${input.riskPercent}%`}
              />
              <Row
                label="1R price"
                value={result.oneRPrice.toString()}
                note="Where the trade is +1R"
              />
              <Row
                label="3R price"
                value={result.threeRPrice.toString()}
                note="Your rule needs a plausible 3R path before major resistance"
              />
            </div>
          </div>
        ) : null}

        {limitCheck !== null ? (
          <div className="card p-6">
            <h2 className="text-base font-semibold">Against your limits</h2>
            <div className="mt-3 divide-y divide-border-subtle">
              <Row
                label="Open risk now"
                value={`${formatGbp(limitCheck.openRisk)} · ${formatPercent(limitCheck.openRiskPercent)}`}
                note={`Cap ${RISK_RULE_TEXT.maxOpen} · ${formatGbp(limitCheck.openRiskRemaining)} still available`}
              />
              <Row
                label="Risk opened today"
                value={`${formatGbp(limitCheck.todayRisk)} · ${formatPercent(limitCheck.todayRiskPercent)}`}
                note={`Cap ${RISK_RULE_TEXT.maxNewDaily} · ${formatGbp(limitCheck.dailyRiskRemaining)} still available`}
              />
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {overPerTrade ? (
                <p className="text-sm text-negative">
                  {input.riskPercent}% is above your per-trade rule of{" "}
                  {RISK_RULE_TEXT.perTrade}.
                </p>
              ) : null}
              {limitCheck.breachesOpenLimit ? (
                <p className="text-sm text-negative">
                  Taking this would push total open risk past{" "}
                  {RISK_RULE_TEXT.maxOpen} of equity.
                </p>
              ) : null}
              {limitCheck.breachesDailyLimit ? (
                <p className="text-sm text-negative">
                  Taking this would push today&apos;s new risk past{" "}
                  {RISK_RULE_TEXT.maxNewDaily} of equity.
                </p>
              ) : null}
              {!overPerTrade &&
              !limitCheck.breachesOpenLimit &&
              !limitCheck.breachesDailyLimit ? (
                <p className="text-sm text-positive">
                  Within all three of your risk limits.
                </p>
              ) : null}
            </div>

            <p className="mt-4 text-xs text-faint">
              Open and daily risk come from the risk you recorded on your own
              trades, not from prices. A trade logged without a risk amount
              cannot be counted.{" "}
              <Link href="/trades" className="text-accent hover:underline">
                Trade log
              </Link>
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
