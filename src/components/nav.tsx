"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/trades", label: "Trades" },
  { href: "/morning", label: "Morning" },
  { href: "/evening", label: "Evening" },
  { href: "/reports", label: "Reports" },
  { href: "/weekly", label: "Weekly" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {links.map(({ href, label }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "whitespace-nowrap rounded-full bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent"
                : "whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
