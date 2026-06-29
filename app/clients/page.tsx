import Link from "next/link";
import { getClients, getLeads } from "@/lib/data";
import { PROGRAM_LABELS, PROGRAM_MODULES, PAYMENT_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { PageHeader, Card, Avatar } from "@/components/ui";
import { IconChevronRight } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const [clients, leads] = await Promise.all([getClients(), getLeads()]);
  const nameOf = (leadId: string | null) =>
    leads.find((l) => l.id === leadId)?.name ?? "Unknown";

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} enrolled clients`}
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-mecca-border text-left text-xs uppercase tracking-wider text-mecca-muted">
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Program</th>
                <th className="px-5 py-3 font-medium">Module</th>
                <th className="px-5 py-3 font-medium">Payment</th>
                <th className="px-5 py-3 font-medium">Next unlock</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-mecca-border">
              {clients.map((client) => {
                const name = nameOf(client.lead_id);
                const total = client.program_enrolled
                  ? PROGRAM_MODULES[client.program_enrolled]
                  : 0;
                const pay = PAYMENT_STATUS[client.payment_status];
                return (
                  <tr
                    key={client.id}
                    className="group transition hover:bg-mecca-cardhover"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/clients/${client.id}`}
                        className="flex items-center gap-3"
                      >
                        <Avatar name={name} size={32} />
                        <span className="font-medium text-mecca-mist">
                          {name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-mecca-mist">
                      {client.program_enrolled
                        ? PROGRAM_LABELS[client.program_enrolled]
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-mecca-muted">
                      {client.current_module}/{total || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${pay.className}`}
                      >
                        {pay.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-mecca-muted">
                      {formatDate(client.next_unlock_date)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/clients/${client.id}`}
                        className="inline-flex text-mecca-muted transition group-hover:text-mecca-gold"
                      >
                        <IconChevronRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
