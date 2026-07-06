import Link from "next/link";
import { Nav } from "@/components/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { isSupabaseConfigured } from "@/lib/env";
import { signOut } from "@/app/login/actions";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-base font-semibold tracking-tight">
              TMOS
            </Link>
            <Nav />
          </div>
          <div className="flex items-center gap-2">
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
