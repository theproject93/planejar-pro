create table if not exists public.billing_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  provider text not null default 'mercadopago',
  status text not null default 'inactive',
  plan_id text,
  plan_name text,
  amount_cents integer,
  currency text not null default 'BRL',
  external_reference text,
  provider_customer_id text,
  provider_subscription_id text,
  provider_checkout_preference_id text,
  last_payment_id text,
  last_payment_status text,
  last_payment_at timestamptz,
  current_period_end timestamptz
);

create index if not exists billing_subscriptions_status_idx
  on public.billing_subscriptions (status);

create index if not exists billing_subscriptions_updated_idx
  on public.billing_subscriptions (updated_at desc);

alter table public.billing_subscriptions enable row level security;

drop policy if exists "billing_subscriptions_select_own"
  on public.billing_subscriptions;
create policy "billing_subscriptions_select_own"
  on public.billing_subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "billing_subscriptions_insert_own"
  on public.billing_subscriptions;
create policy "billing_subscriptions_insert_own"
  on public.billing_subscriptions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "billing_subscriptions_update_own"
  on public.billing_subscriptions;
create policy "billing_subscriptions_update_own"
  on public.billing_subscriptions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  processed_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  provider text not null default 'mercadopago',
  provider_payment_id text not null,
  provider_checkout_preference_id text,
  provider_merchant_order_id text,
  external_reference text,
  status text not null default 'pending',
  status_detail text,
  payment_method_id text,
  payment_type_id text,
  amount numeric(12, 2),
  currency text,
  payer_email text,
  raw_payload jsonb not null default '{}'::jsonb
);

create unique index if not exists billing_payments_provider_payment_uidx
  on public.billing_payments (provider, provider_payment_id);

create index if not exists billing_payments_user_status_idx
  on public.billing_payments (user_id, status, created_at desc);

alter table public.billing_payments enable row level security;

drop policy if exists "billing_payments_select_own"
  on public.billing_payments;
create policy "billing_payments_select_own"
  on public.billing_payments
  for select
  to authenticated
  using (auth.uid() = user_id);
