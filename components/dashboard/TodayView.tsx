import Link from "next/link";
import { getTodayData } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { Card, CardHeader, EmptyState } from "@/components/ui";
import { IconPhone, IconBolt, IconUnlock } from "@/components/icons";

export default async function TodayView() {
  const { calls, automations, unlocks } = await getTodayData();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Card className="flex h-full flex-col">
      <CardHeader title="Today" action={<span className="text-xs text-mecca-muted">{today}</span>} />
      <div className="flex-1 space-y-5 p-5">
        <Section
          icon={<IconPhone className="h-4 w-4" />}
          label="Calls booked"
          count={calls.length}
        >
          {calls.length === 0 ? (
            <EmptyRow>No calls booked today.</EmptyRow>
          ) : (
            calls.map(({ booking, name }) => (
              <Row
                key={booking.id}
                href={`/clients/${booking.client_id}`}
                title={name}
                meta={`${booking.session_type ?? "Session"} · ${formatDateTime(
                  booking.session_date
                )}`}
                tag={booking.format === "in_person" ? "In person" : "Remote"}
              />
            ))
          )}
        </Section>

        <Section
          icon={<IconBolt className="h-4 w-4" />}
          label="Automations firing"
          count={automations.length}
        >
          {automations.length === 0 ? (
            <EmptyRow>No automations scheduled today.</EmptyRow>
          ) : (
            automations.map(({ sequence, name }) => (
              <Row
                key={sequence.id}
                href={`/leads/${sequence.lead_id}`}
                title={name}
                meta={`${sequence.sequence_type} · day ${sequence.day_number}`}
                tag={formatDateTime(sequence.scheduled_at)}
              />
            ))
          )}
        </Section>

        <Section
          icon={<IconUnlock className="h-4 w-4" />}
          label="Module unlocks"
          count={unlocks.length}
        >
          {unlocks.length === 0 ? (
            <EmptyRow>No module unlocks today.</EmptyRow>
          ) : (
            unlocks.map(({ client, name }) => (
              <Row
                key={client.id}
                href={`/clients/${client.id}`}
                title={name}
                meta={`Unlocking module ${client.current_module + 1}`}
                tag="Unlock"
              />
            ))
          )}
        </Section>
      </div>
    </Card>
  );
}

function Section({
  icon,
  label,
  count,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-mecca-muted">
        <span className="text-mecca-gold">{icon}</span>
        {label}
        <span className="ml-auto rounded-full bg-mecca-panel px-2 py-0.5 text-[11px] text-mecca-mist">
          {count}
        </span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({
  href,
  title,
  meta,
  tag,
}: {
  href: string;
  title: string;
  meta: string;
  tag: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-mecca-border bg-mecca-panel px-3 py-2 transition hover:bg-mecca-cardhover"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-mecca-mist">{title}</div>
        <div className="truncate text-xs text-mecca-muted">{meta}</div>
      </div>
      <span className="shrink-0 rounded-md bg-mecca-gold/10 px-2 py-0.5 text-[11px] font-medium text-mecca-gold">
        {tag}
      </span>
    </Link>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-mecca-border px-3 py-2.5 text-xs text-mecca-muted">
      {children}
    </div>
  );
}
