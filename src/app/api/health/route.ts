import { NextResponse } from "next/server";
import { isCoachConfigured } from "@/lib/coach";
import {
  configProblems,
  isSupabaseConfigured,
  missingSupabaseVars,
} from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Unauthenticated wiring check for a deployment: is the config present, where
 * is it present, which build am I actually looking at, and does the schema
 * exist behind it? A green build proves none of that.
 *
 * `deployment` matters more than it looks. Vercel's hashed per-deployment
 * URLs pin one build forever, and variables scoped to Preview never reach
 * Production. From the setup notice alone those look identical to having set
 * nothing, so the commit, branch and environment are reported here to tell
 * the three apart.
 *
 * Names and states only — no values, no user data. It is public (see the
 * isPublic list in src/proxy.ts) because its whole purpose is to answer "why
 * can't I sign in?" before anyone can sign in.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {
    supabaseConfigured: isSupabaseConfigured,
    missingEnvVars: missingSupabaseVars,
    // Present but unusable — a stray character or a value that isn't a URL.
    configProblems,
    deployment: {
      // Set by Vercel at runtime; undefined when running anywhere else.
      environment: process.env.VERCEL_ENV ?? "not-vercel",
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? null,
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      url: process.env.VERCEL_URL ?? null,
    },
    coachMode: isCoachConfigured() ? "api" : "paste-through/mock",
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
