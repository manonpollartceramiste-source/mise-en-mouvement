"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { label: string; href: string };

const EXACT_HREFS = new Set(["/os/coach", "/os/client", "/os/admin"]);

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (EXACT_HREFS.has(href)) return false;
  return pathname.startsWith(href + "/");
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className={`block rounded-xl px-3 py-2.5 text-sm transition-colors ${
              isActive(pathname, item.href)
                ? "bg-sand-100 font-medium text-ink-900"
                : "text-taupe-700 hover:bg-sand-100 hover:text-ink-900"
            }`}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function NavLinksHorizontal({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <>
      {items.map((item) => (
        <li key={item.href} className="shrink-0 list-none">
          <Link
            href={item.href}
            className={`block rounded-xl px-3 py-2 text-sm transition-colors ${
              isActive(pathname, item.href)
                ? "bg-sand-100 font-medium text-ink-900"
                : "text-taupe-600 hover:bg-sand-100 hover:text-ink-900"
            }`}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </>
  );
}
