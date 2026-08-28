import { LoadError, SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { DayRecord, Trade } from "@/lib/types";
import { TrendsView } from "./trends-view";

export default async function TrendsPage() {
  let trades: Trade[] = [];
  let dayRecords: DayRecord[] = [];
  let error: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [tradesRes, daysRes] = await Promise.all([
      supabase.from("trades").select("*").order("date", { ascending: true }),
      supabase
        .from("day_records")
        .select("*")
        .order("date", { ascending: true }),
    ]);
    error = tradesRes.error?.message ?? daysRes.error?.message ?? null;
    trades = (tradesRes.data as Trade[]) ?? [];
    dayRecords = (daysRes.data as DayRecord[]) ?? [];
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trends</h1>
        <p className="mt-1 text-sm text-muted">
          Whether the process is improving, not just what it has produced.
          Periods with nothing recorded stay empty rather than being drawn as
          zero — a week you didn&apos;t trade is not a week with an expectancy
          of 0R.
        </p>
      </div>
      {!isSupabaseConfigured ? (
        <SetupNotice />
      ) : error ? (
        <LoadError message={error} />
      ) : (
        <TrendsView trades={trades} dayRecords={dayRecords} />
      )}
    </div>
  );
}
