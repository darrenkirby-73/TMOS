import { ScoreTile } from "@/components/score-tile";
import {
  WeeklyScoreChart,
  type WeeklyScore,
} from "@/components/weekly-score-chart";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const PILLARS = [
  { key: "risk_score", label: "Risk" },
  { key: "stress_score", label: "Stress" },
  { key: "attitude_score", label: "Attitude" },
  { key: "discipline_score", label: "Discipline" },
  { key: "process_score", label: "Decision process" },
] as const;

type Checkin = Record<(typeof PILLARS)[number]["key"], number>;

// Clearly-marked sample data shown until Supabase is connected, so the
// dashboard demonstrates the intended layout on first run.
const SAMPLE_WEEKS: WeeklyScore[] = [
  { week: "May 25", score: 5.4 },
  { week: "Jun 1", score: 6.1 },
  { week: "Jun 8", score: 5.8 },
  { week: "Jun 15", score: 6.6 },
  { week: "Jun 22", score: 7.0 },
  { week: "Jun 29", score: 6.8 },
];

function weekLabel(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

async function loadData(): Promise<{
  checkin: Checkin | null;
  weeks: WeeklyScore[] | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [checkinRes, weeksRes] = await Promise.all([
    supabase
      .from("daily_checkins")
      .select(PILLARS.map((p) => p.key).join(","))
      .eq("checkin_date", today)
      .maybeSingle<Checkin>(),
    supabase
      .from("weekly_checkin_averages")
      .select("week_start, composite_avg")
      .order("week_start", { ascending: true })
      .limit(8),
  ]);

  if (checkinRes.error || weeksRes.error) {
    return {
      checkin: null,
      weeks: null,
      error:
        checkinRes.error?.message ??
        weeksRes.error?.message ??
        "Unknown error",
    };
  }

  return {
    checkin: checkinRes.data,
    weeks: (weeksRes.data ?? []).map((w) => ({
      week: weekLabel(w.week_start as string),
      score: Number(w.composite_avg),
    })),
    error: null,
  };
}

export default async function DashboardPage() {
  const configured = isSupabaseConfigured;
  const { checkin, weeks, error } = configured
    ? await loadData()
    : { checkin: null, weeks: null, error: null };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Today&apos;s mental state and your weekly trend.
        </p>
      </div>

      {!configured ? (
        <div className="card border-accent/30 p-5 text-sm">
          <p className="font-medium">Connect Supabase to get started</p>
          <p className="mt-1 text-muted">
            Copy <code>.env.example</code> to <code>.env.local</code>, fill in
            your project URL and anon key, then apply the migration in{" "}
            <code>supabase/migrations/</code>. Sample data is shown below.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="card p-5 text-sm">
          <p className="font-medium">Couldn&apos;t load data</p>
          <p className="mt-1 text-muted">
            {error} — if the tables don&apos;t exist yet, apply the migration
            in <code>supabase/migrations/</code>.
          </p>
        </div>
      ) : null}

      <section aria-label="Today's check-in">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {PILLARS.map((p) => (
            <ScoreTile
              key={p.key}
              label={p.label}
              value={checkin ? checkin[p.key] : null}
            />
          ))}
        </div>
        {configured && !checkin && !error ? (
          <p className="mt-3 text-sm text-muted">
            No check-in yet today — head to the Journal to log one.
          </p>
        ) : null}
      </section>

      <section aria-label="Weekly trend" className="card p-6">
        <h2 className="text-base font-semibold">
          Weekly average check-in score
        </h2>
        {!configured ? (
          <p className="mt-0.5 text-xs text-faint">
            Sample data — connect Supabase to see your own
          </p>
        ) : null}
        <div className="mt-4">
          {configured && weeks && weeks.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">
              No check-ins recorded yet. Your weekly trend will appear here.
            </p>
          ) : (
            <WeeklyScoreChart data={configured ? (weeks ?? []) : SAMPLE_WEEKS} />
          )}
        </div>
      </section>
    </div>
  );
}
