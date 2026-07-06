"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/journal", label: "Journal" },
  { href: "/trades", label: "Trades" },
  { href: "/checklist", label: "Checklist" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {links.map(({ href, label }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "rounded-full bg-accent-soft px-3.5 py-1.5 text-sm font-medium text-accent"
                : "rounded-full px-3.5 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
