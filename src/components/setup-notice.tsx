export function SetupNotice() {
  return (
    <div className="card p-5 text-sm">
      <p className="font-medium">Connect Supabase to get started</p>
      <p className="mt-1 text-muted">
        Copy <code>.env.example</code> to <code>.env.local</code>, fill in your
        project URL and anon key, then apply the migration in{" "}
        <code>supabase/migrations/</code>. See the README for full setup steps.
      </p>
    </div>
  );
}

export function LoadError({ message }: { message: string }) {
  return (
    <div className="card p-5 text-sm">
      <p className="font-medium">Couldn&apos;t load data</p>
      <p className="mt-1 text-muted">
        {message} — if the tables don&apos;t exist yet, apply the migration in{" "}
        <code>supabase/migrations/</code>.
      </p>
    </div>
  );
}
