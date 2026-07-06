export default function JournalPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
        <p className="mt-1 text-sm text-muted">
          Daily check-ins across the five pillars: risk, stress, attitude,
          discipline, and decision process.
        </p>
      </div>
      <div className="card p-10 text-center text-sm text-muted">
        Daily check-in entry is coming in the next build-out. The{" "}
        <code>daily_checkins</code> table and weekly aggregate views are
        already in place.
      </div>
    </div>
  );
}
