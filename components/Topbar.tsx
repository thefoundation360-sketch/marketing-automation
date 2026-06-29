"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconSearch } from "@/components/icons";

const MOBILE_NAV = [
  { href: "/", label: "Home" },
  { href: "/leads", label: "Leads" },
  { href: "/clients", label: "Clients" },
  { href: "/bookings", label: "Bookings" },
  { href: "/sequences", label: "Sequences" },
  { href: "/settings", label: "Settings" },
];

export default function Topbar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-20 border-b border-mecca-border bg-mecca-ink/80 backdrop-blur">
      <div className="flex h-16 items-center gap-4 px-5 lg:px-8">
        <div className="flex items-center gap-2 lg:hidden">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-mecca-gold text-sm font-bold text-mecca-black">
            FM
          </div>
        </div>

        <div className="relative hidden max-w-md flex-1 sm:block">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mecca-muted" />
          <input
            type="search"
            placeholder="Search leads, clients…"
            className="w-full rounded-lg border border-mecca-border bg-mecca-panel py-2 pl-9 pr-3 text-sm text-mecca-mist placeholder:text-mecca-muted focus:border-mecca-gold/50 focus:outline-none"
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-right text-xs leading-tight text-mecca-muted sm:block">
            Signed in as
            <span className="block font-medium text-mecca-mist">Admin</span>
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-mecca-gold/15 text-sm font-semibold text-mecca-gold ring-1 ring-mecca-gold/30">
            A
          </div>
        </div>
      </div>

      {/* Mobile horizontal nav */}
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2 lg:hidden">
        {MOBILE_NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
              isActive(href)
                ? "bg-mecca-gold/10 text-mecca-gold"
                : "text-mecca-muted"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
