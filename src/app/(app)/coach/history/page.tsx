import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { LoadError, SetupNotice } from "@/components/setup-notice";
import { EmptyState } from "@/components/ui/empty-state";
import { isSupabaseConfigured } from "@/lib/env";
import { WORKFLOWS } from "@/lib/prompts";
import { createClient } from "@/lib/supabase/server";
import type { CoachingSession } from "@/lib/types";

export default async function CoachHistoryPage() {
  let sessions: CoachingSession[] = [];
  let error: string | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const res = await supabase
      .from("coaching_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    error = res.error?.message ?? null;
    sessions = (res.data as CoachingSession[]) ?? [];
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Coaching history
        </h1>
        <p className="mt-1 text-sm text-muted">
          Your 50 most recent coaching sessions.{" "}
          <Link href="/coach" className="text-accent hover:underline">
            Back to coach
          </Link>
        </p>
      </div>

      {!isSupabaseConfigured ? (
        <SetupNotice />
      ) : error ? (
        <LoadError message={error} />
      ) : sessions.length === 0 ? (
        <EmptyState title="No coaching sessions yet">
          Run a workflow from the Coach page and it will appear here.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {sessions.map((s) => (
            <details key={s.id} className="card p-5">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {WORKFLOWS[s.workflow]?.label ?? s.workflow}
                </span>
                <span className="text-xs text-faint">
                  {new Date(s.created_at).toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  · {s.model === "mock" ? "mock mode" : s.model}
                </span>
              </summary>
              <div className="mt-4 border-t border-border-subtle pt-4">
                <Markdown text={s.response} />
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
