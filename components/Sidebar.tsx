"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconDashboard,
  IconLeads,
  IconClients,
  IconBookings,
  IconSequences,
  IconSettings,
} from "@/components/icons";

const NAV = [
  { href: "/", label: "Dashboard", Icon: IconDashboard },
  { href: "/leads", label: "Leads", Icon: IconLeads },
  { href: "/clients", label: "Clients", Icon: IconClients },
  { href: "/bookings", label: "Bookings", Icon: IconBookings },
  { href: "/sequences", label: "Sequences", Icon: IconSequences },
  { href: "/settings", label: "Settings", Icon: IconSettings },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-mecca-border bg-mecca-ink lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-mecca-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mecca-gold font-bold text-mecca-black">
          FM
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-mecca-mist">Sync Master</div>
          <div className="text-[11px] uppercase tracking-widest text-mecca-gold">
            Foundation Mecca
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-mecca-gold/10 text-mecca-gold"
                  : "text-mecca-muted hover:bg-mecca-card hover:text-mecca-mist"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-mecca-gold" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-mecca-border px-6 py-4 text-[11px] text-mecca-muted">
        © Foundation Mecca
      </div>
    </aside>
  );
}
