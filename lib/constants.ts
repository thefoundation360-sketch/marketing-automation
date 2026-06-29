import type {
  PipelineStage,
  InterestTag,
  ProgramEnrolled,
  PaymentStatus,
  SequenceStatus,
} from "@/lib/types/database";

// ----------------------------------------------------------------------------
// Pipeline stages — the 10 columns of the board, in order.
// ----------------------------------------------------------------------------
export const PIPELINE_STAGES: { key: PipelineStage; label: string }[] = [
  { key: "new_lead", label: "New Lead" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "call_booked", label: "Call Booked" },
  { key: "call_complete", label: "Call Complete" },
  { key: "proposal_sent", label: "Proposal Sent" },
  { key: "client_won", label: "Client Won" },
  { key: "active", label: "Active" },
  { key: "complete", label: "Complete" },
  { key: "upsell", label: "Upsell" },
];

export const STAGE_LABELS: Record<PipelineStage, string> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.key, s.label])
) as Record<PipelineStage, string>;

// ----------------------------------------------------------------------------
// Interest tags
// ----------------------------------------------------------------------------
export const INTEREST_TAGS: Record<
  InterestTag,
  { label: string; className: string }
> = {
  beat_pack: {
    label: "Beat Pack",
    className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  },
  studio: {
    label: "Studio",
    className: "bg-sky-500/10 text-sky-300 border-sky-500/30",
  },
  roadmap: {
    label: "Roadmap",
    className: "bg-mecca-gold/10 text-mecca-gold border-mecca-gold/30",
  },
};

// ----------------------------------------------------------------------------
// Programs
// ----------------------------------------------------------------------------
export const PROGRAM_LABELS: Record<ProgramEnrolled, string> = {
  chapter_1: "Chapter 1",
  chapter_2: "Chapter 2",
  chapter_3: "Chapter 3",
  chapter_4: "Chapter 4",
  bundle: "Full Bundle",
};

// Total modules per program (used by the unlock schedule).
export const PROGRAM_MODULES: Record<ProgramEnrolled, number> = {
  chapter_1: 4,
  chapter_2: 4,
  chapter_3: 4,
  chapter_4: 4,
  bundle: 16,
};

// ----------------------------------------------------------------------------
// Payment status badges
// ----------------------------------------------------------------------------
export const PAYMENT_STATUS: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  unpaid: { label: "Unpaid", className: "bg-red-500/10 text-red-300 border-red-500/30" },
  deposit: { label: "Deposit", className: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  partial: { label: "Partial", className: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  paid: { label: "Paid", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  refunded: { label: "Refunded", className: "bg-mecca-muted/10 text-mecca-muted border-mecca-muted/30" },
};

// ----------------------------------------------------------------------------
// Sequence status badges
// ----------------------------------------------------------------------------
export const SEQUENCE_STATUS: Record<
  SequenceStatus,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  sent: { label: "Sent", className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  failed: { label: "Failed", className: "bg-red-500/10 text-red-300 border-red-500/30" },
};

// ----------------------------------------------------------------------------
// Automation sequences that can be manually triggered from a lead profile.
// ----------------------------------------------------------------------------
export const SEQUENCE_TYPES: { key: string; label: string; description: string }[] =
  [
    { key: "welcome", label: "Welcome Series", description: "5-day intro nurture for new leads" },
    { key: "beat_pack_nurture", label: "Beat Pack Nurture", description: "Drip toward the beat pack offer" },
    { key: "studio_nurture", label: "Studio Nurture", description: "Drip toward a studio session booking" },
    { key: "roadmap_nurture", label: "Roadmap Nurture", description: "Drip toward the coaching roadmap" },
    { key: "call_reminder", label: "Call Reminder", description: "48hr + 2hr reminders before a booked call" },
    { key: "proposal_followup", label: "Proposal Follow-up", description: "Follow up after a proposal is sent" },
    { key: "reengage", label: "Re-engagement", description: "Win back cold or stalled leads" },
  ];
