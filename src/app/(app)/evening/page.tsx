import { LoadError, SetupNotice } from "@/components/setup-notice";
import { safeDateParam, shortDayLabel } from "@/lib/dates";
import { suggestFromTrades } from "@/lib/day-suggestions";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { DayRecord, Tag, Trade } from "@/lib/types";
import { EveningForm } from "./evening-form";

export default async function EveningPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  // Falls back to today when the URL carries a malformed date.
  const date = safeDateParam(dateParam);

  let record: DayRecord | null = null;
  let trades: Trade[] = [];
  let tags: Tag[] = [];
  let error: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [recordRes, tradesRes, tagsRes] = await Promise.all([
      supabase.from("day_records").select("*").eq("date", date).maybeSingle(),
      supabase.from("trades").select("*").eq("date", date),
      supabase.from("tags").select("*").order("label"),
    ]);
    error =
      recordRes.error?.message ??
      tradesRes.error?.message ??
      tagsRes.error?.message ??
      null;
    record = (recordRes.data as DayRecord) ?? null;
    trades = (tradesRes.data as Trade[]) ?? [];
    tags = (tagsRes.data as Tag[]) ?? [];
  }

  const suggestions = suggestFromTrades(trades);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Evening Check-In
        </h1>
        <p className="mt-1 text-sm text-muted">
          {shortDayLabel(date)} · Debrief the process, not the P&amp;L. Numbers
          are suggested from your trade log — override anything that
          doesn&apos;t match.
        </p>
      </div>
      {!isSupabaseConfigured ? (
        <SetupNotice />
      ) : error ? (
        <LoadError message={error} />
      ) : (
        <EveningForm
          key={date}
          date={date}
          record={record}
          suggestions={suggestions}
          tags={tags}
        />
      )}
    </div>
  );
}
