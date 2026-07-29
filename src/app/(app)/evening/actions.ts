"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/(app)/trades/actions";

function str(form: FormData, key: string): string | null {
  const v = form.get(key);
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed === "" ? null : trimmed;
}

function num(form: FormData, key: string): number | null {
  const s = str(form, key);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function intOrZero(form: FormData, key: string): number {
  return num(form, key) ?? 0;
}

/** Multi-select values arrive as repeated form entries. */
function strArray(form: FormData, key: string): string[] {
  return form
    .getAll(key)
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v !== "");
}

export async function saveEveningCheckin(
  form: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const date = str(form, "date");
  if (!date) return { ok: false, error: "Date is required" };

  const stressAfter = num(form, "stress_after");
  if (stressAfter === null)
    return { ok: false, error: "Stress after is required" };

  const numTrades = intOrZero(form, "num_trades");
  const planCompliant = intOrZero(form, "plan_compliant_trades");
  if (numTrades < 0) return { ok: false, error: "Number of trades cannot be negative" };
  if (planCompliant > numTrades)
    return {
      ok: false,
      error: "Plan-compliant trades cannot exceed the number of trades",
    };

  const { data: existing } = await supabase
    .from("day_records")
    .select("evening_completed_at")
    .eq("date", date)
    .maybeSingle();

  const row = {
    date,
    traded: form.get("traded") === "on",
    stress_after: stressAfter,
    stress_trend: str(form, "stress_trend"),
    num_trades: numTrades,
    total_r_today: num(form, "total_r_today"),
    plan_compliant_trades: planCompliant,
    mistakes_count: intOrZero(form, "mistakes_count"),
    discipline_lapses_count: intOrZero(form, "discipline_lapses_count"),
    top_lapse_type: str(form, "top_lapse_type"),
    losing_attitudes_observed: strArray(form, "losing_attitudes_observed"),
    winning_attitudes_applied: strArray(form, "winning_attitudes_applied"),
    decision_quality: str(form, "decision_quality"),
    worst_decision_note: str(form, "worst_decision_note"),
    best_catch_note: str(form, "best_catch_note"),
    tomorrow_adjustment: str(form, "tomorrow_adjustment"),
    evening_completed_at:
      existing?.evening_completed_at ?? new Date().toISOString(),
  };

  const { error } = await supabase
    .from("day_records")
    .upsert(row, { onConflict: "user_id,date" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/evening");
  revalidatePath("/");
  return { ok: true };
}
