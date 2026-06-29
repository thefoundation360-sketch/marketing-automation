// ============================================================================
// TypeScript types mirroring the Supabase schema (supabase/migrations/0001_init.sql)
// Keep in sync with the SQL migration. These can later be replaced by the
// generated types from `supabase gen types typescript`.
// ============================================================================

export type InterestTag = "beat_pack" | "studio" | "roadmap";

export type PipelineStage =
  | "new"
  | "contacted"
  | "qualified"
  | "nurturing"
  | "booked"
  | "won"
  | "lost";

export type ProgramEnrolled =
  | "chapter_1"
  | "chapter_2"
  | "chapter_3"
  | "chapter_4"
  | "bundle";

export type PaymentStatus =
  | "unpaid"
  | "deposit"
  | "partial"
  | "paid"
  | "refunded";

export type SequenceStatus = "pending" | "sent" | "failed";

export type SessionFormat = "remote" | "in_person";

export type MessageChannel = "email" | "sms";

export type MessageStatus = "queued" | "sent" | "delivered" | "failed";

export interface Lead {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagram_handle: string | null;
  interest_tag: InterestTag | null;
  pipeline_stage: PipelineStage;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  lead_id: string | null;
  program_enrolled: ProgramEnrolled | null;
  payment_status: PaymentStatus;
  start_date: string | null;
  current_module: number;
  modules_unlocked: number;
  next_unlock_date: string | null;
  created_at: string;
}

export interface Sequence {
  id: string;
  lead_id: string;
  sequence_type: string;
  day_number: number;
  status: SequenceStatus;
  scheduled_at: string | null;
  sent_at: string | null;
}

export interface Booking {
  id: string;
  client_id: string;
  session_type: string | null;
  session_date: string | null;
  format: SessionFormat;
  deposit_paid: boolean;
  confirmed: boolean;
  reminder_sent_48hr: boolean;
  reminder_sent_2hr: boolean;
  completed: boolean;
  upsell_sent: boolean;
}

export interface Message {
  id: string;
  recipient_id: string;
  type: MessageChannel;
  subject: string | null;
  body: string | null;
  status: MessageStatus;
  sent_at: string | null;
}
