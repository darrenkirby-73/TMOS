import Link from "next/link";
import { LoadError, SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";
import { statsByGroup } from "@/lib/stats";
import { createClient } from "@/lib/supabase/server";
import type { Trade, TradingSystem } from "@/lib/types";
import { SystemsEditor, type SystemStats } from "./systems-editor";

export default async function SystemsPage() {
  let systems: TradingSystem[] = [];
  let trades: Trade[] = [];
  let error: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const [systemsRes, tradesRes] = await Promise.all([
      supabase.from("trading_systems").select("*").order("name"),
      supabase.from("trades").select("system, r_result, status"),
    ]);
    error = systemsRes.error?.message ?? tradesRes.error?.message ?? null;
    systems = (systemsRes.data as TradingSystem[]) ?? [];
    trades = (tradesRes.data as Trade[]) ?? [];
  }

  // Only closed trades with an R can say anything about a system's results.
  const grouped = statsByGroup(
    trades.filter((t) => t.status === "closed"),
    (t) => t.system,
    (t) => t.r_result,
  );
  const stats: Record<string, SystemStats> = {};
  for (const { key, stats: s } of grouped) {
    stats[key] = {
      trades: s.count,
      expectancy: s.expectancy,
      totalR: s.totalR,
    };
  }

  const defined = new Set(systems.map((s) => s.name));
  const undefinedNames = [
    ...new Set(
      trades
        .map((t) => t.system)
        .filter((name): name is string => Boolean(name) && !defined.has(name!)),
    ),
  ].sort();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Trading systems
        </h1>
        <p className="mt-1 text-sm text-muted">
          What each system actually is — entry, stop, exit, sizing, and why you
          think it works. Trades reference a system by name, so editing or
          retiring a definition never alters your history.{" "}
          <Link href="/settings" className="text-accent hover:underline">
            Back to settings
          </Link>
        </p>
      </div>
      {!isSupabaseConfigured ? (
        <SetupNotice />
      ) : error ? (
        <LoadError message={error} />
      ) : (
        <SystemsEditor
          systems={systems}
          stats={stats}
          undefinedNames={undefinedNames}
        />
      )}
    </div>
  );
}
