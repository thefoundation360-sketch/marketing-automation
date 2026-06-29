import Link from "next/link";
import { getBookings, getClients, getLeads } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { PageHeader, Card, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const [bookings, clients, leads] = await Promise.all([
    getBookings(),
    getClients(),
    getLeads(),
  ]);

  const clientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    return leads.find((l) => l.id === client?.lead_id)?.name ?? "Unknown";
  };

  const sorted = [...bookings].sort((a, b) =>
    (b.session_date ?? "").localeCompare(a.session_date ?? "")
  );

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle={`${bookings.length} coaching sessions`}
      />
      <Card className="overflow-hidden">
        {sorted.length === 0 ? (
          <EmptyState>No bookings yet.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mecca-border text-left text-xs uppercase tracking-wider text-mecca-muted">
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Session</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Format</th>
                  <th className="px-5 py-3 font-medium">Deposit</th>
                  <th className="px-5 py-3 font-medium">Reminders</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mecca-border">
                {sorted.map((b) => (
                  <tr
                    key={b.id}
                    className="transition hover:bg-mecca-cardhover"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/clients/${b.client_id}`}
                        className="font-medium text-mecca-mist hover:text-mecca-gold"
                      >
                        {clientName(b.client_id)}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-mecca-mist">
                      {b.session_type ?? "Session"}
                    </td>
                    <td className="px-5 py-3 text-mecca-muted">
                      {formatDateTime(b.session_date)}
                    </td>
                    <td className="px-5 py-3 text-mecca-muted">
                      {b.format === "in_person" ? "In person" : "Remote"}
                    </td>
                    <td className="px-5 py-3">
                      <Dot on={b.deposit_paid} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1.5 text-[11px]">
                        <Pill on={b.reminder_sent_48hr}>48h</Pill>
                        <Pill on={b.reminder_sent_2hr}>2h</Pill>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {b.completed ? (
                        <span className="text-emerald-300">Completed</span>
                      ) : b.confirmed ? (
                        <span className="text-sky-300">Confirmed</span>
                      ) : (
                        <span className="text-amber-300">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Dot({ on }: { on: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${
        on ? "bg-emerald-400" : "bg-mecca-border"
      }`}
    />
  );
}

function Pill({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 ${
        on
          ? "bg-emerald-500/10 text-emerald-300"
          : "bg-mecca-panel text-mecca-muted"
      }`}
    >
      {children}
    </span>
  );
}
