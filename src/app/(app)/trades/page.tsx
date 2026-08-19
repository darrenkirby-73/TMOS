import { LoadError, SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Tag, Trade } from "@/lib/types";
import { TradesView } from "./trades-view";

export default async function TradesPage() {
  let trades: Trade[] = [];
  let tags: Tag[] = [];
  let error: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [tradesRes, tagsRes] = await Promise.all([
      supabase
        .from("trades")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase.from("tags").select("*").order("label"),
    ]);
    error = tradesRes.error?.message ?? tagsRes.error?.message ?? null;
    trades = (tradesRes.data as Trade[]) ?? [];
    tags = (tagsRes.data as Tag[]) ?? [];
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Trade Log</h1>
        <p className="mt-1 text-sm text-muted">
          Every trade in R. Suggested values are always yours to review and
          override.
        </p>
      </div>
      {!isSupabaseConfigured ? (
        <SetupNotice />
      ) : error ? (
        <LoadError message={error} />
      ) : (
        <TradesView trades={trades} tags={tags} />
      )}
    </div>
  );
}
