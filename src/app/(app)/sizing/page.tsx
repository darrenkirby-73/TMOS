import Link from "next/link";
import { LoadError, SetupNotice } from "@/components/setup-notice";
import { todayIso } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/env";
import { RISK_RULES } from "@/lib/risk-rules";
import { equityAsOf } from "@/lib/sizing";
import { createClient } from "@/lib/supabase/server";
import type { Trade } from "@/lib/types";
import { SizingCalculator, type RiskLimits } from "./sizing-calculator";

type EquityRow = { id: string; as_of_date: string; amount: number };

export default async function SizingPage() {
  let equityRows: EquityRow[] = [];
  let limits: RiskLimits = {
    perTradePercent: RISK_RULES.perTradePercent,
    maxOpenRiskPercent: RISK_RULES.maxOpenRiskPercent,
    maxNewDailyRiskPercent: RISK_RULES.maxNewDailyRiskPercent,
  };
  let trades: Trade[] = [];
  let error: string | null = null;
  const today = todayIso();

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [equityRes, settingsRes, tradesRes] = await Promise.all([
      supabase
        .from("account_equity")
        .select("id, as_of_date, amount")
        .order("as_of_date", { ascending: false }),
      supabase.from("risk_settings").select("*").maybeSingle(),
      // Only what the limit check needs: risk already committed.
      supabase
        .from("trades")
        .select("id, date, status, risk_amount_gbp")
        .or(`status.eq.open,date.eq.${today}`),
    ]);

    // Risk settings legitimately have no row until first saved, so a missing
    // row falls back to the documented defaults rather than being an error.
    error = equityRes.error?.message ?? tradesRes.error?.message ?? null;
    equityRows = (equityRes.data as EquityRow[]) ?? [];
    trades = (tradesRes.data as Trade[]) ?? [];

    if (settingsRes.data) {
      const row = settingsRes.data as {
        per_trade_percent: number;
        max_open_risk_percent: number;
        max_new_daily_risk_percent: number;
      };
      limits = {
        perTradePercent: Number(row.per_trade_percent),
        maxOpenRiskPercent: Number(row.max_open_risk_percent),
        maxNewDailyRiskPercent: Number(row.max_new_daily_risk_percent),
      };
    }
  }

  // The figure in force today, not simply the newest one.
  const inForce = equityAsOf(
    equityRows.map((r) => ({ as_of_date: r.as_of_date, amount: Number(r.amount) })),
    today,
  );

  // A trade with no recorded risk cannot contribute to a risk total, so it is
  // excluded and said to be excluded rather than counted as zero.
  const withRisk = trades.filter(
    (t) => typeof t.risk_amount_gbp === "number" && t.risk_amount_gbp > 0,
  );
  const openTradeRisks = withRisk
    .filter((t) => t.status === "open")
    .map((t) => Number(t.risk_amount_gbp));
  const todayTradeRisks = withRisk
    .filter((t) => t.date === today)
    .map((t) => Number(t.risk_amount_gbp));
  const unpriced = trades.length - withRisk.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Position sizing
        </h1>
        <p className="mt-1 text-sm text-muted">
          Work out the size before you commit. Size always rounds down, so what
          you actually risk comes in under your limit rather than over it — and
          every figure is one you entered, never one TMOS looked up.
        </p>
      </div>

      {!isSupabaseConfigured ? (
        <SetupNotice />
      ) : error ? (
        <LoadError message={error} />
      ) : (
        <>
          {inForce === null ? (
            <div className="card p-5 text-sm">
              <p className="font-medium">No account equity recorded</p>
              <p className="mt-1 text-muted">
                You can still size a trade by typing an equity below, but
                recording it in{" "}
                <Link href="/settings" className="text-accent hover:underline">
                  Settings
                </Link>{" "}
                prefills it here and lets past sizing be judged against the
                balance at the time.
              </p>
            </div>
          ) : null}

          {unpriced > 0 ? (
            <div className="card p-5 text-sm">
              <p className="font-medium">
                {unpriced} {unpriced === 1 ? "trade has" : "trades have"} no
                recorded risk
              </p>
              <p className="mt-1 text-muted">
                They are excluded from the open and daily risk totals below,
                which therefore understate your committed risk. A missing risk
                amount is treated as missing, not as zero.
              </p>
            </div>
          ) : null}

          <SizingCalculator
            equity={inForce?.amount ?? null}
            equityAsOfDate={inForce?.as_of_date ?? null}
            limits={limits}
            openTradeRisks={openTradeRisks}
            todayTradeRisks={todayTradeRisks}
          />
        </>
      )}
    </div>
  );
}
