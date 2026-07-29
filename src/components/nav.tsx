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
  { href: "/coach", label: "Coach" },
];

export function Nav({ className = "" }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      // Scrolls horizontally rather than wrapping or clipping — on a phone
      // this row holds all seven destinations.
      className={`-mx-1 flex items-center gap-1 overflow-x-auto px-1 ${className}`}
    >
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
