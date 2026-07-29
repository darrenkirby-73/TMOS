import Link from "next/link";
import { Nav } from "@/components/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { ToastProvider } from "@/components/ui/toast";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (isSupabaseConfigured) {
    // Seed starter tags on first use — a no-op once any tags exist.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.rpc("seed_defaults");
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-border-subtle bg-background/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-4 sm:gap-6">
              <Link href="/" className="text-base font-semibold tracking-tight">
                TMOS
              </Link>
              <Nav />
            </div>
            <div className="flex shrink-0 items-center gap-2">
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
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
