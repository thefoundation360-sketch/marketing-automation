import Link from "next/link";
import { getSequences, getLeads } from "@/lib/data";
import { SEQUENCE_STATUS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { PageHeader, Card, StatTile, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SequencesPage() {
  const [sequences, leads] = await Promise.all([getSequences(), getLeads()]);
  const leadName = (id: string) =>
    leads.find((l) => l.id === id)?.name ?? "Unknown";

  const counts = {
    pending: sequences.filter((s) => s.status === "pending").length,
    sent: sequences.filter((s) => s.status === "sent").length,
    failed: sequences.filter((s) => s.status === "failed").length,
  };

  const sorted = [...sequences].sort((a, b) =>
    (b.scheduled_at ?? "").localeCompare(a.scheduled_at ?? "")
  );

  return (
    <div>
      <PageHeader
        title="Sequences"
        subtitle="Automated email & SMS drip enrollments"
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatTile label="Pending" value={counts.pending} accent />
        <StatTile label="Sent" value={counts.sent} />
        <StatTile label="Failed" value={counts.failed} />
      </div>

      <Card className="overflow-hidden">
        {sorted.length === 0 ? (
          <EmptyState>No sequences enrolled.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-mecca-border text-left text-xs uppercase tracking-wider text-mecca-muted">
                  <th className="px-5 py-3 font-medium">Lead</th>
                  <th className="px-5 py-3 font-medium">Sequence</th>
                  <th className="px-5 py-3 font-medium">Day</th>
                  <th className="px-5 py-3 font-medium">Scheduled</th>
                  <th className="px-5 py-3 font-medium">Sent</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mecca-border">
                {sorted.map((s) => {
                  const st = SEQUENCE_STATUS[s.status];
                  return (
                    <tr
                      key={s.id}
                      className="transition hover:bg-mecca-cardhover"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/leads/${s.lead_id}`}
                          className="font-medium text-mecca-mist hover:text-mecca-gold"
                        >
                          {leadName(s.lead_id)}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-mecca-mist">
                        {s.sequence_type}
                      </td>
                      <td className="px-5 py-3 text-mecca-muted">
                        {s.day_number}
                      </td>
                      <td className="px-5 py-3 text-mecca-muted">
                        {formatDateTime(s.scheduled_at)}
                      </td>
                      <td className="px-5 py-3 text-mecca-muted">
                        {formatDateTime(s.sent_at)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${st.className}`}
                        >
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
