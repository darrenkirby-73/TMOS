"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  CheckboxField,
  Field,
  SectionHeading,
  inputClass,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { formatGbp, formatR, suggestedR, suggestedRiskAmount } from "@/lib/r";
import { todayIso } from "@/lib/dates";
import type { Tag, Trade } from "@/lib/types";
import { DECISION_QUALITIES, TRADE_TYPES } from "@/lib/types";
import { createTrade, updateTrade } from "./actions";

function TagDatalist({ id, tags }: { id: string; tags: Tag[] }) {
  return (
    <datalist id={id}>
      {tags.map((t) => (
        <option key={t.id} value={t.label} />
      ))}
    </datalist>
  );
}

export function TradeForm({
  open,
  onClose,
  trade,
  tags,
}: {
  open: boolean;
  onClose: () => void;
  trade: Trade | null; // null = create
  tags: Tag[];
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Controlled numeric fields drive the live R calculator
  const [direction, setDirection] = useState(trade?.direction ?? "long");
  const [entry, setEntry] = useState(trade?.entry_price?.toString() ?? "");
  const [stop, setStop] = useState(trade?.stop_price?.toString() ?? "");
  const [exit, setExit] = useState(trade?.exit_price?.toString() ?? "");
  const [qty, setQty] = useState(trade?.quantity?.toString() ?? "");
  const [risk, setRisk] = useState(trade?.risk_amount_gbp?.toString() ?? "");
  const [rResult, setRResult] = useState(trade?.r_result?.toString() ?? "");
  const [isComplex, setIsComplex] = useState(trade?.is_complex_trade ?? false);
  const [status, setStatus] = useState(trade?.status ?? "open");
  const [planCompliant, setPlanCompliant] = useState(
    trade?.plan_compliant ?? true,
  );
  const [mistake, setMistake] = useState(trade?.mistake ?? false);
  const [lapse, setLapse] = useState(trade?.discipline_lapse ?? false);
  const [losingAttitude, setLosingAttitude] = useState(
    trade?.losing_attitude_present ?? false,
  );

  const byCategory = useMemo(() => {
    const m: Record<string, Tag[]> = {};
    for (const t of tags) (m[t.category] ??= []).push(t);
    return m;
  }, [tags]);

  const suggestedRisk = useMemo(
    () => suggestedRiskAmount(Number(entry), Number(stop), Number(qty)),
    [entry, stop, qty],
  );

  const rSuggestion = useMemo(() => {
    if (isComplex) return null;
    return suggestedR({
      direction: direction as "long" | "short",
      entryPrice: Number(entry),
      exitPrice: exit === "" ? null : Number(exit),
      quantity: Number(qty),
      riskAmountGbp: Number(risk),
    });
  }, [isComplex, direction, entry, exit, qty, risk]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = trade
        ? await updateTrade(trade.id, form)
        : await createTrade(form);
      if (result.ok) {
        toast(trade ? "Trade updated" : "Trade saved");
        onClose();
      } else {
        setError(result.error);
        toast(result.error, "error");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={trade ? `Edit ${trade.ticker}` : "Log a trade"}
      wide
    >
      <form onSubmit={submit} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <SectionHeading>Basics</SectionHeading>
        <Field label="Date">
          <input
            type="date"
            name="date"
            required
            defaultValue={trade?.date ?? todayIso()}
            className={inputClass}
          />
        </Field>
        <Field label="Ticker">
          <input
            name="ticker"
            required
            defaultValue={trade?.ticker ?? ""}
            placeholder="AAPL"
            className={`${inputClass} uppercase`}
          />
        </Field>
        <Field label="Direction">
          <select
            name="direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value as "long" | "short")}
            className={inputClass}
          >
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </Field>
        <Field label="Trade type">
          <select
            name="trade_type"
            defaultValue={trade?.trade_type ?? "shadow"}
            className={inputClass}
          >
            {TRADE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as "open" | "closed")}
            className={inputClass}
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </Field>
        <Field label="Setup">
          <input
            name="setup"
            list="setup-tags"
            defaultValue={trade?.setup ?? ""}
            className={inputClass}
          />
          <TagDatalist id="setup-tags" tags={byCategory.setup ?? []} />
        </Field>
        <Field label="System">
          <input
            name="system"
            list="system-tags"
            defaultValue={trade?.system ?? ""}
            className={inputClass}
          />
          <TagDatalist id="system-tags" tags={byCategory.system ?? []} />
        </Field>

        <SectionHeading>Prices, size &amp; risk</SectionHeading>
        <Field label="Entry price">
          <input
            name="entry_price"
            type="number"
            step="any"
            min="0"
            required
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Stop price">
          <input
            name="stop_price"
            type="number"
            step="any"
            min="0"
            required
            value={stop}
            onChange={(e) => setStop(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Exit price" hint={status === "open" ? "optional" : ""}>
          <input
            name="exit_price"
            type="number"
            step="any"
            min="0"
            required={status === "closed"}
            value={exit}
            onChange={(e) => setExit(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Quantity">
          <input
            name="quantity"
            type="number"
            step="any"
            min="0"
            required
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Position size (£)" hint="optional">
          <input
            name="position_size"
            type="number"
            step="any"
            min="0"
            defaultValue={trade?.position_size ?? ""}
            className={inputClass}
          />
        </Field>
        <Field
          label="Risk (£) — your 1R"
          hint={
            suggestedRisk !== null ? (
              <>
                stop distance suggests {formatGbp(suggestedRisk)}{" "}
                <button
                  type="button"
                  className="text-accent underline"
                  onClick={() => setRisk(String(suggestedRisk))}
                >
                  use
                </button>
              </>
            ) : undefined
          }
        >
          <input
            name="risk_amount_gbp"
            type="number"
            step="any"
            min="0"
            required
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
            className={inputClass}
          />
        </Field>

        <SectionHeading>R result</SectionHeading>
        <div className="col-span-full">
          <CheckboxField
            label="Complex trade"
            name="is_complex_trade"
            checked={isComplex}
            onChange={setIsComplex}
            hint="partial exits / scaling — R must be entered manually"
          />
        </div>
        <Field
          label="R result"
          className="col-span-2"
          hint={
            isComplex ? (
              "manual entry required"
            ) : rSuggestion !== null ? (
              <>
                suggested {formatR(rSuggestion)}{" "}
                <button
                  type="button"
                  className="text-accent underline"
                  onClick={() => setRResult(String(rSuggestion))}
                >
                  use
                </button>
              </>
            ) : (
              "fill exit price for a suggestion"
            )
          }
        >
          <input
            name="r_result"
            type="number"
            step="any"
            required={status === "closed" && isComplex}
            value={rResult}
            onChange={(e) => setRResult(e.target.value)}
            placeholder={isComplex ? "Enter R manually" : ""}
            className={inputClass}
          />
        </Field>

        <SectionHeading>Process review</SectionHeading>
        <div className="col-span-full grid gap-3 sm:grid-cols-2">
          <CheckboxField
            label="Plan compliant"
            name="plan_compliant"
            checked={planCompliant}
            onChange={setPlanCompliant}
          />
          <CheckboxField
            label="Mistake"
            name="mistake"
            checked={mistake}
            onChange={setMistake}
          />
          <CheckboxField
            label="Discipline lapse"
            name="discipline_lapse"
            checked={lapse}
            onChange={setLapse}
          />
          <CheckboxField
            label="Losing attitude present"
            name="losing_attitude_present"
            checked={losingAttitude}
            onChange={setLosingAttitude}
          />
        </div>
        {lapse ? (
          <Field label="Lapse type" className="col-span-2">
            <input
              name="lapse_type"
              list="lapse-tags"
              defaultValue={trade?.lapse_type ?? ""}
              className={inputClass}
            />
            <TagDatalist id="lapse-tags" tags={byCategory.lapse_type ?? []} />
          </Field>
        ) : null}
        {losingAttitude ? (
          <Field label="Losing attitude tag" className="col-span-2">
            <input
              name="attitude_tag"
              list="losing-attitude-tags"
              defaultValue={trade?.attitude_tag ?? ""}
              className={inputClass}
            />
            <TagDatalist
              id="losing-attitude-tags"
              tags={byCategory.losing_attitude ?? []}
            />
          </Field>
        ) : null}
        <Field label="Winning attitude applied" className="col-span-2">
          <input
            name="winning_attitude_applied"
            list="winning-attitude-tags"
            defaultValue={trade?.winning_attitude_applied ?? ""}
            className={inputClass}
          />
          <TagDatalist
            id="winning-attitude-tags"
            tags={byCategory.winning_attitude ?? []}
          />
        </Field>
        <Field label="Decision quality">
          <select
            name="decision_quality"
            defaultValue={trade?.decision_quality ?? ""}
            className={inputClass}
          >
            <option value="">—</option>
            {DECISION_QUALITIES.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Stress before (0–10)">
          <input
            name="stress_before_trade"
            type="number"
            min="0"
            max="10"
            step="1"
            defaultValue={trade?.stress_before_trade ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Stress after (0–10)">
          <input
            name="stress_after_trade"
            type="number"
            min="0"
            max="10"
            step="1"
            defaultValue={trade?.stress_after_trade ?? ""}
            className={inputClass}
          />
        </Field>

        <SectionHeading>Notes &amp; screenshot</SectionHeading>
        <Field label="Notes" className="col-span-full">
          <textarea
            name="notes"
            rows={3}
            defaultValue={trade?.notes ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Screenshot" className="col-span-full" hint="image, max 5MB">
          <input
            type="file"
            name="screenshot"
            accept="image/*"
            className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:text-accent`}
          />
        </Field>

        {error ? (
          <p className="col-span-full text-sm text-negative" role="alert">
            {error}
          </p>
        ) : null}

        <div className="col-span-full mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : trade ? "Save changes" : "Save trade"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
