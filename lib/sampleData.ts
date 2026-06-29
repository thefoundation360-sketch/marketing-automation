// ============================================================================
// Sample / demo dataset.
//
// Used as a fallback whenever Supabase + Stripe env vars are not configured,
// so the dashboard renders meaningful content in development and previews.
// Dates are computed relative to "now" so the Today view always has entries.
// ============================================================================
import type {
  Lead,
  Client,
  Sequence,
  Booking,
  Message,
} from "@/lib/types/database";

const now = new Date();

function at(daysFromNow: number, hour = 10, min = 0): string {
  const d = new Date(now);
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
}

function dateOnly(daysFromNow: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

export const sampleLeads: Lead[] = [
  {
    id: "l1", name: "Maya Carter", email: "maya.carter@gmail.com", phone: "+1 415 555 0182",
    instagram_handle: "@mayamakesbeats", interest_tag: "beat_pack", pipeline_stage: "new_lead",
    notes: "Found us via the free beat pack opt-in. Producing lo-fi, wants placements.",
    stage_changed_at: at(-1, 9), last_contact_at: at(-1, 9), created_at: at(-1, 9), updated_at: at(-1, 9),
  },
  {
    id: "l2", name: "Devon Hayes", email: "devon.hayes@outlook.com", phone: "+1 312 555 0140",
    instagram_handle: "@devhayesmusic", interest_tag: "studio", pipeline_stage: "new_lead",
    notes: "DM'd asking about studio time in Atlanta.",
    stage_changed_at: at(0, 8), last_contact_at: at(0, 8), created_at: at(0, 8), updated_at: at(0, 8),
  },
  {
    id: "l3", name: "Priya Nair", email: "priya.nair@gmail.com", phone: "+1 646 555 0117",
    instagram_handle: "@priyaproducer", interest_tag: "roadmap", pipeline_stage: "contacted",
    notes: "Replied to welcome email. Interested in the sync licensing roadmap.",
    stage_changed_at: at(-3, 14), last_contact_at: at(-1, 16), created_at: at(-5, 11), updated_at: at(-1, 16),
  },
  {
    id: "l4", name: "Marcus Webb", email: "marcus.webb@gmail.com", phone: "+1 213 555 0193",
    instagram_handle: "@webbsounds", interest_tag: "beat_pack", pipeline_stage: "contacted",
    notes: "Downloaded beat pack, opened 3 emails.",
    stage_changed_at: at(-4, 10), last_contact_at: at(-2, 12), created_at: at(-7, 9), updated_at: at(-2, 12),
  },
  {
    id: "l5", name: "Sofia Reyes", email: "sofia.reyes@gmail.com", phone: "+1 305 555 0166",
    instagram_handle: "@sofiareyesmusic", interest_tag: "studio", pipeline_stage: "qualified",
    notes: "Has a budget, looking for a studio + mixing package. Good fit.",
    stage_changed_at: at(-2, 11), last_contact_at: at(-1, 10), created_at: at(-9, 13), updated_at: at(-1, 10),
  },
  {
    id: "l6", name: "Liam O'Brien", email: "liam.obrien@gmail.com", phone: "+1 718 555 0124",
    instagram_handle: "@liamonthekeys", interest_tag: "roadmap", pipeline_stage: "call_booked",
    notes: "Discovery call booked for today. Wants to break into TV/film sync.",
    stage_changed_at: at(-1, 15), last_contact_at: at(-1, 15), created_at: at(-11, 10), updated_at: at(-1, 15),
  },
  {
    id: "l7", name: "Aisha Bello", email: "aisha.bello@gmail.com", phone: "+1 469 555 0150",
    instagram_handle: "@aishabsound", interest_tag: "roadmap", pipeline_stage: "call_booked",
    notes: "Rescheduled once. Call set for later this week.",
    stage_changed_at: at(-2, 9), last_contact_at: at(-2, 9), created_at: at(-13, 14), updated_at: at(-2, 9),
  },
  {
    id: "l8", name: "Tyler Brooks", email: "tyler.brooks@gmail.com", phone: "+1 615 555 0178",
    instagram_handle: "@tylerbrooksbeats", interest_tag: "beat_pack", pipeline_stage: "call_complete",
    notes: "Great call. Sending proposal for Chapter 1.",
    stage_changed_at: at(-1, 13), last_contact_at: at(-1, 13), created_at: at(-15, 11), updated_at: at(-1, 13),
  },
  {
    id: "l9", name: "Nina Petrova", email: "nina.petrova@gmail.com", phone: "+1 503 555 0139",
    instagram_handle: "@ninapsounds", interest_tag: "roadmap", pipeline_stage: "proposal_sent",
    notes: "Proposal sent for the full Bundle. Following up in 2 days.",
    stage_changed_at: at(-2, 16), last_contact_at: at(-1, 9), created_at: at(-18, 10), updated_at: at(-1, 9),
  },
  {
    id: "l10", name: "Jordan Lee", email: "jordan.lee@gmail.com", phone: "+1 206 555 0111",
    instagram_handle: "@jordanleemusic", interest_tag: "roadmap", pipeline_stage: "client_won",
    notes: "Closed on Chapter 1! Onboarding call this week.",
    stage_changed_at: at(-1, 10), last_contact_at: at(-1, 10), created_at: at(-20, 12), updated_at: at(-1, 10),
  },
  {
    id: "l11", name: "Carmen Diaz", email: "carmen.diaz@gmail.com", phone: "+1 786 555 0102",
    instagram_handle: "@carmendiazmusic", interest_tag: "roadmap", pipeline_stage: "active",
    notes: "Full Bundle. On track, unlocking module 5 today.",
    stage_changed_at: at(-12, 10), last_contact_at: at(-3, 11), created_at: at(-30, 9), updated_at: at(-3, 11),
  },
  {
    id: "l12", name: "Andre Silva", email: "andre.silva@gmail.com", phone: "+1 408 555 0188",
    instagram_handle: "@andresilvabeats", interest_tag: "roadmap", pipeline_stage: "active",
    notes: "Chapter 2. Slightly behind, needs a nudge on module 2.",
    stage_changed_at: at(-9, 14), last_contact_at: at(-6, 10), created_at: at(-26, 15), updated_at: at(-6, 10),
  },
  {
    id: "l13", name: "Grace Kim", email: "grace.kim@gmail.com", phone: "+1 917 555 0173",
    instagram_handle: "@gracekimmusic", interest_tag: "studio", pipeline_stage: "complete",
    notes: "Finished Chapter 1. Candidate for an upsell to the Bundle.",
    stage_changed_at: at(-5, 12), last_contact_at: at(-4, 13), created_at: at(-60, 10), updated_at: at(-4, 13),
  },
  {
    id: "l14", name: "Noah Bennett", email: "noah.bennett@gmail.com", phone: "+1 720 555 0155",
    instagram_handle: "@noahbennettmusic", interest_tag: "roadmap", pipeline_stage: "upsell",
    notes: "Completed the Bundle, now exploring 1:1 mentorship upsell.",
    stage_changed_at: at(-2, 11), last_contact_at: at(-1, 14), created_at: at(-90, 9), updated_at: at(-1, 14),
  },
];

export const sampleClients: Client[] = [
  {
    id: "c1", lead_id: "l10", program_enrolled: "chapter_1", payment_status: "paid",
    start_date: dateOnly(-1), current_module: 1, modules_unlocked: 1,
    next_unlock_date: dateOnly(6), created_at: at(-1, 10),
  },
  {
    id: "c2", lead_id: "l11", program_enrolled: "bundle", payment_status: "paid",
    start_date: dateOnly(-30), current_module: 5, modules_unlocked: 5,
    next_unlock_date: dateOnly(0), created_at: at(-30, 9),
  },
  {
    id: "c3", lead_id: "l12", program_enrolled: "chapter_2", payment_status: "partial",
    start_date: dateOnly(-26), current_module: 2, modules_unlocked: 2,
    next_unlock_date: dateOnly(2), created_at: at(-26, 15),
  },
  {
    id: "c4", lead_id: "l13", program_enrolled: "chapter_1", payment_status: "paid",
    start_date: dateOnly(-60), current_module: 4, modules_unlocked: 4,
    next_unlock_date: null, created_at: at(-60, 10),
  },
  {
    id: "c5", lead_id: "l14", program_enrolled: "bundle", payment_status: "paid",
    start_date: dateOnly(-90), current_module: 12, modules_unlocked: 12,
    next_unlock_date: dateOnly(4), created_at: at(-90, 9),
  },
];

export const sampleSequences: Sequence[] = [
  { id: "s1", lead_id: "l3", sequence_type: "welcome", day_number: 2, status: "pending", scheduled_at: at(0, 11), sent_at: null },
  { id: "s2", lead_id: "l4", sequence_type: "beat_pack_nurture", day_number: 1, status: "pending", scheduled_at: at(0, 13), sent_at: null },
  { id: "s3", lead_id: "l9", sequence_type: "proposal_followup", day_number: 1, status: "pending", scheduled_at: at(0, 16), sent_at: null },
  { id: "s4", lead_id: "l1", sequence_type: "welcome", day_number: 0, status: "sent", scheduled_at: at(-1, 9), sent_at: at(-1, 9) },
  { id: "s5", lead_id: "l5", sequence_type: "studio_nurture", day_number: 3, status: "pending", scheduled_at: at(1, 10), sent_at: null },
  { id: "s6", lead_id: "l2", sequence_type: "welcome", day_number: 0, status: "failed", scheduled_at: at(0, 8), sent_at: null },
  { id: "s7", lead_id: "l11", sequence_type: "roadmap_nurture", day_number: 12, status: "sent", scheduled_at: at(-3, 11), sent_at: at(-3, 11) },
];

export const sampleBookings: Booking[] = [
  { id: "b1", client_id: "c2", session_type: "Coaching Call", session_date: at(0, 14), format: "remote", deposit_paid: true, confirmed: true, reminder_sent_48hr: true, reminder_sent_2hr: false, completed: false, upsell_sent: false },
  { id: "b2", client_id: "c1", session_type: "Onboarding Call", session_date: at(2, 11), format: "remote", deposit_paid: true, confirmed: true, reminder_sent_48hr: false, reminder_sent_2hr: false, completed: false, upsell_sent: false },
  { id: "b3", client_id: "c3", session_type: "Strategy Session", session_date: at(5, 15), format: "in_person", deposit_paid: false, confirmed: false, reminder_sent_48hr: false, reminder_sent_2hr: false, completed: false, upsell_sent: false },
  { id: "b4", client_id: "c5", session_type: "Upsell Call", session_date: at(-1, 13), format: "remote", deposit_paid: true, confirmed: true, reminder_sent_48hr: true, reminder_sent_2hr: true, completed: true, upsell_sent: true },
  { id: "b5", client_id: "c2", session_type: "Module Review", session_date: at(-7, 14), format: "remote", deposit_paid: true, confirmed: true, reminder_sent_48hr: true, reminder_sent_2hr: true, completed: true, upsell_sent: false },
];

export const sampleMessages: Message[] = [
  { id: "m1", recipient_id: "l3", type: "email", subject: "Welcome to Sync Master 🎬", body: "Hey Priya — here's how the sync licensing roadmap works...", status: "delivered", sent_at: at(-5, 11) },
  { id: "m2", recipient_id: "l3", type: "email", subject: "Your roadmap walkthrough", body: "Following up with the roadmap breakdown we talked about.", status: "delivered", sent_at: at(-3, 14) },
  { id: "m3", recipient_id: "l3", type: "sms", subject: null, body: "Hi Priya! Did you get a chance to look at the roadmap? — Sync Master", status: "delivered", sent_at: at(-1, 16) },
  { id: "m4", recipient_id: "l9", type: "email", subject: "Your Sync Master proposal", body: "Attached is the proposal for the full Bundle. Let me know your thoughts!", status: "delivered", sent_at: at(-2, 16) },
  { id: "m5", recipient_id: "l9", type: "sms", subject: null, body: "Just checking you received the proposal 🙌", status: "delivered", sent_at: at(-1, 9) },
  { id: "m6", recipient_id: "l1", type: "email", subject: "Your free beat pack is here", body: "Thanks for grabbing the beat pack! Here's your download link.", status: "delivered", sent_at: at(-1, 9) },
  { id: "m7", recipient_id: "l11", type: "email", subject: "Module 4 unlocked 🔓", body: "Carmen, module 4 is now unlocked. Dive in!", status: "delivered", sent_at: at(-7, 10) },
  { id: "m8", recipient_id: "l11", type: "sms", subject: null, body: "Module 5 unlocks today — let's gooo 🚀", status: "sent", sent_at: at(0, 9) },
  { id: "m9", recipient_id: "l14", type: "email", subject: "Ready for the next level?", body: "Noah, you crushed the Bundle. Let's talk 1:1 mentorship.", status: "delivered", sent_at: at(-2, 11) },
  { id: "m10", recipient_id: "l10", type: "email", subject: "Welcome aboard! 🎉", body: "Jordan, you're officially in Chapter 1. Onboarding call link inside.", status: "delivered", sent_at: at(-1, 10) },
  { id: "m11", recipient_id: "l5", type: "email", subject: "Studio + mixing package", body: "Sofia, here are the studio package options we discussed.", status: "delivered", sent_at: at(-1, 10) },
  { id: "m12", recipient_id: "l4", type: "email", subject: "Did the beats land?", body: "Marcus, hope you're enjoying the pack. Want more like these?", status: "delivered", sent_at: at(-2, 12) },
];

// ---------------------------------------------------------------------------
// Demo Stripe revenue figures (in cents).
// ---------------------------------------------------------------------------
export const sampleRevenue = {
  thisMonth: 1284900,
  lastMonth: 972000,
  allTime: 8643500,
};
