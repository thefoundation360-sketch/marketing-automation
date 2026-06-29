// ============================================================================
// Data-access layer.
//
// Every getter queries Supabase when it is configured, and transparently falls
// back to the sample dataset otherwise (or on error) so the dashboard always
// renders. Derived figures (dashboard stats, activity feed, today view) are
// computed as pure functions over the base arrays, so they behave identically
// for live and sample data.
// ============================================================================
import { createClient } from "@/lib/supabase/server";
import type {
  Lead,
  Client,
  Sequence,
  Booking,
  Message,
} from "@/lib/types/database";
import {
  sampleLeads,
  sampleClients,
  sampleSequences,
  sampleBookings,
  sampleMessages,
} from "@/lib/sampleData";
import { isToday } from "@/lib/format";

export function supabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// --- base tables -----------------------------------------------------------

export async function getLeads(): Promise<Lead[]> {
  if (!supabaseConfigured()) return sampleLeads;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) return sampleLeads;
    return data as Lead[];
  } catch {
    return sampleLeads;
  }
}

export async function getLead(id: string): Promise<Lead | null> {
  if (!supabaseConfigured()) {
    return sampleLeads.find((l) => l.id === id) ?? null;
  }
  try {
    const supabase = createClient();
    const { data } = await supabase.from("leads").select("*").eq("id", id).single();
    return (data as Lead) ?? null;
  } catch {
    return sampleLeads.find((l) => l.id === id) ?? null;
  }
}

export async function getClients(): Promise<Client[]> {
  if (!supabaseConfigured()) return sampleClients;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) return sampleClients;
    return data as Client[];
  } catch {
    return sampleClients;
  }
}

export async function getClient(id: string): Promise<Client | null> {
  if (!supabaseConfigured()) {
    return sampleClients.find((c) => c.id === id) ?? null;
  }
  try {
    const supabase = createClient();
    const { data } = await supabase.from("clients").select("*").eq("id", id).single();
    return (data as Client) ?? null;
  } catch {
    return sampleClients.find((c) => c.id === id) ?? null;
  }
}

export async function getSequences(): Promise<Sequence[]> {
  if (!supabaseConfigured()) return sampleSequences;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sequences")
      .select("*")
      .order("scheduled_at", { ascending: true });
    if (error || !data) return sampleSequences;
    return data as Sequence[];
  } catch {
    return sampleSequences;
  }
}

export async function getBookings(): Promise<Booking[]> {
  if (!supabaseConfigured()) return sampleBookings;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("session_date", { ascending: true });
    if (error || !data) return sampleBookings;
    return data as Booking[];
  } catch {
    return sampleBookings;
  }
}

export async function getMessages(): Promise<Message[]> {
  if (!supabaseConfigured()) return sampleMessages;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("sent_at", { ascending: false });
    if (error || !data) return sampleMessages;
    return data as Message[];
  } catch {
    return sampleMessages;
  }
}

// --- scoped helpers --------------------------------------------------------

export async function getMessagesForRecipient(id: string): Promise<Message[]> {
  const all = await getMessages();
  return all
    .filter((m) => m.recipient_id === id)
    .sort((a, b) => (b.sent_at ?? "").localeCompare(a.sent_at ?? ""));
}

export async function getSequencesForLead(leadId: string): Promise<Sequence[]> {
  const all = await getSequences();
  return all.filter((s) => s.lead_id === leadId);
}

export async function getBookingsForClient(clientId: string): Promise<Booking[]> {
  const all = await getBookings();
  return all.filter((b) => b.client_id === clientId);
}

export async function getClientByLeadId(leadId: string): Promise<Client | null> {
  const all = await getClients();
  return all.find((c) => c.lead_id === leadId) ?? null;
}

// --- derived: dashboard stats ---------------------------------------------

export type DashboardStats = {
  newLeadsThisWeek: number;
  leadsInPipeline: number;
  conversionRate: number;
  activeClients: number;
};

const WON_OR_BEYOND = new Set([
  "client_won",
  "active",
  "complete",
  "upsell",
]);
const IN_PROGRAM = new Set(["client_won", "active", "upsell"]);

export async function getDashboardStats(): Promise<DashboardStats> {
  const [leads, clients] = await Promise.all([getLeads(), getClients()]);
  const weekAgo = Date.now() - 7 * 86_400_000;

  const newLeadsThisWeek = leads.filter(
    (l) => new Date(l.created_at).getTime() >= weekAgo
  ).length;

  const leadsInPipeline = leads.filter(
    (l) => !["complete"].includes(l.pipeline_stage)
  ).length;

  const wonCount = leads.filter((l) => WON_OR_BEYOND.has(l.pipeline_stage)).length;
  const conversionRate = leads.length ? wonCount / leads.length : 0;

  const activeClients = clients.filter((c) => {
    const lead = leads.find((l) => l.id === c.lead_id);
    return lead ? IN_PROGRAM.has(lead.pipeline_stage) : c.next_unlock_date !== null;
  }).length;

  return { newLeadsThisWeek, leadsInPipeline, conversionRate, activeClients };
}

