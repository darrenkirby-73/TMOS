"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { formatR } from "@/lib/r";
import {
  SYSTEM_STATUSES,
  type SystemStatus,
  type TradingSystem,
} from "@/lib/types";
import { deleteSystem, saveSystem, type SystemInput } from "../actions";

/** Per-system numbers, computed on the server from closed trades. */
export type SystemStats = {
  trades: number;
  expectancy: number | null;
  totalR: number | null;
};

const RULE_FIELDS: {
  name: keyof SystemInput;
  label: string;
  hint: string;
}[] = [
  {
    name: "entry_rules",
    label: "Entry",
    hint: "What has to be true before you take the trade.",
  },
  {
    name: "stop_rules",
    label: "Initial stop (1R)",
    hint: "Where the stop goes, and what defines the risk you're accepting.",
  },
  {
    name: "exit_rules",
    label: "Exit",
    hint: "Targets, trails, time stops — how the trade ends.",
  },
  {
    name: "position_sizing",
    label: "Position sizing",
    hint: "How size is derived from account risk. 0.25–0.50% per trade.",
  },
  {
    name: "edge_rationale",
    label: "Why this has an edge",
    hint: "What you believe makes it work, so you can test the belief later.",
  },
  {
    name: "notes",
    label: "Notes",
    hint: "Revisions, conditions it struggles in, anything else.",
  },
];

function emptyInput(): SystemInput {
  return {
    name: "",
    status: "testing",
    markets: "",
    timeframe: "",
    entry_rules: "",
    exit_rules: "",
    stop_rules: "",
    position_sizing: "",
    edge_rationale: "",
    notes: "",
  };
}

function toInput(system: TradingSystem): SystemInput {
  return {
    id: system.id,
    name: system.name,
    status: system.status,
    markets: system.markets ?? "",
    timeframe: system.timeframe ?? "",
    entry_rules: system.entry_rules ?? "",
    exit_rules: system.exit_rules ?? "",
    stop_rules: system.stop_rules ?? "",
    position_sizing: system.position_sizing ?? "",
    edge_rationale: system.edge_rationale ?? "",
    notes: system.notes ?? "",
  };
}

const STATUS_CLASS: Record<SystemStatus, string> = {
  active: "bg-accent-soft text-accent",
  testing: "border border-border-subtle text-muted",
  retired: "border border-border-subtle text-faint",
};

function StatsLine({ stats }: { stats: SystemStats | undefined }) {
  if (!stats || stats.trades === 0) {
    return (
      <p className="mt-2 text-xs text-faint">
        No closed trades logged against this name yet.
      </p>
    );
  }
  return (
    <p className="mt-2 text-xs text-muted">
      <span className="metric">{stats.trades}</span> closed{" "}
      {stats.trades === 1 ? "trade" : "trades"} · expectancy{" "}
      <span className="metric">{formatR(stats.expectancy)}</span> · total{" "}
      <span className="metric">{formatR(stats.totalR)}</span>
    </p>
  );
}

export function SystemsEditor({
  systems,
  stats,
  undefinedNames,
}: {
  systems: TradingSystem[];
  stats: Record<string, SystemStats>;
  /** System names appearing on trades with no definition written yet. */
  undefinedNames: string[];
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<SystemInput | null>(null);
  const [removing, setRemoving] = useState<TradingSystem | null>(null);

  function set<K extends keyof SystemInput>(key: K, value: SystemInput[K]) {
    setEditing((current) => (current ? { ...current, [key]: value } : current));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const input = editing;
    startTransition(async () => {
      const result = await saveSystem(input);
      toast(result.ok ? result.message : result.error, result.ok ? "success" : "error");
      if (result.ok) setEditing(null);
    });
  }

  function confirmRemove() {
    if (!removing) return;
    const system = removing;
    startTransition(async () => {
      const result = await deleteSystem(system.id);
      toast(result.ok ? result.message : result.error, result.ok ? "success" : "error");
      if (result.ok) setRemoving(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setEditing(emptyInput())}>
          Add a system
        </Button>
      </div>

      {undefinedNames.length > 0 ? (
        <div className="card p-5 text-sm">
          <p className="font-medium">Systems used but not defined</p>
          <p className="mt-1 text-muted">
            These names appear on your trades with nothing written down about
            how they work: {undefinedNames.join(", ")}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {undefinedNames.map((name) => (
              <Button
                key={name}
                type="button"
                variant="ghost"
                onClick={() => setEditing({ ...emptyInput(), name })}
              >
                Define &ldquo;{name}&rdquo;
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {systems.length === 0 ? (
        <EmptyState title="No systems defined yet">
          A system is more than a name on a trade: the setup it takes, where
          the stop goes, how size is decided, and why you think it has an
          edge. Writing it down is what makes it reviewable later.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {systems.map((system) => (
            <section key={system.id} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">{system.name}</h2>
                  <p className="mt-0.5 text-xs text-faint">
                    {[system.markets, system.timeframe]
                      .filter(Boolean)
                      .join(" · ") || "No markets or timeframe recorded"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[system.status]}`}
                  >
                    {SYSTEM_STATUSES.find((s) => s.value === system.status)?.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditing(toInput(system))}
                    className="rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoving(system)}
                    className="rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:text-negative"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <StatsLine stats={stats[system.name]} />

              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                {RULE_FIELDS.map(({ name, label }) => {
                  const value = system[name as keyof TradingSystem];
                  if (typeof value !== "string" || value === "") return null;
                  return (
                    <div key={name}>
                      <dt className="text-xs font-medium text-muted">{label}</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap text-sm">
                        {value}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          ))}
        </div>
      )}

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Edit ${editing.name}` : "Add a system"}
        wide
      >
        {editing ? (
          <form onSubmit={save} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" hint="How it appears on trades and in reports.">
                <input
                  value={editing.name}
                  onChange={(e) => set("name", e.target.value)}
                  className={inputClass}
                  autoFocus
                />
              </Field>
              <Field
                label="Status"
                hint="Testing means you're still proving it out."
              >
                <select
                  value={editing.status}
                  onChange={(e) => set("status", e.target.value as SystemStatus)}
                  className={inputClass}
                >
                  {SYSTEM_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Markets" hint="What it's traded on.">
                <input
                  value={editing.markets}
                  onChange={(e) => set("markets", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Timeframe" hint="Daily, 4h, intraday…">
                <input
                  value={editing.timeframe}
                  onChange={(e) => set("timeframe", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            {RULE_FIELDS.map(({ name, label, hint }) => (
              <Field key={name} label={label} hint={hint}>
                <textarea
                  rows={3}
                  value={String(editing[name] ?? "")}
                  onChange={(e) => set(name, e.target.value as never)}
                  className={inputClass}
                />
              </Field>
            ))}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save system"}
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>

      <Dialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Delete system definition"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm">
            Delete the definition of{" "}
            <span className="font-medium">{removing?.name}</span>?
          </p>
          <p className="text-sm text-muted">
            Trades tagged with this name keep their tag and stay in every
            report — only the written definition goes.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={confirmRemove}
              disabled={pending}
            >
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
