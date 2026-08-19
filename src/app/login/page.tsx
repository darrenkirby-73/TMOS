import { isSupabaseConfigured, missingSupabaseVars } from "@/lib/env";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="card w-full max-w-sm p-8">
        <h1 className="text-2xl font-semibold tracking-tight">TMOS</h1>
        <p className="mt-1 text-sm text-muted">
          Trader&apos;s Mental Operating System
        </p>

        {isSupabaseConfigured ? (
          <form action={signIn} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="rounded-xl border border-border-subtle bg-background px-3.5 py-2.5 text-base outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Password
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="rounded-xl border border-border-subtle bg-background px-3.5 py-2.5 text-base outline-none focus:border-accent"
              />
            </label>
            {error ? (
              <p className="text-sm text-negative" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="mt-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            >
              Sign in
            </button>
          </form>
        ) : (
          <div className="mt-8 text-sm text-muted">
            <p>
              Supabase isn&apos;t configured yet, so there&apos;s nothing to
              sign in to. Missing:
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {missingSupabaseVars.map((name) => (
                <li key={name}>
                  <code className="rounded bg-background px-1 py-0.5">
                    {name}
                  </code>
                </li>
              ))}
            </ul>
            <p className="mt-3">
              Set them in Vercel (Project Settings → Environment Variables, then
              redeploy) or in <code>.env.local</code> when running locally. The
              values come from Supabase under Project Settings → API.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
