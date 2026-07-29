/**
 * Route-level loading state. Server pages fetch from Supabase before they
 * render, so navigation shows this skeleton rather than a blank frame.
 */
export default function Loading() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div className="flex flex-col gap-2">
        <div className="h-7 w-48 rounded-lg bg-border-subtle" />
        <div className="h-4 w-72 max-w-full rounded bg-border-subtle" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-24" />
        ))}
      </div>
      <div className="card h-64" />
    </div>
  );
}
