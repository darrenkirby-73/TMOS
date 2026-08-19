import { LoadError, SetupNotice } from "@/components/setup-notice";
import { addDaysIso, safeDateParam, weekStartIso } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { DayRecord, Trade, WeeklyReflection } from "@/lib/types";
import { summariseWeek } from "@/lib/weekly";
import { ReflectionForm } from "./reflection-form";
import { WeekPicker } from "./week-picker";
import { WeeklySummaryView } from "./weekly-summary";

export default async function WeeklyPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  // Normalise whatever arrives to the Monday of that week, falling back to
  // the current week when the URL carries a malformed date.
  const weekStart = weekStartIso(safeDateParam(week));
  const weekEnd = addDaysIso(weekStart, 6);

  let dayRecords: DayRecord[] = [];
  let trades: Trade[] = [];
  let reflection: WeeklyReflection | null = null;
  let error: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [daysRes, tradesRes, reflectionRes] = await Promise.all([
      supabase
        .from("day_records")
        .select("*")
        .gte("date", weekStart)
        .lte("date", weekEnd),
      supabase
        .from("trades")
        .select("*")
        .gte("date", weekStart)
        .lte("date", weekEnd),
      supabase
        .from("weekly_reflections")
        .select("*")
        .eq("week_start_date", weekStart)
        .maybeSingle(),
    ]);
    error =
      daysRes.error?.message ??
      tradesRes.error?.message ??
      reflectionRes.error?.message ??
      null;
    dayRecords = (daysRes.data as DayRecord[]) ?? [];
    trades = (tradesRes.data as Trade[]) ?? [];
    reflection = (reflectionRes.data as WeeklyReflection) ?? null;
  }

  const summary = summariseWeek(weekStart, dayRecords, trades);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Weekly Review</h1>
        <p className="mt-1 text-sm text-muted">
          Behaviour and process over the week. Objective counts come from the
          trade log; stress, decision quality and attitudes come from your
          check-ins.
        </p>
      </div>
      {!isSupabaseConfigured ? (
        <SetupNotice />
      ) : error ? (
        <LoadError message={error} />
      ) : (
        <>
          <WeekPicker weekStart={weekStart} />
          <WeeklySummaryView summary={summary} />
          <ReflectionForm
            key={weekStart}
            weekStart={weekStart}
            reflection={reflection}
          />
        </>
      )}
    </div>
  );
}
