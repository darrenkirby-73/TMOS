"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckboxField,
  Field,
  ScaleField,
  SectionHeading,
  SuggestionHint,
  inputClass,
} from "@/components/ui/form";
import { MultiTagField } from "@/components/ui/multi-tag";
import { useToast } from "@/components/ui/toast";
import type { DaySuggestions } from "@/lib/day-suggestions";
import type { DayRecord, Tag } from "@/lib/types";
import { DECISION_QUALITIES, STRESS_TRENDS } from "@/lib/types";
import { saveEveningCheckin } from "./actions";

/** Pre-fill priority: saved value, else the trade-log suggestion. */
function initial(saved: number | null | undefined, suggested: number | null) {
  if (saved !== null && saved !== undefined) return String(saved);
  if (suggested !== null) return String(suggested);
  return "";
}

export function EveningForm({
  date,
  record,
  suggestions,
  tags,
}: {
  date: string;
  record: DayRecord | null;
  suggestions: DaySuggestions;
  tags: Tag[];
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(
    record?.evening_completed_at ?? null,
  );

  const eveningDone = Boolean(record?.evening_completed_at);

  const [traded, setTraded] = useState(
    eveningDone ? (record?.traded ?? false) : suggestions.traded,
  );
  const [stressAfter, setStressAfter] = useState(record?.stress_after ?? 3);
  const [numTrades, setNumTrades] = useState(
    initial(eveningDone ? record?.num_trades : null, suggestions.numTrades),
  );
  const [totalR, setTotalR] = useState(
    initial(
      eveningDone ? record?.total_r_today : null,
      suggestions.totalRToday,
    ),
  );
  const [planCompliant, setPlanCompliant] = useState(
    initial(
      eveningDone ? record?.plan_compliant_trades : null,
      suggestions.planCompliantTrades,
    ),
  );
  const [mistakes, setMistakes] = useState(
    initial(
      eveningDone ? record?.mistakes_count : null,
      suggestions.mistakesCount,
    ),
  );
  const [lapses, setLapses] = useState(
    initial(
      eveningDone ? record?.discipline_lapses_count : null,
      suggestions.disciplineLapsesCount,
    ),
  );
  const [topLapse, setTopLapse] = useState(
    record?.top_lapse_type ?? suggestions.topLapseType ?? "",
  );
  const [losing, setLosing] = useState<string[]>(
    record?.losing_attitudes_observed ?? suggestions.losingAttitudes,
  );
  const [winning, setWinning] = useState<string[]>(
    record?.winning_attitudes_applied ?? suggestions.winningAttitudes,
  );

  const lapseTags = tags
    .filter((t) => t.category === "lapse_type")
    .map((t) => t.label);
  const losingTags = tags
    .filter((t) => t.category === "losing_attitude")
    .map((t) => t.label);
  const winningTags = tags
    .filter((t) => t.category === "winning_attitude")
    .map((t) => t.label);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveEveningCheckin(form);
      if (result.ok) {
        toast("Evening check-in saved");
        setSavedAt(savedAt ?? new Date().toISOString());
      } else {
        setError(result.error);
        toast(result.error, "error");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <input type="hidden" name="date" value={date} />

      {suggestions.closedWithoutR > 0 || suggestions.openTrades > 0 ? (
        <div className="card p-4 text-sm">
          <p className="font-medium">Before you debrief</p>
          <p className="mt-1 text-muted">
            {suggestions.openTrades > 0
              ? `${suggestions.openTrades} trade${suggestions.openTrades === 1 ? " is" : "s are"} still open. `
              : ""}
            {suggestions.closedWithoutR > 0
              ? `${suggestions.closedWithoutR} closed trade${suggestions.closedWithoutR === 1 ? " has" : "s have"} no R recorded — today's total R suggestion excludes ${suggestions.closedWithoutR === 1 ? "it" : "them"}.`
              : ""}
          </p>
        </div>
      ) : null}

      <section className="card grid gap-5 p-6 sm:grid-cols-2">
        <SectionHeading>The day</SectionHeading>
        <div className="sm:col-span-2">
          <CheckboxField
            label="I traded today"
            name="traded"
            checked={traded}
            onChange={setTraded}
          />
        </div>
        <ScaleField
          label="Stress after"
          name="stress_after"
          value={stressAfter}
          onChange={setStressAfter}
        />
        <Field label="Stress trend" hint="vs this morning">
          <select
            name="stress_trend"
            defaultValue={record?.stress_trend ?? "stable"}
            className={inputClass}
          >
            {STRESS_TRENDS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="card grid gap-4 p-6 sm:grid-cols-3">
        <SectionHeading>Numbers — suggested from your trade log</SectionHeading>
        <Field
          label="Number of trades"
          hint={
            <SuggestionHint
              value={suggestions.numTrades}
              applied={numTrades === String(suggestions.numTrades)}
              onApply={() => setNumTrades(String(suggestions.numTrades))}
            />
          }
        >
          <input
            name="num_trades"
            type="number"
            min="0"
            step="1"
            value={numTrades}
            onChange={(e) => setNumTrades(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          label="Total R today"
          hint={
            <SuggestionHint
              value={suggestions.totalRToday}
              applied={totalR === String(suggestions.totalRToday)}
              onApply={() => setTotalR(String(suggestions.totalRToday ?? ""))}
            />
          }
        >
          <input
            name="total_r_today"
            type="number"
            step="any"
            value={totalR}
            onChange={(e) => setTotalR(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          label="Plan-compliant trades"
          hint={
            <SuggestionHint
              value={suggestions.planCompliantTrades}
              applied={planCompliant === String(suggestions.planCompliantTrades)}
              onApply={() =>
                setPlanCompliant(String(suggestions.planCompliantTrades))
              }
            />
          }
        >
          <input
            name="plan_compliant_trades"
            type="number"
            min="0"
            step="1"
            value={planCompliant}
            onChange={(e) => setPlanCompliant(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          label="Mistakes"
          hint={
            <SuggestionHint
              value={suggestions.mistakesCount}
              applied={mistakes === String(suggestions.mistakesCount)}
              onApply={() => setMistakes(String(suggestions.mistakesCount))}
            />
          }
        >
          <input
            name="mistakes_count"
            type="number"
            min="0"
            step="1"
            value={mistakes}
            onChange={(e) => setMistakes(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field
          label="Discipline lapses"
          hint={
            <SuggestionHint
              value={suggestions.disciplineLapsesCount}
              applied={lapses === String(suggestions.disciplineLapsesCount)}
              onApply={() =>
                setLapses(String(suggestions.disciplineLapsesCount))
              }
            />
          }
        >
          <input
            name="discipline_lapses_count"
            type="number"
            min="0"
            step="1"
            value={lapses}
            onChange={(e) => setLapses(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Top lapse type" hint="optional">
          <input
            name="top_lapse_type"
            list="evening-lapse-tags"
            value={topLapse}
            onChange={(e) => setTopLapse(e.target.value)}
            className={inputClass}
          />
          <datalist id="evening-lapse-tags">
            {lapseTags.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </Field>
      </section>

      <section className="card flex flex-col gap-5 p-6">
        <SectionHeading>Attitudes</SectionHeading>
        <MultiTagField
          label="Losing attitudes observed"
          name="losing_attitudes_observed"
          options={losingTags}
          selected={losing}
          onChange={setLosing}
        />
        <MultiTagField
          label="Winning attitudes applied"
          name="winning_attitudes_applied"
          options={winningTags}
          selected={winning}
          onChange={setWinning}
        />
      </section>

      <section className="card flex flex-col gap-4 p-6">
        <SectionHeading>Decision quality</SectionHeading>
        <Field label="Overall decision quality today" className="sm:max-w-xs">
          <select
            name="decision_quality"
            defaultValue={record?.decision_quality ?? "good"}
            className={inputClass}
          >
            {DECISION_QUALITIES.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Worst decision today" hint="optional">
          <textarea
            name="worst_decision_note"
            rows={2}
            defaultValue={record?.worst_decision_note ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Best catch today" hint="optional">
          <textarea
            name="best_catch_note"
            rows={2}
            defaultValue={record?.best_catch_note ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="One adjustment for tomorrow" hint="optional">
          <textarea
            name="tomorrow_adjustment"
            rows={2}
            defaultValue={record?.tomorrow_adjustment ?? ""}
            className={inputClass}
          />
        </Field>
      </section>

      {error ? (
        <p className="text-sm text-negative" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-4">
        {savedAt ? (
          <span className="text-sm text-muted">
            Completed{" "}
            {new Date(savedAt).toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : savedAt ? "Update debrief" : "Complete debrief"}
        </Button>
      </div>
    </form>
  );
}
