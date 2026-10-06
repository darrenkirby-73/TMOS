import Link from "next/link";
import { LoadError, SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { RISK_RULES } from "@/lib/risk-rules";
import type { Tag } from "@/lib/types";
import { ListsEditor } from "./lists-editor";
import {
  EquityEditor,
  RiskLimitsEditor,
  type EquityEntry,
  type RiskLimitValues,
} from "./risk-editors";

export default async function SettingsPage() {
  let tags: Tag[] = [];
  let equity: EquityEntry[] = [];
  let limits: RiskLimitValues = {
    perTradePercent: RISK_RULES.perTradePercent,
    maxOpenRiskPercent: RISK_RULES.maxOpenRiskPercent,
    maxNewDailyRiskPercent: RISK_RULES.maxNewDailyRiskPercent,
  };
  let error: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [tagsRes, equityRes, settingsRes] = await Promise.all([
      supabase.from("tags").select("*").order("label"),
      supabase
        .from("account_equity")
        .select("id, as_of_date, amount, note")
        .order("as_of_date", { ascending: false }),
      supabase.from("risk_settings").select("*").maybeSingle(),
    ]);
    error = tagsRes.error?.message ?? equityRes.error?.message ?? null;
    tags = (tagsRes.data as Tag[]) ?? [];
    equity = (equityRes.data as EquityEntry[]) ?? [];
    // No row until first saved, which is not an error — fall back to the
    // documented defaults.
    if (settingsRes.data) {
      const row = settingsRes.data as Record<string, number>;
      limits = {
        perTradePercent: Number(row.per_trade_percent),
        maxOpenRiskPercent: Number(row.max_open_risk_percent),
        maxNewDailyRiskPercent: Number(row.max_new_daily_risk_percent),
      };
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Your account equity, your risk limits, and the vocabulary the app
          offers you. The lists started as placeholders — none of them is
          authoritative, and they&apos;re meant to become yours.{" "}
          <Link
            href="/settings/systems"
            className="text-accent hover:underline"
          >
            Trading systems →
          </Link>
        </p>
      </div>
      {!isSupabaseConfigured ? (
        <SetupNotice />
      ) : error ? (
        <LoadError message={error} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <EquityEditor entries={equity} />
            <RiskLimitsEditor limits={limits} />
          </div>
          <ListsEditor tags={tags} />
          <p className="text-xs text-faint">
            Trades store these as text, not as references. Renaming or removing
            an entry changes what the app suggests from now on; it leaves
            logged trades alone unless you explicitly ask otherwise.
          </p>
        </>
      )}
    </div>
  );
}
