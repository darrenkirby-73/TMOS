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

export async function saveWeeklyReflection(
  form: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const weekStart = str(form, "week_start_date");
  if (!weekStart) return { ok: false, error: "Week is required" };

  const { error } = await supabase.from("weekly_reflections").upsert(
    {
      week_start_date: weekStart,
      went_well: str(form, "went_well"),
      what_broke_down: str(form, "what_broke_down"),
      improvement_risk: str(form, "improvement_risk"),
      improvement_stress: str(form, "improvement_stress"),
      improvement_attitude_discipline: str(
        form,
        "improvement_attitude_discipline",
      ),
      improvement_decision_process: str(form, "improvement_decision_process"),
      rules_to_adjust: str(form, "rules_to_adjust"),
    },
    { onConflict: "user_id,week_start_date" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/weekly");
  return { ok: true };
}
