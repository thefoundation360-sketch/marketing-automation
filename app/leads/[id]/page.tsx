import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getLead,
  getMessagesForRecipient,
  getSequencesForLead,
  getClientByLeadId,
} from "@/lib/data";
import {
  STAGE_LABELS,
  INTEREST_TAGS,
  SEQUENCE_STATUS,
  PROGRAM_LABELS,
} from "@/lib/constants";
import { formatDate, formatDateTime, daysSince } from "@/lib/format";
import { Card, CardHeader, Avatar, EmptyState, LinkButton } from "@/components/ui";
import { IconMail, IconMessage, IconChevronRight } from "@/components/icons";
import TriggerSequencePanel from "@/components/TriggerSequencePanel";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const lead = await getLead(params.id);
  if (!lead) notFound();

  const [messages, sequences, client] = await Promise.all([
    getMessagesForRecipient(lead.id),
    getSequencesForLead(lead.id),
    getClientByLeadId(lead.id),
  ]);

  const tag = lead.interest_tag ? INTEREST_TAGS[lead.interest_tag] : null;

  return (
    <div>
      <div className="mb-5">
        <Link
          href="/leads"
          className="text-sm text-mecca-muted transition hover:text-mecca-gold"
        >
          ← Back to leads
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={lead.name} size={56} />
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight text-mecca-mist">
            {lead.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-mecca-muted">
            {tag && (
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${tag.className}`}
              >
                {tag.label}
              </span>
            )}
            <span className="inline-flex rounded-full border border-mecca-gold/30 bg-mecca-gold/10 px-2.5 py-0.5 text-xs font-medium text-mecca-gold">
              {STAGE_LABELS[lead.pipeline_stage]}
            </span>
            <span>· {daysSince(lead.stage_changed_at)} days in stage</span>
          </div>
        </div>
        {client && (
          <LinkButton href={`/clients/${client.id}`} variant="ghost">
            View client <IconChevronRight className="h-4 w-4" />
          </LinkButton>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-5 lg:col-span-2">
          {/* Profile */}
          <Card>
            <CardHeader title="Profile" />
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
              <Field label="Email" value={lead.email} />
              <Field label="Phone" value={lead.phone} />
              <Field label="Instagram" value={lead.instagram_handle} />
              <Field
                label="Interest"
                value={tag?.label ?? "—"}
              />
              <Field label="Created" value={formatDate(lead.created_at)} />
              <Field
                label="Last contact"
                value={formatDate(lead.last_contact_at)}
              />
            </dl>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader title="Notes" />
            <div className="p-5">
              {lead.notes ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-mecca-mist">
                  {lead.notes}
                </p>
              ) : (
                <p className="text-sm text-mecca-muted">No notes yet.</p>
              )}
            </div>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader
              title={`Messages · ${messages.length}`}
            />
            {messages.length === 0 ? (
              <EmptyState>No messages sent yet.</EmptyState>
            ) : (
              <ul className="divide-y divide-mecca-border">
                {messages.map((m) => (
                  <li key={m.id} className="flex gap-3 px-5 py-3.5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mecca-gold/10 text-mecca-gold">
                      {m.type === "sms" ? (
                        <IconMessage className="h-4 w-4" />
                      ) : (
                        <IconMail className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-mecca-mist">
                          {m.subject ?? (m.type === "sms" ? "SMS" : "Email")}
                        </span>
                        <span className="shrink-0 text-xs text-mecca-muted">
                          {formatDateTime(m.sent_at)}
                        </span>
                      </div>
                      {m.body && (
                        <p className="mt-0.5 text-sm text-mecca-muted">
                          {m.body}
                        </p>
                      )}
                      <span className="mt-1 inline-flex text-[11px] uppercase tracking-wide text-mecca-muted">
                        {m.type} · {m.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Trigger automation */}
          <Card>
            <CardHeader title="Trigger Automation" />
            <div className="p-4">
              <TriggerSequencePanel leadId={lead.id} />
            </div>
          </Card>

          {/* Sequence history */}
          <Card>
            <CardHeader title={`Sequences · ${sequences.length}`} />
            {sequences.length === 0 ? (
              <EmptyState>No sequences enrolled.</EmptyState>
            ) : (
              <ul className="divide-y divide-mecca-border">
                {sequences.map((s) => {
                  const st = SEQUENCE_STATUS[s.status];
                  return (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-2 px-5 py-3"
                    >
                      <div>
                        <div className="text-sm font-medium text-mecca-mist">
                          {s.sequence_type}
                        </div>
                        <div className="text-xs text-mecca-muted">
                          Day {s.day_number} ·{" "}
                          {formatDate(s.sent_at ?? s.scheduled_at)}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${st.className}`}
                      >
                        {st.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {client && (
            <Card>
              <CardHeader title="Enrolled Client" />
              <div className="p-5 text-sm">
                <Field
                  label="Program"
                  value={
                    client.program_enrolled
                      ? PROGRAM_LABELS[client.program_enrolled]
                      : "—"
                  }
                />
                <div className="mt-4">
                  <LinkButton href={`/clients/${client.id}`} variant="ghost">
                    Open client profile
                    <IconChevronRight className="h-4 w-4" />
                  </LinkButton>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-mecca-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-mecca-mist">{value || "—"}</dd>
    </div>
  );
}
