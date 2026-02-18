-- Execute this script in Supabase SQL Editor.
create table if not exists public.subscription_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  phone text not null,
  professional_type text not null,
  events_volume text not null,
  desired_plan text not null,
  start_timing text not null,
  source text not null default 'landing-atendimento-ia'
);

alter table public.subscription_leads enable row level security;

drop policy if exists "public_can_insert_subscription_leads"
  on public.subscription_leads;
create policy "public_can_insert_subscription_leads"
  on public.subscription_leads
  for insert
  to anon
  with check (true);

drop policy if exists "authenticated_can_read_subscription_leads"
  on public.subscription_leads;
create policy "authenticated_can_read_subscription_leads"
  on public.subscription_leads
  for select
  to authenticated
  using (true);

