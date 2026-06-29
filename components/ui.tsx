import Link from "next/link";
import { initials } from "@/lib/format";

// ----------------------------------------------------------------------------
// Small presentational primitives shared across the dashboard.
// ----------------------------------------------------------------------------

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-mecca-border bg-mecca-card ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
  icon,
}: {
  title: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-mecca-border px-5 py-3.5">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-mecca-gold">{icon}</span>}
        <h2 className="text-sm font-semibold tracking-wide text-mecca-mist">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-mecca-gold/15 font-semibold text-mecca-gold ring-1 ring-mecca-gold/30"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-mecca-mist">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-mecca-muted">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-mecca-border bg-mecca-panel px-4 py-3">
      <div className="text-xs uppercase tracking-wider text-mecca-muted">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-semibold ${
          accent ? "text-mecca-gold" : "text-mecca-mist"
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-mecca-muted">{hint}</div>}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 py-8 text-center text-sm text-mecca-muted">
      {children}
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost";
}) {
  const styles =
    variant === "primary"
      ? "bg-mecca-gold text-mecca-black hover:bg-mecca-goldsoft"
      : "border border-mecca-border text-mecca-mist hover:bg-mecca-cardhover";
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition ${styles}`}
    >
      {children}
    </Link>
  );
}
