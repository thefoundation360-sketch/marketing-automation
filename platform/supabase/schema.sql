-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  bio text,
  role text not null default 'creator' check (role in ('creator', 'consumer', 'admin')),
  stripe_account_id text,
  stripe_customer_id text,
  payout_enabled boolean not null default false,
  payout_pending_cents integer not null default 0,
  revenue_share_percent integer not null default 80,
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Content
create table public.content (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  type text not null check (type in ('audio', 'video', 'image', 'template', 'ebook', 'preset')),
  status text not null default 'draft' check (status in ('draft', 'processing', 'published', 'scheduled', 'archived')),
  license_type text not null default 'standard' check (license_type in ('free', 'standard', 'extended', 'exclusive')),
  price_cents integer not null default 0,
  preview_url text,
  file_url text,
  thumbnail_url text,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  download_count integer not null default 0,
  revenue_total_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  scheduled_at timestamptz
);

create index content_creator_id_idx on public.content(creator_id);
create index content_status_idx on public.content(status);
create index content_type_idx on public.content(type);
create index content_tags_idx on public.content using gin(tags);

-- Scheduled posts
create table public.scheduled_posts (
  id uuid primary key default uuid_generate_v4(),
  content_id uuid not null references public.content(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  platforms text[] not null,
  caption text,
  hashtags text[] not null default '{}',
  scheduled_at timestamptz not null,
  posted_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'posting', 'posted', 'failed', 'cancelled')),
  error_message text,
  platform_post_ids jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index scheduled_posts_creator_idx on public.scheduled_posts(creator_id);
create index scheduled_posts_status_idx on public.scheduled_posts(status);
create index scheduled_posts_scheduled_at_idx on public.scheduled_posts(scheduled_at);

-- Transactions
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  content_id uuid references public.content(id),
  buyer_id uuid references public.profiles(id),
  creator_id uuid not null references public.profiles(id),
  stripe_payment_intent_id text,
  type text not null check (type in ('download_purchase', 'subscription', 'payout', 'refund')),
  amount_cents integer not null,
  creator_earnings_cents integer not null,
  platform_fee_cents integer not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded')),
  created_at timestamptz not null default now()
);

create index transactions_creator_idx on public.transactions(creator_id);
create index transactions_content_idx on public.transactions(content_id);

-- Social connections (for platform posting)
create table public.social_connections (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'linkedin')),
  account_id text not null,
  account_name text,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique(creator_id, platform)
);

-- Downloads (tracks who downloaded what)
create table public.downloads (
  id uuid primary key default uuid_generate_v4(),
  content_id uuid not null references public.content(id),
  downloader_id uuid references public.profiles(id),
  transaction_id uuid references public.transactions(id),
  created_at timestamptz not null default now()
);

-- Helper RPC functions for atomic increments
create or replace function increment(row_id uuid, col text)
returns integer language plpgsql as $$
declare result integer;
begin
  execute format('select %I from public.content where id = $1', col)
  into result using row_id;
  return coalesce(result, 0) + 1;
end;
$$;

create or replace function increment_by(row_id uuid, col text, amount integer)
returns integer language plpgsql as $$
declare result integer;
begin
  execute format('select %I from public.content where id = $1', col)
  into result using row_id;
  return coalesce(result, 0) + amount;
end;
$$;

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.content enable row level security;
alter table public.scheduled_posts enable row level security;
alter table public.transactions enable row level security;
alter table public.social_connections enable row level security;
alter table public.downloads enable row level security;

-- Profiles: users see/edit their own
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Content: creators manage their own; anyone can view published
create policy "Creators manage own content" on public.content
  for all using (auth.uid() = creator_id);
create policy "Anyone views published content" on public.content
  for select using (status = 'published');

-- Scheduled posts: creator only
create policy "Creators manage own scheduled posts" on public.scheduled_posts
  for all using (auth.uid() = creator_id);

-- Transactions: creator sees their own; buyer sees their own
create policy "Creators see own transactions" on public.transactions
  for select using (auth.uid() = creator_id or auth.uid() = buyer_id);

-- Social connections: creator only
create policy "Creators manage own social connections" on public.social_connections
  for all using (auth.uid() = creator_id);

-- Storage buckets
insert into storage.buckets (id, name, public) values
  ('content-files', 'content-files', false),
  ('thumbnails', 'thumbnails', true),
  ('avatars', 'avatars', true);

create policy "Creators upload content files" on storage.objects
  for insert with check (bucket_id = 'content-files' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Creators access own files" on storage.objects
  for select using (bucket_id = 'content-files' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Public thumbnails" on storage.objects
  for select using (bucket_id = 'thumbnails');
create policy "Public avatars" on storage.objects
  for select using (bucket_id = 'avatars');
