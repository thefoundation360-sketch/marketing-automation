import Link from "next/link";
import { getLeads } from "@/lib/data";
import { STAGE_LABELS, INTEREST_TAGS } from "@/lib/constants";
import { daysSince, formatDate } from "@/lib/format";
import { PageHeader, Card, Avatar } from "@/components/ui";
import { IconChevronRight } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await getLeads();

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={`${leads.length} leads across the pipeline`}
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-mecca-border text-left text-xs uppercase tracking-wider text-mecca-muted">
                <th className="px-5 py-3 font-medium">Lead</th>
                <th className="px-5 py-3 font-medium">Interest</th>
                <th className="px-5 py-3 font-medium">Stage</th>
                <th className="px-5 py-3 font-medium">Days in stage</th>
                <th className="px-5 py-3 font-medium">Last contact</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-mecca-border">
              {leads.map((lead) => {
                const tag = lead.interest_tag
                  ? INTEREST_TAGS[lead.interest_tag]
                  : null;
                return (
                  <tr
                    key={lead.id}
                    className="group transition hover:bg-mecca-cardhover"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="flex items-center gap-3"
                      >
                        <Avatar name={lead.name} size={32} />
                        <div>
                          <div className="font-medium text-mecca-mist">
                            {lead.name}
                          </div>
                          <div className="text-xs text-mecca-muted">
                            {lead.email ?? lead.instagram_handle ?? "—"}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      {tag ? (
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${tag.className}`}
                        >
                          {tag.label}
                        </span>
                      ) : (
                        <span className="text-mecca-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-full border border-mecca-border bg-mecca-panel px-2.5 py-0.5 text-xs text-mecca-mist">
                        {STAGE_LABELS[lead.pipeline_stage]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-mecca-muted">
                      {daysSince(lead.stage_changed_at)}d
                    </td>
                    <td className="px-5 py-3 text-mecca-muted">
                      {formatDate(lead.last_contact_at)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/leads/${lead.id}`}
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
