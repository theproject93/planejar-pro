create extension if not exists pgcrypto;

create table if not exists public.user_finance_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('entrada', 'saida')),
  color text,
  created_at timestamptz not null default now()
);

create index if not exists user_finance_categories_user_id_idx
  on public.user_finance_categories (user_id);

create index if not exists user_finance_categories_type_idx
  on public.user_finance_categories (type);

create table if not exists public.user_finance_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_name text,
  title text not null,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'confirmado'
    check (status in ('pendente', 'confirmado', 'pago', 'parcelado', 'previsto')),
  received_at date,
  expected_at date,
  payment_method text,
  proof_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_finance_entries_user_id_idx
  on public.user_finance_entries (user_id);

create index if not exists user_finance_entries_status_idx
  on public.user_finance_entries (status);

create index if not exists user_finance_entries_received_at_idx
  on public.user_finance_entries (received_at desc);

create index if not exists user_finance_entries_expected_at_idx
  on public.user_finance_entries (expected_at desc);

create table if not exists public.user_finance_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  amount numeric(12,2) not null check (amount > 0),
  status text not null default 'pendente'
    check (status in ('pendente', 'confirmado', 'pago', 'parcelado', 'previsto')),
  paid_at date,
  expected_at date,
  category_id uuid references public.user_finance_categories (id) on delete set null,
  category_label text,
  team_member_name text,
  team_member_role text,
  reason text,
  payment_method text,
  proof_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_finance_expenses_user_id_idx
  on public.user_finance_expenses (user_id);

create index if not exists user_finance_expenses_status_idx
  on public.user_finance_expenses (status);

create index if not exists user_finance_expenses_paid_at_idx
  on public.user_finance_expenses (paid_at desc);

create index if not exists user_finance_expenses_expected_at_idx
  on public.user_finance_expenses (expected_at desc);

alter table public.user_finance_categories enable row level security;
alter table public.user_finance_entries enable row level security;
alter table public.user_finance_expenses enable row level security;

drop policy if exists "user_finance_categories_read" on public.user_finance_categories;
create policy "user_finance_categories_read"
  on public.user_finance_categories
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_finance_categories_write" on public.user_finance_categories;
create policy "user_finance_categories_write"
  on public.user_finance_categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_finance_entries_read" on public.user_finance_entries;
create policy "user_finance_entries_read"
  on public.user_finance_entries
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_finance_entries_write" on public.user_finance_entries;
create policy "user_finance_entries_write"
  on public.user_finance_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_finance_expenses_read" on public.user_finance_expenses;
create policy "user_finance_expenses_read"
  on public.user_finance_expenses
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_finance_expenses_write" on public.user_finance_expenses;
create policy "user_finance_expenses_write"
  on public.user_finance_expenses
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
