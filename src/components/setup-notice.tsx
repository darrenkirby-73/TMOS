import { configProblems, missingSupabaseVars } from "@/lib/env";

/**
 * Shown wherever data would be, while Supabase isn't configured. It names the
 * variables that are actually absent and covers both places they get set —
 * this is the first screen a fresh deployment renders, so it has to be enough
 * on its own.
 */
export function SetupNotice() {
  // A value that's present but unusable is a different problem with a
  // different fix, and saying "not set" about it sends you looking in the
  // wrong place.
  if (missingSupabaseVars.length === 0 && configProblems.length > 0) {
    return (
      <div className="card p-5 text-sm">
        <p className="font-medium">Supabase is configured, but the values won&apos;t work</p>
        <ul className="mt-2 flex flex-col gap-2 text-muted">
          {configProblems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
        <p className="mt-3 text-muted">
          Re-copy the value from Supabase (Project Settings → API) into your
          deployment&apos;s environment variables, taking just the value
          itself, and redeploy.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5 text-sm">
      <p className="font-medium">Connect Supabase to get started</p>
      <p className="mt-1 text-muted">
        {missingSupabaseVars.length === 2
          ? "Neither Supabase variable is set:"
          : "One Supabase variable is missing:"}
      </p>
      <ul className="mt-2 flex flex-col gap-1">
        {missingSupabaseVars.map((name) => (
          <li key={name}>
            <code className="rounded bg-background px-1 py-0.5">{name}</code>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-muted">
        <span className="font-medium text-foreground">Deployed:</span> add them
        in Vercel under Project Settings → Environment Variables, then redeploy
        — Vercel does not apply new variables to a deployment that already
        exists.
      </p>
      <p className="mt-1.5 text-muted">
        <span className="font-medium text-foreground">Locally:</span> copy{" "}
        <code className="rounded bg-background px-1 py-0.5">.env.example</code>{" "}
        to{" "}
        <code className="rounded bg-background px-1 py-0.5">.env.local</code>{" "}
        and fill them in.
      </p>
      <p className="mt-3 text-muted">
        The values are in Supabase under Project Settings → API. Then apply the
        migration in <code>supabase/migrations/</code> — see{" "}
        <code>docs/UAT.md</code>.
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