/** Active clients enriched with their lead name, for the clients widget. */
export type ActiveClientRow = {
  client: Client;
  name: string;
};

export async function getActiveClientRows(): Promise<ActiveClientRow[]> {
  const [leads, clients] = await Promise.all([getLeads(), getClients()]);
  return clients
    .filter((c) => {
      const lead = leads.find((l) => l.id === c.lead_id);
      return lead ? IN_PROGRAM.has(lead.pipeline_stage) : true;
    })
    .map((client) => ({
      client,
      name: leads.find((l) => l.id === client.lead_id)?.name ?? "Unknown",
    }));
}

// --- derived: today view ---------------------------------------------------

function isTodayDateString(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(today.getDate()).padStart(2, "0")}`;
  return dateStr.slice(0, 10) === todayStr;
}

export type TodayData = {
  calls: { booking: Booking; name: string }[];
  automations: { sequence: Sequence; name: string }[];
  unlocks: { client: Client; name: string }[];
};

export async function getTodayData(): Promise<TodayData> {
  const [leads, clients, bookings, sequences] = await Promise.all([
    getLeads(),
    getClients(),
    getBookings(),
    getSequences(),
  ]);

  const clientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    const lead = client ? leads.find((l) => l.id === client.lead_id) : null;
    return lead?.name ?? "Unknown";
  };

  const calls = bookings
    .filter((b) => isToday(b.session_date))
    .map((booking) => ({ booking, name: clientName(booking.client_id) }));

  const automations = sequences
    .filter((s) => isToday(s.scheduled_at) && s.status === "pending")
    .map((sequence) => ({
      sequence,
      name: leads.find((l) => l.id === sequence.lead_id)?.name ?? "Unknown",
    }));

  const unlocks = clients
    .filter((c) => isTodayDateString(c.next_unlock_date))
    .map((client) => ({
      client,
      name: leads.find((l) => l.id === client.lead_id)?.name ?? "Unknown",
    }));

  return { calls, automations, unlocks };
}

// --- derived: recent activity feed ----------------------------------------

export type ActivityItem = {
  id: string;
  kind: "message" | "booking" | "sequence" | "lead";
  title: string;
  detail: string;
  at: string;
  href?: string;
};

export async function getActivity(limit = 10): Promise<ActivityItem[]> {
  const [leads, clients, messages, bookings, sequences] = await Promise.all([
    getLeads(),
    getClients(),
    getMessages(),
    getBookings(),
    getSequences(),
  ]);

  const leadName = (id: string) => leads.find((l) => l.id === id)?.name ?? "Unknown";
  const clientLeadId = (clientId: string) =>
    clients.find((c) => c.id === clientId)?.lead_id ?? "";
  const clientName = (clientId: string) => leadName(clientLeadId(clientId));

  const items: ActivityItem[] = [];

  for (const m of messages) {
    if (!m.sent_at) continue;
    const name = leadName(m.recipient_id);
    items.push({
      id: `msg-${m.id}`,
      kind: "message",
      title: `${m.type === "sms" ? "SMS" : "Email"} ${m.status} to ${name}`,
      detail: m.subject ?? (m.body ?? "").slice(0, 60),
      at: m.sent_at,
      href: `/leads/${m.recipient_id}`,
    });
  }

  for (const b of bookings) {
    if (!b.session_date) continue;
    items.push({
      id: `bk-${b.id}`,
      kind: "booking",
      title: `${b.completed ? "Completed" : "Booked"} ${b.session_type ?? "session"} with ${clientName(b.client_id)}`,
      detail: `${b.format === "in_person" ? "In person" : "Remote"}`,
      at: b.session_date,
      href: clientLeadId(b.client_id) ? `/clients/${b.client_id}` : undefined,
    });
  }

  for (const s of sequences) {
    const ts = s.sent_at ?? s.scheduled_at;
    if (!ts) continue;
    items.push({
      id: `seq-${s.id}`,
      kind: "sequence",
      title: `Automation "${s.sequence_type}" ${s.status} for ${leadName(s.lead_id)}`,
      detail: `Day ${s.day_number}`,
      at: ts,
      href: `/leads/${s.lead_id}`,
    });
  }

  for (const l of leads) {
    items.push({
      id: `lead-${l.id}`,
      kind: "lead",
      title: `${l.name} moved to pipeline`,
      detail: l.pipeline_stage,
      at: l.stage_changed_at,
      href: `/leads/${l.id}`,
    });
  }

  return items
    .filter((i) => new Date(i.at).getTime() <= Date.now())
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}
