import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getClient,
  getLead,
  getBookingsForClient,
} from "@/lib/data";
import {
  PROGRAM_LABELS,
  PROGRAM_MODULES,
  PAYMENT_STATUS,
} from "@/lib/constants";
import { formatDate, formatDateTime, relativeDay } from "@/lib/format";
import {
  Card,
  CardHeader,
  Avatar,
  EmptyState,
  StatTile,
  LinkButton,
} from "@/components/ui";
import { IconChevronRight, IconUnlock } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const client = await getClient(params.id);
  if (!client) notFound();

  const [lead, bookings] = await Promise.all([
    client.lead_id ? getLead(client.lead_id) : Promise.resolve(null),
    getBookingsForClient(client.id),
  ]);

  const name = lead?.name ?? "Unknown";
  const total = client.program_enrolled
    ? PROGRAM_MODULES[client.program_enrolled]
    : 0;
  const pay = PAYMENT_STATUS[client.payment_status];

  const modules = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/clients"
          className="text-sm text-mecca-muted transition hover:text-mecca-gold"
        >
          ← Back to clients
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={name} size={56} />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-mecca-mist">
            {name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-mecca-muted">
            <span className="inline-flex rounded-full border border-mecca-gold/30 bg-mecca-gold/10 px-2.5 py-0.5 text-xs font-medium text-mecca-gold">
              {client.program_enrolled
                ? PROGRAM_LABELS[client.program_enrolled]
                : "—"}
            </span>
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${pay.className}`}
            >
              {pay.label}
            </span>
            <span>· started {formatDate(client.start_date)}</span>
          </div>
        </div>
        {lead && (
          <LinkButton href={`/leads/${lead.id}`} variant="ghost">
            View lead <IconChevronRight className="h-4 w-4" />
          </LinkButton>
        )}
      </div>

      {/* Progress summary */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Current module" value={client.current_module} accent />
        <StatTile label="Modules unlocked" value={`${client.modules_unlocked}/${total || "—"}`} />
        <StatTile
          label="Next unlock"
          value={client.next_unlock_date ? relativeDay(client.next_unlock_date) : "—"}
          hint={client.next_unlock_date ? formatDate(client.next_unlock_date) : undefined}
        />
        <StatTile label="Payment" value={pay.label} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Unlock schedule */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Unlock Schedule" />
            {total === 0 ? (
              <EmptyState>No program enrolled.</EmptyState>
            ) : (
              <ul className="divide-y divide-mecca-border">
                {modules.map((m) => {
                  const unlocked = m <= client.modules_unlocked;
                  const isNext = m === client.modules_unlocked + 1;
                  return (
                    <li
                      key={m}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                          unlocked
                            ? "bg-mecca-gold/15 text-mecca-gold"
                            : "bg-mecca-panel text-mecca-muted"
                        }`}
                      >
                        {m}
                      </span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-mecca-mist">
                          Module {m}
                        </div>
                        <div className="text-xs text-mecca-muted">
                          {unlocked
                            ? "Unlocked"
                            : isNext && client.next_unlock_date
                            ? `Unlocks ${formatDate(client.next_unlock_date)}`
                            : "Scheduled"}
                        </div>
                      </div>
                      {unlocked ? (
                        <span className="text-xs font-medium text-emerald-300">
                          ✓ Available
                        </span>
                      ) : isNext ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-mecca-gold">
                          <IconUnlock className="h-3.5 w-3.5" /> Next
                        </span>
                      ) : (
                        <span className="text-xs text-mecca-muted">Locked</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Right column: payment history */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Payment History" />
            <ul className="divide-y divide-mecca-border">
              <li className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="text-sm font-medium text-mecca-mist">
                    {client.program_enrolled
                      ? PROGRAM_LABELS[client.program_enrolled]
                      : "Program"}{" "}
                    enrollment
                  </div>
                  <div className="text-xs text-mecca-muted">
                    {formatDate(client.start_date)}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${pay.className}`}
                >
                  {pay.label}
                </span>
              </li>
              {bookings
                .filter((b) => b.deposit_paid)
                .map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-mecca-mist">
                        Deposit · {b.session_type ?? "Session"}
                      </div>
                      <div className="text-xs text-mecca-muted">
                        {formatDate(b.session_date)}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                      Paid
                    </span>
                  </li>
                ))}
            </ul>
          </Card>
        </div>

        {/* Bookings (full width below) */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader title={`Session Bookings · ${bookings.length}`} />
            {bookings.length === 0 ? (
              <EmptyState>No bookings yet.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-mecca-border text-left text-xs uppercase tracking-wider text-mecca-muted">
                      <th className="px-5 py-3 font-medium">Session</th>
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">Format</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mecca-border">
                    {bookings.map((b) => (
                      <tr key={b.id}>
                        <td className="px-5 py-3 font-medium text-mecca-mist">
                          {b.session_type ?? "Session"}
                        </td>
                        <td className="px-5 py-3 text-mecca-muted">
                          {formatDateTime(b.session_date)}
                        </td>
                        <td className="px-5 py-3 text-mecca-muted">
                          {b.format === "in_person" ? "In person" : "Remote"}
                        </td>
                        <td className="px-5 py-3">
                          <BookingStatus completed={b.completed} confirmed={b.confirmed} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function BookingStatus({
  completed,
  confirmed,
}: {
  completed: boolean;
  confirmed: boolean;
}) {
  if (completed)
    return (
      <span className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
        Completed
      </span>
    );
  if (confirmed)
    return (
      <span className="inline-flex rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-300">
        Confirmed
      </span>
    );
  return (
    <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300">
      Pending
    </span>
  );
}
