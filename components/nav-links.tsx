"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Today" },
  { href: "/journal", label: "Journal" },
  { href: "/review", label: "Review" },
  { href: "/settings", label: "Settings" },
] as const;

export function NavLinks({ due }: { due: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5 sm:gap-1">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative rounded-full px-2.5 py-1.5 text-[12px] sm:px-3 sm:text-[13px] transition ${
              active ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper-deep hover:text-ink"
            }`}
          >
            {item.label}
            {item.href === "/review" && due > 0 ? (
              <span
                className={`ml-1.5 inline-flex min-w-[18px] justify-center rounded-full px-1 text-[11px] font-semibold ${
                  active ? "bg-paper text-ink" : "bg-accent text-paper"
                }`}
              >
                {due}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
