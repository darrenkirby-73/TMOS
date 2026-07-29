"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckboxField,
  Field,
  ScaleField,
  SectionHeading,
  inputClass,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { defaultChecklist, resetChecklist } from "@/lib/checklist";
import type { ChecklistItem, DayRecord, Tag } from "@/lib/types";
import { saveMorningCheckin } from "./actions";

export function MorningForm({
  date,
  record,
  previousChecklist,
  tags,
}: {
  date: string;
  record: DayRecord | null;
  previousChecklist: ChecklistItem[] | null;
  tags: Tag[];
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(
    record?.morning_completed_at ?? null,
  );

  const [stress, setStress] = useState(record?.stress_before ?? 3);
  const [energy, setEnergy] = useState(record?.energy_before ?? 7);
  const [conditionsOk, setConditionsOk] = useState(
    record?.conditions_acceptable ?? true,
  );
  const [commitment, setCommitment] = useState(
    record?.decision_commitment ?? false,
  );
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    record?.discipline_checklist ??
      (previousChecklist ? resetChecklist(previousChecklist) : defaultChecklist()),
  );

  const winningTags = tags.filter((t) => t.category === "winning_attitude");
  const losingTags = tags.filter((t) => t.category === "losing_attitude");

  function toggleItem(id: string, checked: boolean) {
    setChecklist((items) =>
      items.map((i) => (i.id === id ? { ...i, checked } : i)),
    );
  }

  function editLabel(id: string, label: string) {
    setChecklist((items) =>
      items.map((i) => (i.id === id ? { ...i, label } : i)),
    );
  }

  function addItem() {
    setChecklist((items) => [
      ...items,
      { id: `item-${Date.now()}`, label: "", checked: false },
    ]);
  }

  function removeItem(id: string) {
    setChecklist((items) => items.filter((i) => i.id !== id));
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    form.set("discipline_checklist", JSON.stringify(checklist));
    startTransition(async () => {
      const result = await saveMorningCheckin(form);
      if (result.ok) {
        toast("Morning check-in saved");
        setSavedAt(savedAt ?? new Date().toISOString());
      } else {
        setError(result.error);
        toast(result.error, "error");
      }
    });
  }

  const checkedCount = checklist.filter((i) => i.checked).length;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <input type="hidden" name="date" value={date} />

      <section className="card grid gap-4 p-6 sm:grid-cols-3">
        <SectionHeading>Risk plan</SectionHeading>
        <Field label="Planned risk per trade (%)" hint="0.25–0.50 guideline">
          <input
            name="planned_risk_per_trade"
            type="number"
            step="0.05"
            min="0"
            required
            defaultValue={record?.planned_risk_per_trade ?? 0.25}
            className={inputClass}
          />
        </Field>
        <Field label="Max daily risk (%)" hint="1.0 guideline">
          <input
            name="max_daily_risk"
            type="number"
            step="0.05"
            min="0"
            required
            defaultValue={record?.max_daily_risk ?? 1.0}
            className={inputClass}
          />
        </Field>
        <Field label="Max trades planned" hint="optional">
          <input
            name="max_trades_planned"
            type="number"
            step="1"
            min="0"
            defaultValue={record?.max_trades_planned ?? ""}
            className={inputClass}
          />
        </Field>
      </section>

      <section className="card grid gap-5 p-6 sm:grid-cols-2">
        <SectionHeading>State &amp; conditions</SectionHeading>
        <ScaleField
          label="Stress before"
          name="stress_before"
          value={stress}
          onChange={setStress}
        />
        <ScaleField
          label="Energy before"
          name="energy_before"
          value={energy}
          onChange={setEnergy}
        />
        <div className="sm:col-span-2">
          <CheckboxField
            label="Market conditions acceptable for my system"
            name="conditions_acceptable"
            checked={conditionsOk}
            onChange={setConditionsOk}
          />
        </div>
      </section>

      <section className="card grid gap-4 p-6 sm:grid-cols-2">
        <SectionHeading>Attitude</SectionHeading>
        <Field label="Winning attitude to focus on">
          <input
            name="winning_attitude_focus"
            list="morning-winning-tags"
            defaultValue={record?.winning_attitude_focus ?? ""}
            className={inputClass}
          />
          <datalist id="morning-winning-tags">
            {winningTags.map((t) => (
              <option key={t.id} value={t.label} />
            ))}
          </datalist>
        </Field>
        <Field label="Losing attitude to watch for" hint="optional">
          <input
            name="losing_attitude_watch"
            list="morning-losing-tags"
            defaultValue={record?.losing_attitude_watch ?? ""}
            className={inputClass}
          />
          <datalist id="morning-losing-tags">
            {losingTags.map((t) => (
              <option key={t.id} value={t.label} />
            ))}
          </datalist>
        </Field>
      </section>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Discipline checklist
          </h3>
          <span className="metric text-sm text-muted">
            {checkedCount}/{checklist.length}
          </span>
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {checklist.map((item) => (
            <li key={item.id} className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => toggleItem(item.id, e.target.checked)}
                aria-label={item.label || "Checklist item"}
                className="h-4 w-4 shrink-0 accent-[var(--accent)]"
              />
              <input
                value={item.label}
                onChange={(e) => editLabel(item.id, e.target.value)}
                placeholder="Checklist item"
                className={`${inputClass} border-transparent bg-transparent px-1 py-1`}
              />
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label="Remove item"
                className="shrink-0 px-2 text-muted hover:text-negative"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={addItem}
          className="mt-3 text-sm text-accent hover:underline"
        >
          + Add item
        </button>
        <p className="mt-3 text-xs text-faint">
          Items are yours to edit — starter items are placeholders, not rules.
        </p>
      </section>

      <section className="card flex flex-col gap-4 p-6">
        <SectionHeading>Decision process</SectionHeading>
        <Field
          label="Decision sequence"
          hint="the order you will follow before any entry"
        >
          <textarea
            name="decision_sequence"
            rows={3}
            defaultValue={record?.decision_sequence ?? ""}
            placeholder="e.g. Trend filter → setup quality → 3R path → size → no-trade filters → enter"
            className={inputClass}
          />
        </Field>
        <CheckboxField
          label="I commit to following this sequence today"
          name="decision_commitment"
          checked={commitment}
          onChange={setCommitment}
        />
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
          {pending
            ? "Saving…"
            : savedAt
              ? "Update check-in"
              : "Complete check-in"}
        </Button>
      </div>
    </form>
  );
}
