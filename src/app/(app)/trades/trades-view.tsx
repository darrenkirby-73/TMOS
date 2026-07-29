"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, inputClass } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { formatGbp, formatR } from "@/lib/r";
import { computeRStats } from "@/lib/stats";
import type { Tag, Trade } from "@/lib/types";
import { TRADE_TYPES } from "@/lib/types";
import { deleteTrade } from "./actions";
import { TradeForm } from "./trade-form";

type SortKey = "date" | "ticker" | "r_result" | "risk_amount_gbp";

type Filters = {
  from: string;
  to: string;
  ticker: string;
  setup: string;
  system: string;
  tradeType: string;
  status: string;
  mistake: string; // "" | "yes" | "no"
  lapse: string;
};

const emptyFilters: Filters = {
  from: "",
  to: "",
  ticker: "",
  setup: "",
  system: "",
  tradeType: "",
  status: "",
  mistake: "",
  lapse: "",
};

function matchesBool(filter: string, value: boolean) {
  if (filter === "") return true;
  return filter === "yes" ? value : !value;
}

export function TradesView({
  trades,
  tags,
}: {
  trades: Trade[];
  tags: Tag[];
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Trade | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Trade | null>(null);

  const setupOptions = useMemo(
    () => [...new Set(trades.map((t) => t.setup).filter(Boolean))] as string[],
    [trades],
  );
  const systemOptions = useMemo(
    () => [...new Set(trades.map((t) => t.system).filter(Boolean))] as string[],
    [trades],
  );

  const filtered = useMemo(() => {
    return trades.filter((t) => {
      if (filters.from && t.date < filters.from) return false;
      if (filters.to && t.date > filters.to) return false;
      if (
        filters.ticker &&
        !t.ticker.toLowerCase().includes(filters.ticker.toLowerCase())
      )
        return false;
      if (filters.setup && t.setup !== filters.setup) return false;
      if (filters.system && t.system !== filters.system) return false;
      if (filters.tradeType && t.trade_type !== filters.tradeType) return false;
      if (filters.status && t.status !== filters.status) return false;
      if (!matchesBool(filters.mistake, t.mistake)) return false;
      if (!matchesBool(filters.lapse, t.discipline_lapse)) return false;
      return true;
    });
  }, [trades, filters]);

  const sorted = useMemo(() => {
    const dir = sortAsc ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }, [filtered, sortKey, sortAsc]);

  const stats = useMemo(
    () =>
      computeRStats(
        filtered
          .filter((t) => t.status === "closed" && t.r_result !== null)
          .map((t) => t.r_result as number),
      ),
    [filtered],
  );

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "ticker");
    }
  }

  function sortIndicator(key: SortKey) {
    if (key !== sortKey) return "";
    return sortAsc ? " ↑" : " ↓";
  }

  function onDelete(trade: Trade) {
    startTransition(async () => {
      const result = await deleteTrade(trade.id);
      if (result.ok) {
        toast("Trade deleted");
      } else {
        toast(result.error, "error");
      }
      setConfirmDelete(null);
    });
  }

  const filterActive = Object.values(filters).some((v) => v !== "");

  return (
    <div className="flex flex-col gap-4">
      {/* Summary of the current (filtered) closed trades */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-muted">Closed trades</p>
          <p className="metric text-2xl font-semibold">{stats.count}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">Win rate</p>
          <p className="metric text-2xl font-semibold">
            {stats.winRate !== null ? `${stats.winRate}%` : "—"}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">Expectancy</p>
          <p className="metric text-2xl font-semibold">
            {formatR(stats.expectancy)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted">Total R</p>
          <p
            className={`metric text-2xl font-semibold ${
              stats.totalR > 0
                ? "text-positive"
                : stats.totalR < 0
                  ? "text-negative"
                  : ""
            }`}
          >
            {formatR(stats.totalR)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <Field label="From">
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="To">
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Ticker">
          <input
            value={filters.ticker}
            onChange={(e) => setFilters({ ...filters, ticker: e.target.value })}
            placeholder="Any"
            className={`${inputClass} w-24`}
          />
        </Field>
        <Field label="Setup">
          <select
            value={filters.setup}
            onChange={(e) => setFilters({ ...filters, setup: e.target.value })}
            className={inputClass}
          >
            <option value="">Any</option>
            {setupOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="System">
          <select
            value={filters.system}
            onChange={(e) => setFilters({ ...filters, system: e.target.value })}
            className={inputClass}
          >
            <option value="">Any</option>
            {systemOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select
            value={filters.tradeType}
            onChange={(e) =>
              setFilters({ ...filters, tradeType: e.target.value })
            }
            className={inputClass}
          >
            <option value="">Any</option>
            {TRADE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className={inputClass}
          >
            <option value="">Any</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </Field>
        <Field label="Mistake">
          <select
            value={filters.mistake}
            onChange={(e) =>
              setFilters({ ...filters, mistake: e.target.value })
            }
            className={inputClass}
          >
            <option value="">Any</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
        <Field label="Lapse">
          <select
            value={filters.lapse}
            onChange={(e) => setFilters({ ...filters, lapse: e.target.value })}
            className={inputClass}
          >
            <option value="">Any</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
        {filterActive ? (
          <Button variant="ghost" onClick={() => setFilters(emptyFilters)}>
            Clear
          </Button>
        ) : null}
        <div className="ml-auto">
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Log trade
          </Button>
        </div>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <EmptyState
          title={
            filterActive ? "No trades match these filters" : "No trades yet"
          }
        >
          {filterActive
            ? "Adjust or clear the filters above."
            : "Log your first trade to start building your R history."}
        </EmptyState>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left text-xs text-muted">
                <th className="p-3 font-medium">
                  <button type="button" onClick={() => toggleSort("date")}>
                    Date{sortIndicator("date")}
                  </button>
                </th>
                <th className="p-3 font-medium">
                  <button type="button" onClick={() => toggleSort("ticker")}>
                    Ticker{sortIndicator("ticker")}
                  </button>
                </th>
                <th className="p-3 font-medium">Dir</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Setup</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 text-right font-medium">Entry</th>
                <th className="p-3 text-right font-medium">Stop</th>
                <th className="p-3 text-right font-medium">Exit</th>
                <th className="p-3 text-right font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort("risk_amount_gbp")}
                  >
                    Risk £{sortIndicator("risk_amount_gbp")}
                  </button>
                </th>
                <th className="p-3 text-right font-medium">
                  <button type="button" onClick={() => toggleSort("r_result")}>
                    R{sortIndicator("r_result")}
                  </button>
                </th>
                <th className="p-3 font-medium">Flags</th>
                <th className="p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border-subtle last:border-0"
                >
                  <td className="metric p-3 whitespace-nowrap">{t.date}</td>
                  <td className="p-3 font-semibold">{t.ticker}</td>
                  <td className="p-3">{t.direction === "long" ? "L" : "S"}</td>
                  <td className="p-3 text-muted">
                    {TRADE_TYPES.find((x) => x.value === t.trade_type)?.label}
                  </td>
                  <td className="p-3 text-muted">{t.setup ?? "—"}</td>
                  <td className="p-3">
                    <span
                      className={
                        t.status === "open"
                          ? "rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent"
                          : "text-muted"
                      }
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="metric p-3 text-right">{t.entry_price}</td>
                  <td className="metric p-3 text-right">{t.stop_price}</td>
                  <td className="metric p-3 text-right">
                    {t.exit_price ?? "—"}
                  </td>
                  <td className="metric p-3 text-right">
                    {formatGbp(t.risk_amount_gbp)}
                  </td>
                  <td
                    className={`metric p-3 text-right font-semibold ${
                      (t.r_result ?? 0) > 0
                        ? "text-positive"
                        : (t.r_result ?? 0) < 0
                          ? "text-negative"
                          : ""
                    }`}
                  >
                    {formatR(t.r_result)}
                    {t.is_complex_trade ? (
                      <span className="ml-1 text-xs font-normal text-faint">
                        (manual)
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3 text-xs">
                    <span className="flex gap-1.5">
                      {t.mistake ? (
                        <span title="Mistake" className="text-negative">
                          M
                        </span>
                      ) : null}
                      {t.discipline_lapse ? (
                        <span title={t.lapse_type ?? "Discipline lapse"} className="text-negative">
                          DL
                        </span>
                      ) : null}
                      {!t.plan_compliant ? (
                        <span title="Not plan compliant" className="text-negative">
                          ✕P
                        </span>
                      ) : null}
                      {t.screenshot_url ? (
                        <a
                          href={`/api/screenshot?path=${encodeURIComponent(t.screenshot_url)}`}
                          target="_blank"
                          rel="noreferrer"
                          title="View screenshot"
                          className="text-accent underline"
                        >
                          img
                        </a>
                      ) : null}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <button
                      type="button"
                      className="mr-3 text-accent hover:underline"
                      onClick={() => {
                        setEditing(t);
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-muted hover:text-negative"
                      onClick={() => setConfirmDelete(t)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen ? (
        <TradeForm
          key={editing?.id ?? "new"}
          open={formOpen}
          onClose={() => setFormOpen(false)}
          trade={editing}
          tags={tags}
        />
      ) : null}

      <Dialog
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title="Delete trade?"
      >
        <p className="text-sm text-muted">
          {confirmDelete
            ? `${confirmDelete.ticker} on ${confirmDelete.date} will be permanently removed, along with its screenshot.`
            : ""}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => confirmDelete && onDelete(confirmDelete)}
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
