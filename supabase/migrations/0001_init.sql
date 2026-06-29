-- ============================================================================
-- Sync Master CRM — Initial schema
-- Foundation Mecca / Sync Master music coaching business
--
-- Tables: leads, clients, sequences, bookings, messages
-- Apply with the Supabase CLI:  supabase db push
-- or paste into the Supabase SQL editor.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enumerated types
-- ----------------------------------------------------------------------------
do $$ begin
  create type interest_tag as enum ('beat_pack', 'studio', 'roadmap');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pipeline_stage as enum (
    'new_lead',
    'contacted',
    'qualified',
    'call_booked',
    'call_complete',
    'proposal_sent',
    'client_won',
    'active',
    'complete',
    'upsell'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type program_enrolled as enum (
    'chapter_1', 'chapter_2', 'chapter_3', 'chapter_4', 'bundle'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum (
    'unpaid', 'deposit', 'partial', 'paid', 'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type sequence_status as enum ('pending', 'sent', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type session_format as enum ('remote', 'in_person');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_channel as enum ('email', 'sms');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_status as enum ('queued', 'sent', 'delivered', 'failed');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- Shared trigger: keep updated_at fresh
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- leads
-- ----------------------------------------------------------------------------
create table if not exists leads (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  email            text,
  phone            text,
  instagram_handle text,
  interest_tag     interest_tag,
  pipeline_stage   pipeline_stage not null default 'new_lead',
  notes            text,
  stage_changed_at timestamptz not null default now(),
  last_contact_at  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists leads_pipeline_stage_idx on leads (pipeline_stage);
create index if not exists leads_email_idx on leads (email);
create index if not exists leads_created_at_idx on leads (created_at desc);

drop trigger if exists leads_set_updated_at on leads;
create trigger leads_set_updated_at
  before update on leads
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- clients
-- ----------------------------------------------------------------------------
create table if not exists clients (
  id               uuid primary key default gen_random_uuid(),
  lead_id          uuid references leads (id) on delete set null,
  program_enrolled program_enrolled,
  payment_status   payment_status not null default 'unpaid',
  start_date       date,
  current_module   integer not null default 0,
  modules_unlocked integer not null default 0,
  next_unlock_date date,
  created_at       timestamptz not null default now()
);

create index if not exists clients_lead_id_idx on clients (lead_id);
create index if not exists clients_payment_status_idx on clients (payment_status);

-- ----------------------------------------------------------------------------
-- sequences  (automated email/SMS drip enrollment per lead)
-- ----------------------------------------------------------------------------
create table if not exists sequences (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references leads (id) on delete cascade,
  sequence_type text not null,
  day_number    integer not null default 0,
  status        sequence_status not null default 'pending',
  scheduled_at  timestamptz,
  sent_at       timestamptz
);

create index if not exists sequences_lead_id_idx on sequences (lead_id);
create index if not exists sequences_status_idx on sequences (status);
create index if not exists sequences_scheduled_at_idx on sequences (scheduled_at);

-- ----------------------------------------------------------------------------
-- bookings  (coaching sessions tied to a client)
-- ----------------------------------------------------------------------------
create table if not exists bookings (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references clients (id) on delete cascade,
  session_type      text,
  session_date      timestamptz,
  format            session_format not null default 'remote',
  deposit_paid      boolean not null default false,
  confirmed         boolean not null default false,
  reminder_sent_48hr boolean not null default false,
  reminder_sent_2hr  boolean not null default false,
  completed         boolean not null default false,
  upsell_sent       boolean not null default false
);

create index if not exists bookings_client_id_idx on bookings (client_id);
create index if not exists bookings_session_date_idx on bookings (session_date);

-- ----------------------------------------------------------------------------
-- messages  (log of every email/SMS sent to a lead or client)
-- ----------------------------------------------------------------------------
create table if not exists messages (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null,
  type         message_channel not null,
  subject      text,
  body         text,
  status       message_status not null default 'queued',
  sent_at      timestamptz
);

create index if not exists messages_recipient_id_idx on messages (recipient_id);
create index if not exists messages_status_idx on messages (status);

-- ----------------------------------------------------------------------------
-- Row Level Security
-- Enabled on every table. Service-role server code bypasses RLS; add
-- granular policies once application auth roles are defined.
-- ----------------------------------------------------------------------------
alter table leads     enable row level security;
alter table clients   enable row level security;
alter table sequences enable row level security;
alter table bookings  enable row level security;
alter table messages  enable row level security;
