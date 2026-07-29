import Link from "next/link";
import { LoadError, SetupNotice } from "@/components/setup-notice";
import { todayIso } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/env";
import { formatR } from "@/lib/r";
import { computeRStats } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import type { DayRecord, Trade } from "@/lib/types";

async function loadData(): Promise<{
  today: DayRecord | null;
  trades: Trade[];
  error: string | null;
}> {
  const supabase = await createClient();
  const [dayRes, tradesRes] = await Promise.all([
    supabase
      .from("day_records")
      .select("*")
      .eq("date", todayIso())
      .maybeSingle(),
    supabase
      .from("trades")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  return {
    today: (dayRes.data as DayRecord) ?? null,
    trades: (tradesRes.data as Trade[]) ?? [],
    error: dayRes.error?.message ?? tradesRes.error?.message ?? null,
  };
}

function StatusPill({
  done,
  label,
  href,
}: {
  done: boolean;
  label: string;
  href?: string;
}) {
  const className = `rounded-full px-3 py-1 text-xs font-medium ${
    done ? "bg-accent-soft text-accent" : "bg-background text-muted"
  }`;
  const content = `${label} ${done ? "✓" : "·"}`;
  if (!href) return <span className={className}>{content}</span>;
  return (
    <Link
      href={href}
      className={`${className} transition-opacity hover:opacity-80`}
    >
      {content}
    </Link>
  );
}

export default async function DashboardPage() {
  const configured = isSupabaseConfigured;
  const { today, trades, error } = configured
    ? await loadData()
    : { today: null, trades: [], error: null };

  const closed = trades.filter(
    (t) => t.status === "closed" && t.r_result !== null,
  );
  const stats = computeRStats(closed.map((t) => t.r_result as number));
  const openTrades = trades.filter((t) => t.status === "open");
  const recent = trades.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Process first: check in, follow the plan, log everything in R.
        </p>
      </div>

      {!configured ? <SetupNotice /> : null}
      {error ? <LoadError message={error} /> : null}

      {/* Today */}
      <section className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-base font-semibold">Today</h2>
          <p className="mt-0.5 text-sm text-muted">
            {today?.traded ? "Traded" : "No trades recorded"} ·{" "}
            {openTrades.length} open position
            {openTrades.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill
            done={Boolean(today?.morning_completed_at)}
            label="Morning check-in"
            href="/morning"
          />
          <StatusPill
            done={Boolean(today?.evening_completed_at)}
            label="Evening check-in"
          />
        </div>
      </section>

      {/* R stats */}
      <section
        aria-label="Performance"
        className="grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
        <div className="card p-5">
          <p className="text-sm text-muted">Closed trades</p>
          <p className="metric text-3xl font-semibold">{stats.count}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted">Win rate</p>
          <p className="metric text-3xl font-semibold">
            {stats.winRate !== null ? `${stats.winRate}%` : "—"}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted">Expectancy</p>
          <p className="metric text-3xl font-semibold">
            {formatR(stats.expectancy)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted">Total R</p>
          <p
            className={`metric text-3xl font-semibold ${
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
      </section>

      {/* Recent trades */}
      <section aria-label="Recent trades" className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent trades</h2>
          <Link href="/trades" className="text-sm text-accent hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Nothing logged yet. Your five most recent trades will appear here.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border-subtle">
            {recent.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <span className="flex items-center gap-3">
                  <span className="metric text-muted">{t.date}</span>
                  <span className="font-semibold">{t.ticker}</span>
                  <span className="text-muted">
                    {t.direction === "long" ? "Long" : "Short"}
                  </span>
                </span>
                <span
                  className={`metric font-semibold ${
                    (t.r_result ?? 0) > 0
                      ? "text-positive"
                      : (t.r_result ?? 0) < 0
                        ? "text-negative"
                        : "text-muted"
                  }`}
                >
                  {t.status === "open" ? "open" : formatR(t.r_result)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
