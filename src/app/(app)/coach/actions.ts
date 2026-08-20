"use server";

import { revalidatePath } from "next/cache";
import { describeCoachError, runCoach } from "@/lib/coach";
import { PASTE_MODEL } from "@/lib/coach-models";
import { addDaysIso, todayIso, weekStartIso } from "@/lib/dates";
import {
  composePrompt,
  renderForPaste,
  WORKFLOWS,
  type CoachContext,
} from "@/lib/prompts";
import { createClient } from "@/lib/supabase/server";
import type { CoachWorkflow, DayRecord, Trade } from "@/lib/types";
import { summariseWeek } from "@/lib/weekly";

export type CoachRunResult =
  | { ok: true; response: string; model: string }
  | { ok: false; error: string };

/** Fetch only the stored data this workflow declares it needs. */
async function loadContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workflow: CoachWorkflow,
): Promise<CoachContext> {
  const kinds = WORKFLOWS[workflow].context;
  const today = todayIso();
  const weekStart = weekStartIso(today);
  const weekEnd = addDaysIso(weekStart, 6);
  const ctx: CoachContext = { today, weekStart };

  if (kinds.includes("today_day_record")) {
    const { data } = await supabase
      .from("day_records")
      .select("*")
      .eq("date", today)
      .maybeSingle();
    ctx.todayRecord = (data as DayRecord) ?? null;
  }

  if (kinds.includes("recent_trades")) {
    const { data } = await supabase
      .from("trades")
      .select("*")
      .eq("date", today);
    ctx.recentTrades = (data as Trade[]) ?? [];
  }

  if (kinds.includes("all_closed_trades")) {
    const { data } = await supabase
      .from("trades")
      .select("*")
      .order("date", { ascending: true });
    ctx.allClosedTrades = (data as Trade[]) ?? [];
  }

  if (kinds.includes("week_day_records") || kinds.includes("week_trades")) {
    const [daysRes, tradesRes] = await Promise.all([
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
    ]);
    const days = (daysRes.data as DayRecord[]) ?? [];
    const trades = (tradesRes.data as Trade[]) ?? [];
    ctx.weekDayRecords = days;
    ctx.weekTrades = trades;
    ctx.weeklySummary = summariseWeek(weekStart, days, trades);
  }

  return ctx;
}

export async function runCoachWorkflow(
  workflow: CoachWorkflow,
  inputs: Record<string, unknown>,
): Promise<CoachRunResult> {
  if (!(workflow in WORKFLOWS)) {
    return { ok: false, error: "Unknown coaching workflow" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  try {
    const context = await loadContext(supabase, workflow);
    const prompt = composePrompt(workflow, inputs, context);
    const { response, model } = await runCoach(workflow, prompt);

    // Log every interaction — mock or real — so past sessions are reviewable.
    const { error } = await supabase.from("coaching_sessions").insert({
      workflow,
      input_payload: { inputs, user_message: prompt.userMessage },
      response,
      model,
    });
    if (error) {
      return {
        ok: false,
        error: `Coaching ran but the session could not be saved: ${error.message}`,
      };
    }

    revalidatePath("/coach");
    return { ok: true, response, model };
  } catch (error) {
    return { ok: false, error: describeCoachError(error) };
  }
}

export type ComposeResult =
  | { ok: true; prompt: string }
  | { ok: false; error: string };

/**
 * Paste-through step 1: assemble the data and compose the prompt, then hand
 * it back as text instead of calling a model. Nothing is logged here — a
 * session is only recorded once there is a response to record.
 */
export async function composeCoachPrompt(
  workflow: CoachWorkflow,
  inputs: Record<string, unknown>,
): Promise<ComposeResult> {
  if (!(workflow in WORKFLOWS)) {
    return { ok: false, error: "Unknown coaching workflow" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  try {
    const context = await loadContext(supabase, workflow);
    return { ok: true, prompt: renderForPaste(composePrompt(workflow, inputs, context)) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Couldn't compose the prompt",
    };
  }
}

export type SavePastedResult = { ok: true } | { ok: false; error: string };

/**
 * Paste-through step 2: record the response the user got back from Claude.
 *
 * The prompt is stored as the client sends it — the exact text that was
 * copied — rather than recomposed here, so the log shows what actually
 * produced the response even if the underlying records changed in between.
 * There is no trust concern: RLS means a user can only write their own log.
 */
export async function savePastedResponse(
  workflow: CoachWorkflow,
  inputs: Record<string, unknown>,
  prompt: string,
  response: string,
): Promise<SavePastedResult> {
  if (!(workflow in WORKFLOWS)) {
    return { ok: false, error: "Unknown coaching workflow" };
  }
  if (response.trim() === "") {
    return { ok: false, error: "Paste the response before saving" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("coaching_sessions").insert({
    workflow,
    input_payload: { inputs, user_message: prompt, source: "paste_through" },
    response: response.trim(),
    model: PASTE_MODEL,
  });
  if (error) {
    return { ok: false, error: `Couldn't save the session: ${error.message}` };
  }

  revalidatePath("/coach");
  return { ok: true };
}
