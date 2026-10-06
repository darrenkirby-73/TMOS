"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, inputClass } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { todayIso } from "@/lib/dates";
import { formatGbp } from "@/lib/r";
import { RISK_RULES } from "@/lib/risk-rules";
import {
  deleteEquity,
  saveEquity,
  saveRiskSettings,
  type ActionResult,
} from "./actions";

export type EquityEntry = {
  id: string;
  as_of_date: string;
  amount: number;
  note: string | null;
};

export type RiskLimitValues = {
  perTradePercent: number;
  maxOpenRiskPercent: number;
  maxNewDailyRiskPercent: number;
};

function useReport() {
  const { toast } = useToast();
  return (result: ActionResult) => {
    toast(result.ok ? result.message : result.error, result.ok ? "success" : "error");
    return result.ok;
  };
}

export function EquityEditor({ entries }: { entries: EquityEntry[] }) {
  const report = useReport();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<EquityEntry | "new" | null>(null);
  const [asOfDate, setAsOfDate] = useState(todayIso());
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [removing, setRemoving] = useState<EquityEntry | null>(null);

  function open(entry: EquityEntry | "new") {
    setEditing(entry);
    if (entry === "new") {
      setAsOfDate(todayIso());
      setAmount("");
      setNote("");
    } else {
      setAsOfDate(entry.as_of_date);
      setAmount(String(entry.amount));
      setNote(entry.note ?? "");
    }
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const id = editing === "new" ? undefined : editing.id;
    startTransition(async () => {
      const result = await saveEquity({
        id,
        asOfDate: asOfDate,
        amount: Number(amount),
        note,
      });
      if (report(result)) setEditing(null);
    });
  }

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Account equity</h2>
          <p className="mt-0.5 text-sm text-muted">
            What the account was worth, and when.
          </p>
          <p className="mt-0.5 text-xs text-faint">
            Kept as history rather than one current figure, so a trade can be
            judged against the equity at the time it was taken.
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={() => open("new")}>
          Add entry
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Nothing recorded yet. Position sizing works without it, but you&apos;ll
          retype the balance every time.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border-subtle">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 py-2"
            >
              <span className="min-w-0">
                <span className="metric text-sm font-medium">
                  {formatGbp(Number(entry.amount))}
                </span>
                <span className="metric ml-2 text-xs text-muted">
                  as at {entry.as_of_date}
                </span>
                {entry.note ? (
                  <span className="mt-0.5 block truncate text-xs text-faint">
                    {entry.note}
                  </span>
                ) : null}
              </span>
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => open(entry)}
                  className="rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:text-foreground"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setRemoving(entry)}
                  className="rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:text-negative"
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Add equity entry" : "Edit equity entry"}
      >
        <form onSubmit={save} className="flex flex-col gap-4">
          <Field label="As at" hint="The date this balance was true">
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Equity (£)" hint="Total account value">
            <input
              type="number"
              step="any"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputClass}
              autoFocus
            />
          </Field>
          <Field label="Note" hint="Optional — a deposit, a withdrawal, a reset">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remove equity entry"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            Remove the entry for{" "}
            <span className="metric font-medium">{removing?.as_of_date}</span>?
          </p>
          <p className="text-sm text-muted">
            Sizing done after this date will fall back to the next most recent
            entry, which may not be the balance you actually had.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={() => {
                const entry = removing;
                if (!entry) return;
                startTransition(async () => {
                  if (report(await deleteEquity(entry.id))) setRemoving(null);
                });
              }}
            >
              Remove
            </Button>
          </div>
        </div>
      </Dialog>
    </section>
  );
}

export function RiskLimitsEditor({ limits }: { limits: RiskLimitValues }) {
  const report = useReport();
  const [pending, startTransition] = useTransition();
  const [perTrade, setPerTrade] = useState(String(limits.perTradePercent));
  const [maxOpen, setMaxOpen] = useState(String(limits.maxOpenRiskPercent));
  const [maxDaily, setMaxDaily] = useState(String(limits.maxNewDailyRiskPercent));

  const perTradeNum = Number(perTrade);
  const concurrent = perTradeNum > 0 ? Number(maxOpen) / perTradeNum : 0;
  const perDay = perTradeNum > 0 ? Number(maxDaily) / perTradeNum : 0;

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      report(
        await saveRiskSettings({
          perTradePercent: Number(perTrade),
          maxOpenRiskPercent: Number(maxOpen),
          maxNewDailyRiskPercent: Number(maxDaily),
        }),
      );
    });
  }

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-base font-semibold">Risk limits</h2>
      <p className="mt-0.5 text-sm text-muted">
        Percentages of account equity. The position sizing calculator and the
        coach both work from these.
      </p>

      <form onSubmit={save} className="mt-4 flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Per trade (%)" hint={`Default ${RISK_RULES.perTradePercent}`}>
            <input
              type="number"
              step="0.05"
              min="0"
              value={perTrade}
              onChange={(e) => setPerTrade(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Max open risk (%)" hint="Across all open positions">
            <input
              type="number"
              step="0.05"
              min="0"
              value={maxOpen}
              onChange={(e) => setMaxOpen(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Max new daily risk (%)" hint="Opened in one day">
            <input
              type="number"
              step="0.05"
              min="0"
              value={maxDaily}
              onChange={(e) => setMaxDaily(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        {/* The ratios are what make the numbers coherent, so state them. */}
        <p className="text-xs text-faint">
          {Number.isFinite(concurrent) && concurrent > 0
            ? `These allow ${Math.floor(concurrent)} concurrent ${
                Math.floor(concurrent) === 1 ? "position" : "positions"
              } and ${Math.floor(perDay)} opened per day.`
            : "Enter a per-trade risk above zero to see what these allow."}
        </p>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save limits"}
          </Button>
        </div>
      </form>
    </section>
  );
}
