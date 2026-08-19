import { LoadError, SetupNotice } from "@/components/setup-notice";
import { safeDateParam, shortDayLabel } from "@/lib/dates";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistItem, DayRecord, Tag } from "@/lib/types";
import { MorningForm } from "./morning-form";

export default async function MorningPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  // Falls back to today when the URL carries a malformed date.
  const date = safeDateParam(dateParam);

  let record: DayRecord | null = null;
  let previousChecklist: ChecklistItem[] | null = null;
  let tags: Tag[] = [];
  let error: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [recordRes, prevRes, tagsRes] = await Promise.all([
      supabase.from("day_records").select("*").eq("date", date).maybeSingle(),
      // Most recent earlier day that has a checklist — carried forward so the
      // user's edits persist without re-typing.
      supabase
        .from("day_records")
        .select("discipline_checklist")
        .lt("date", date)
        .not("discipline_checklist", "is", null)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("tags").select("*").order("label"),
    ]);
    error = recordRes.error?.message ?? tagsRes.error?.message ?? null;
    record = (recordRes.data as DayRecord) ?? null;
    previousChecklist =
      (prevRes.data?.discipline_checklist as ChecklistItem[]) ?? null;
    tags = (tagsRes.data as Tag[]) ?? [];
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Morning Check-In
        </h1>
        <p className="mt-1 text-sm text-muted">
          {shortDayLabel(date)} · Set your risk limits and mental baseline
          before the open.
        </p>
      </div>
      {!isSupabaseConfigured ? (
        <SetupNotice />
      ) : error ? (
        <LoadError message={error} />
      ) : (
        <MorningForm
          key={date}
          date={date}
          record={record}
          previousChecklist={previousChecklist}
          tags={tags}
        />
      )}
    </div>
  );
}
