"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ChecklistItem } from "@/lib/types";
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

function parseChecklist(raw: string | null): ChecklistItem[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter(
        (item): item is ChecklistItem =>
          item &&
          typeof item.id === "string" &&
          typeof item.label === "string" &&
          typeof item.checked === "boolean",
      )
      .map((item) => ({
        id: item.id,
        label: item.label.trim(),
        checked: item.checked,
      }))
      .filter((item) => item.label !== "");
  } catch {
    return null;
  }
}

export async function saveMorningCheckin(
  form: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const date = str(form, "date");
  if (!date) return { ok: false, error: "Date is required" };

  const stressBefore = num(form, "stress_before");
  const energyBefore = num(form, "energy_before");
  const plannedRisk = num(form, "planned_risk_per_trade");
  const maxDailyRisk = num(form, "max_daily_risk");

  if (plannedRisk === null || plannedRisk <= 0)
    return { ok: false, error: "Planned risk per trade is required" };
  if (maxDailyRisk === null || maxDailyRisk <= 0)
    return { ok: false, error: "Max daily risk is required" };
  if (stressBefore === null || energyBefore === null)
    return { ok: false, error: "Stress and energy scores are required" };

  // Keep the original completion time on re-saves
  const { data: existing } = await supabase
    .from("day_records")
    .select("morning_completed_at")
    .eq("date", date)
    .maybeSingle();

  const row = {
    date,
    planned_risk_per_trade: plannedRisk,
    max_daily_risk: maxDailyRisk,
    max_trades_planned: num(form, "max_trades_planned"),
    stress_before: stressBefore,
    energy_before: energyBefore,
    conditions_acceptable: form.get("conditions_acceptable") === "on",
    winning_attitude_focus: str(form, "winning_attitude_focus"),
    losing_attitude_watch: str(form, "losing_attitude_watch"),
    discipline_checklist: parseChecklist(str(form, "discipline_checklist")),
    decision_sequence: str(form, "decision_sequence"),
    decision_commitment: form.get("decision_commitment") === "on",
    morning_completed_at:
      existing?.morning_completed_at ?? new Date().toISOString(),
  };

  const { error } = await supabase
    .from("day_records")
    .upsert(row, { onConflict: "user_id,date" });
  if (error) return { ok: false, error: error.message };

  // Offer any new attitude labels as suggestions next time
  const tagRows = [
    row.winning_attitude_focus
      ? { category: "winning_attitude", label: row.winning_attitude_focus }
      : null,
    row.losing_attitude_watch
      ? { category: "losing_attitude", label: row.losing_attitude_watch }
      : null,
  ].filter((r) => r !== null);
  if (tagRows.length > 0) {
    await supabase
      .from("tags")
      .upsert(tagRows, {
        onConflict: "user_id,category,label",
        ignoreDuplicates: true,
      });
  }

  revalidatePath("/morning");
  revalidatePath("/");
  return { ok: true };
}
