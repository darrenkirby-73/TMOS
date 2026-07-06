export default function ChecklistPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Checklist</h1>
        <p className="mt-1 text-sm text-muted">
          Pre-market discipline checklist, ticked off each trading day.
        </p>
      </div>
      <div className="card p-10 text-center text-sm text-muted">
        The daily checklist UI is coming in the next build-out. The{" "}
        <code>checklist_items</code> and <code>checklist_completions</code>{" "}
        tables (with editable seed defaults) are already in place.
      </div>
    </div>
  );
}
