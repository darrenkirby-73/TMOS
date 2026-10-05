"use server";

import { revalidatePath } from "next/cache";
import { isValidIsoDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { SystemStatus, TagCategory } from "@/lib/types";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const CATEGORIES: TagCategory[] = [
  "setup",
  "system",
  "winning_attitude",
  "losing_attitude",
  "lapse_type",
];

const STATUSES: SystemStatus[] = ["active", "testing", "retired"];

/** Trade columns that hold a vocabulary label as free text. */
const TAG_TRADE_COLUMN: Partial<Record<TagCategory, string>> = {
  setup: "setup",
  system: "system",
  lapse_type: "lapse_type",
  winning_attitude: "winning_attitude_applied",
  losing_attitude: "attitude_tag",
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function createTag(
  category: TagCategory,
  label: string,
): Promise<ActionResult> {
  if (!CATEGORIES.includes(category))
    return { ok: false, error: "Unknown list" };
  const trimmed = label.trim();
  if (trimmed === "") return { ok: false, error: "Enter a label" };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("tags").insert({
    category,
    label: trimmed,
  });
  if (error) {
    // The unique constraint is (user_id, category, label).
    if (error.code === "23505")
      return { ok: false, error: `"${trimmed}" is already in this list` };
    return { ok: false, error: error.message };
  }

  revalidatePath("/settings");
  return { ok: true, message: `Added "${trimmed}"` };
}

/**
 * Renaming a label leaves existing trades holding the old text, because
 * trades store the label rather than a reference. `applyToTrades` offers to
 * carry the change through so the vocabulary doesn't fragment — off by
 * default, since rewriting logged trades is not something to do silently.
 */
export async function renameTag(
  id: string,
  category: TagCategory,
  previousLabel: string,
  nextLabel: string,
  applyToTrades: boolean,
): Promise<ActionResult> {
  if (!CATEGORIES.includes(category))
    return { ok: false, error: "Unknown list" };
  const trimmed = nextLabel.trim();
  if (trimmed === "") return { ok: false, error: "Enter a label" };
  if (trimmed === previousLabel) return { ok: true, message: "No change" };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase
    .from("tags")
    .update({ label: trimmed })
    .eq("id", id);
  if (error) {
    if (error.code === "23505")
      return { ok: false, error: `"${trimmed}" is already in this list` };
    return { ok: false, error: error.message };
  }

  let updated = 0;
  const column = TAG_TRADE_COLUMN[category];
  if (applyToTrades && column) {
    const { data, error: tradeError } = await supabase
      .from("trades")
      .update({ [column]: trimmed })
      .eq(column, previousLabel)
      .select("id");
    if (tradeError) {
      return {
        ok: false,
        error: `Renamed the label, but updating trades failed: ${tradeError.message}`,
      };
    }
    updated = data?.length ?? 0;
  }

  revalidatePath("/settings");
  revalidatePath("/trades");
  revalidatePath("/reports");
  return {
    ok: true,
    message: applyToTrades
      ? `Renamed to "${trimmed}" and updated ${updated} ${updated === 1 ? "trade" : "trades"}`
      : `Renamed to "${trimmed}"`,
  };
}

/**
 * Removes a label from the offered vocabulary. Trades that already use it
 * keep their text — deleting a suggestion must never rewrite history.
 */
export async function deleteTag(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("tags").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  return { ok: true, message: "Removed from the list" };
}

/** How many trades still reference a label, so deleting it is an informed choice. */
export async function countTradesUsing(
  category: TagCategory,
  label: string,
): Promise<number> {
  const column = TAG_TRADE_COLUMN[category];
  if (!column) return 0;

  const { supabase, user } = await requireUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("trades")
    .select("id", { count: "exact", head: true })
    .eq(column, label);
  return count ?? 0;
}

export type SystemInput = {
  id?: string;
  name: string;
  status: SystemStatus;
  markets: string;
  timeframe: string;
  entry_rules: string;
  exit_rules: string;
  stop_rules: string;
  position_sizing: string;
  edge_rationale: string;
  notes: string;
};

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export async function saveSystem(input: SystemInput): Promise<ActionResult> {
  const name = input.name.trim();
  if (name === "") return { ok: false, error: "A system needs a name" };
  if (!STATUSES.includes(input.status))
    return { ok: false, error: "Unknown status" };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const row = {
    name,
    status: input.status,
    markets: blankToNull(input.markets),
    timeframe: blankToNull(input.timeframe),
    entry_rules: blankToNull(input.entry_rules),
    exit_rules: blankToNull(input.exit_rules),
    stop_rules: blankToNull(input.stop_rules),
    position_sizing: blankToNull(input.position_sizing),
    edge_rationale: blankToNull(input.edge_rationale),
    notes: blankToNull(input.notes),
  };

  const { error } = input.id
    ? await supabase.from("trading_systems").update(row).eq("id", input.id)
    : await supabase.from("trading_systems").insert(row);

  if (error) {
    if (error.code === "23505")
      return { ok: false, error: `A system named "${name}" already exists` };
    return { ok: false, error: error.message };
  }

  // Keep the name available as a trade-form suggestion. Failing here isn't
  // worth losing the definition over, so the result is ignored.
  await supabase
    .from("tags")
    .insert({ category: "system", label: name })
    .select("id");

  revalidatePath("/settings/systems");
  revalidatePath("/settings");
  revalidatePath("/trades");
  return { ok: true, message: input.id ? "System saved" : `Added "${name}"` };
}

export async function deleteSystem(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("trading_systems").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings/systems");
  return { ok: true, message: "System definition deleted" };
}

// ---------------------------------------------------------------------------
// Account equity and risk limits — the inputs position sizing depends on.
// ---------------------------------------------------------------------------

export async function saveEquity(input: {
  id?: string;
  asOfDate: string;
  amount: number;
  note: string;
}): Promise<ActionResult> {
  if (!isValidIsoDate(input.asOfDate))
    return { ok: false, error: "Enter a valid date" };
  if (!Number.isFinite(input.amount) || input.amount <= 0)
    return { ok: false, error: "Equity must be a positive amount" };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const row = {
    as_of_date: input.asOfDate,
    amount: input.amount,
    note: blankToNull(input.note),
  };

  const { error } = input.id
    ? await supabase.from("account_equity").update(row).eq("id", input.id)
    : await supabase.from("account_equity").insert(row);

  if (error) {
    if (error.code === "23505")
      return {
        ok: false,
        error: `There is already an equity entry for ${input.asOfDate}. Edit that one instead.`,
      };
    return { ok: false, error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/sizing");
  return { ok: true, message: "Equity saved" };
}

export async function deleteEquity(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("account_equity").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/sizing");
  return { ok: true, message: "Equity entry removed" };
}

/**
 * Risk limits are stored per user and must stay mutually coherent — a
 * per-trade limit above the open cap would reject its own guidance. The
 * database enforces this too; checking here produces a readable message
 * instead of a constraint violation.
 */
export async function saveRiskSettings(input: {
  perTradePercent: number;
  maxOpenRiskPercent: number;
  maxNewDailyRiskPercent: number;
}): Promise<ActionResult> {
  const values = [
    { label: "Risk per trade", value: input.perTradePercent },
    { label: "Max open risk", value: input.maxOpenRiskPercent },
    { label: "Max new daily risk", value: input.maxNewDailyRiskPercent },
  ];
  for (const { label, value } of values) {
    if (!Number.isFinite(value) || value <= 0 || value > 100)
      return { ok: false, error: `${label} must be between 0 and 100` };
  }
  if (input.maxOpenRiskPercent < input.perTradePercent)
    return {
      ok: false,
      error:
        "Max open risk cannot be below the per-trade risk — one position would exceed the cap on its own",
    };
  if (input.maxNewDailyRiskPercent < input.perTradePercent)
    return {
      ok: false,
      error:
        "Max new daily risk cannot be below the per-trade risk — you could not open a single trade",
    };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { error } = await supabase.from("risk_settings").upsert(
    {
      user_id: user.id,
      per_trade_percent: input.perTradePercent,
      max_open_risk_percent: input.maxOpenRiskPercent,
      max_new_daily_risk_percent: input.maxNewDailyRiskPercent,
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/sizing");
  return { ok: true, message: "Risk limits saved" };
}
