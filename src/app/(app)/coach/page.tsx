import { SetupNotice } from "@/components/setup-notice";
import { isCoachConfigured } from "@/lib/coach";
import { isSupabaseConfigured } from "@/lib/env";
import { WORKFLOW_LIST } from "@/lib/prompts";
import { CoachView } from "./coach-view";

export default function CoachPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Coach</h1>
        <p className="mt-1 text-sm text-muted">
          Process coaching from your own records. The coach never recommends
          trades, never predicts markets, and never invents market data — it
          asks you to confirm anything it can&apos;t see.
        </p>
      </div>
      {!isSupabaseConfigured ? (
        <SetupNotice />
      ) : (
        <CoachView
          workflows={WORKFLOW_LIST}
          configured={isCoachConfigured()}
        />
      )}
    </div>
  );
}
