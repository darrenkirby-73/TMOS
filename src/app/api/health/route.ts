import { NextResponse } from "next/server";
import { isCoachConfigured } from "@/lib/coach";
import { isSupabaseConfigured, missingSupabaseVars } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Unauthenticated wiring check for a fresh deployment: is the config present,
 * and does the schema actually exist behind it? A green build proves neither.
 *
 * Deliberately reports names and states only — no values, no user data. It is
 * public (see the isPublic list in src/proxy.ts) because its whole purpose is
 * to answer "why can't I sign in?" before anyone can sign in.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {
    supabaseConfigured: isSupabaseConfigured,
    missingEnvVars: missingSupabaseVars,
    coachMode: isCoachConfigured() ? "live" : "mock",
  };

  if (isSupabaseConfigured) {
    try {
      const supabase = await createClient();
      // head+count touches the table without reading rows. RLS means an
      // anonymous caller legitimately sees zero — an error here is a missing
      // table or an unreachable project, which is what we're testing for.
      const { error } = await supabase
        .from("trades")
        .select("id", { count: "exact", head: true });
      checks.schemaReachable = !error;
      if (error) checks.schemaError = error.message;
    } catch (err) {
      checks.schemaReachable = false;
      checks.schemaError =
        err instanceof Error ? err.message : "Unknown error reaching Supabase";
    }
  }

  const ok = checks.supabaseConfigured === true && checks.schemaReachable === true;

  return NextResponse.json(
    { ok, ...checks },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
