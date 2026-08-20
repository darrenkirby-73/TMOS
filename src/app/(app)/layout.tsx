import Link from "next/link";
import { Nav } from "@/components/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToastProvider } from "@/components/ui/toast";
import { isSupabaseConfigured } from "@/lib/env";
import { signOut } from "@/app/login/actions";

/**
 * Every page in here is signed-in, per-user data — none of it may be
 * prerendered into a static asset. Without this, a build that ran before
 * Supabase was configured bakes the setup notice into the HTML of pages that
 * don't happen to touch cookies at the top level, and they keep serving it
 * from cache even once the configuration is fixed. Inherited by all child
 * segments.
 */
export const dynamic = "force-dynamic";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-border-subtle bg-background/80 backdrop-blur">
          {/* Nav takes its own full-width row on phones so all destinations
              stay reachable, and sits inline from sm upwards. */}
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
            <Link
              href="/"
              className="order-1 text-base font-semibold tracking-tight"
            >
              TMOS
            </Link>
            <div className="order-2 ml-auto flex shrink-0 items-center gap-2 sm:order-3">
              <ThemeToggle />
              {isSupabaseConfigured ? (
                <form action={signOut}>
                  <button
                    type="submit"
                    className="rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
                  >
                    Sign out
                  </button>
                </form>
              ) : null}
            </div>
            <Nav className="order-3 w-full sm:order-2 sm:w-auto" />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
