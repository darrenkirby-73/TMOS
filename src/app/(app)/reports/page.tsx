import { LoadError, SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Trade } from "@/lib/types";
import { ReportsView } from "./reports-view";

export default async function ReportsPage() {
  let trades: Trade[] = [];
  let error: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const res = await supabase
      .from("trades")
      .select("*")
      .order("date", { ascending: true });
    error = res.error?.message ?? null;
    trades = (res.data as Trade[]) ?? [];
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-muted">
          Expectancy over win rate. Only closed trades with a recorded R are
          measured.
        </p>
      </div>
      {!isSupabaseConfigured ? (
        <SetupNotice />
      ) : error ? (
        <LoadError message={error} />
      ) : (
        <ReportsView trades={trades} />
      )}
    </div>
  );
}
