"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TagCategory } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

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

function bool(form: FormData, key: string): boolean {
  return form.get(key) === "on" || form.get(key) === "true";
}

/** Parse and validate the shared trade fields from the form. */
function parseTradeForm(form: FormData):
  | { ok: true; row: Record<string, unknown> }
  | { ok: false; error: string } {
  const date = str(form, "date");
  const ticker = str(form, "ticker")?.toUpperCase() ?? null;
  const direction = str(form, "direction");
  const tradeType = str(form, "trade_type");
  const status = str(form, "status");
  const entryPrice = num(form, "entry_price");
  const stopPrice = num(form, "stop_price");
  const exitPrice = num(form, "exit_price");
  const quantity = num(form, "quantity");
  const riskAmount = num(form, "risk_amount_gbp");
  const rResult = num(form, "r_result");
  const isComplex = bool(form, "is_complex_trade");

  if (!date) return { ok: false, error: "Date is required" };
  if (!ticker) return { ok: false, error: "Ticker is required" };
  if (direction !== "long" && direction !== "short")
    return { ok: false, error: "Direction must be long or short" };
  if (!["shadow", "live_small", "live_full"].includes(tradeType ?? ""))
    return { ok: false, error: "Trade type is required" };
  if (status !== "open" && status !== "closed")
    return { ok: false, error: "Status must be open or closed" };
  if (entryPrice === null || entryPrice <= 0)
    return { ok: false, error: "Entry price must be a positive number" };
  if (stopPrice === null || stopPrice <= 0)
    return { ok: false, error: "Stop price must be a positive number" };
  if (exitPrice !== null && exitPrice <= 0)
    return { ok: false, error: "Exit price must be a positive number" };
  if (quantity === null || quantity <= 0)
    return { ok: false, error: "Quantity must be a positive number" };
  if (riskAmount === null || riskAmount <= 0)
    return { ok: false, error: "Risk amount (£) must be a positive number" };
  // R is meaningless if the stop is on the wrong side of the entry: a long
  // stops out below, a short above.
  if (direction === "long" && stopPrice >= entryPrice)
    return {
      ok: false,
      error: "A long trade's stop must be below the entry price",
    };
  if (direction === "short" && stopPrice <= entryPrice)
    return {
      ok: false,
      error: "A short trade's stop must be above the entry price",
    };
  if (status === "closed" && exitPrice === null)
    return { ok: false, error: "A closed trade needs an exit price" };
  if (status === "closed" && isComplex && rResult === null)
    return {
      ok: false,
      error: "Complex trades require a manually entered R result",
    };

  return {
    ok: true,
    row: {
      date,
      ticker,
      direction,
      setup: str(form, "setup"),
      system: str(form, "system"),
      entry_price: entryPrice,
      stop_price: stopPrice,
      exit_price: exitPrice,
      quantity,
      risk_amount_gbp: riskAmount,
      // r_result is exactly what the user saved — suggestions are applied
      // client-side only via an explicit button, never forced here.
      r_result: rResult,
      is_complex_trade: isComplex,
      position_size: num(form, "position_size"),
      trade_type: tradeType,
      status,
      plan_compliant: bool(form, "plan_compliant"),
      mistake: bool(form, "mistake"),
      discipline_lapse: bool(form, "discipline_lapse"),
      lapse_type: str(form, "lapse_type"),
      losing_attitude_present: bool(form, "losing_attitude_present"),
      attitude_tag: str(form, "attitude_tag"),
      winning_attitude_applied: str(form, "winning_attitude_applied"),
      decision_quality: str(form, "decision_quality"),
      stress_before_trade: num(form, "stress_before_trade"),
      stress_after_trade: num(form, "stress_after_trade"),
      notes: str(form, "notes"),
    },
  };
}

/** Save any new dropdown labels into the tags table so they're offered next time. */
async function upsertTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: Record<string, unknown>,
) {
  const mapping: [string, TagCategory][] = [
    ["setup", "setup"],
    ["system", "system"],
    ["lapse_type", "lapse_type"],
    ["attitude_tag", "losing_attitude"],
    ["winning_attitude_applied", "winning_attitude"],
  ];
  const rows = mapping
    .filter(([key]) => typeof row[key] === "string" && row[key])
    .map(([key, category]) => ({ category, label: row[key] as string }));
  if (rows.length === 0) return;
  // Ignore duplicates — tags are unique per (user, category, label)
  await supabase
    .from("tags")
    .upsert(rows, { onConflict: "user_id,category,label", ignoreDuplicates: true });
}

async function linkDayRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  date: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("day_records")
    .select("id")
    .eq("date", date)
    .maybeSingle();
  return data?.id ?? null;
}

async function uploadScreenshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tradeId: string,
  file: File,
): Promise<{ path?: string; error?: string }> {
  if (!file.type.startsWith("image/"))
    return { error: "Screenshot must be an image" };
  if (file.size > MAX_SCREENSHOT_BYTES)
    return { error: "Screenshot must be 5MB or smaller" };
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${tradeId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from("trade-screenshots")
    .upload(path, file, { contentType: file.type });
  if (error) return { error: error.message };
  return { path };
}

export async function createTrade(form: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const parsed = parseTradeForm(form);
  if (!parsed.ok) return parsed;

  parsed.row.day_record_id = await linkDayRecord(
    supabase,
    parsed.row.date as string,
  );

  const { data: inserted, error } = await supabase
    .from("trades")
    .insert(parsed.row)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const file = form.get("screenshot");
  if (file instanceof File && file.size > 0) {
    const up = await uploadScreenshot(supabase, user.id, inserted.id, file);
    if (up.error) return { ok: false, error: `Trade saved, but screenshot failed: ${up.error}` };
    await supabase
      .from("trades")
      .update({ screenshot_url: up.path })
      .eq("id", inserted.id);
  }

  await upsertTags(supabase, parsed.row);
  revalidatePath("/trades");
  revalidatePath("/");
  return { ok: true };
}

export async function updateTrade(
  tradeId: string,
  form: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const parsed = parseTradeForm(form);
  if (!parsed.ok) return parsed;

  parsed.row.day_record_id = await linkDayRecord(
    supabase,
    parsed.row.date as string,
  );

  const file = form.get("screenshot");
  if (file instanceof File && file.size > 0) {
    const up = await uploadScreenshot(supabase, user.id, tradeId, file);
    if (up.error) return { ok: false, error: up.error };
    parsed.row.screenshot_url = up.path;
  }

  const { error } = await supabase
    .from("trades")
    .update(parsed.row)
    .eq("id", tradeId);
  if (error) return { ok: false, error: error.message };

  await upsertTags(supabase, parsed.row);
  revalidatePath("/trades");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteTrade(tradeId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  // Remove any screenshots stored under this trade's folder
  const folder = `${user.id}/${tradeId}`;
  const { data: files } = await supabase.storage
    .from("trade-screenshots")
    .list(folder);
  if (files && files.length > 0) {
    await supabase.storage
      .from("trade-screenshots")
      .remove(files.map((f) => `${folder}/${f.name}`));
  }

  const { error } = await supabase.from("trades").delete().eq("id", tradeId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/trades");
  revalidatePath("/");
  return { ok: true };
}
