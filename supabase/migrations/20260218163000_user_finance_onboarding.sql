alter table public.user_finance_entries
  add column if not exists source_event_id uuid references public.events (id) on delete set null,
  add column if not exists source_vendor_id uuid references public.event_vendors (id) on delete set null,
  add column if not exists source_expense_id uuid references public.event_expenses (id) on delete set null;

create unique index if not exists user_finance_entries_source_expense_id_key
  on public.user_finance_entries (source_expense_id)
  where source_expense_id is not null;

create table if not exists public.user_finance_onboarding (
  user_id uuid primary key references auth.users (id) on delete cascade,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.user_finance_onboarding enable row level security;

drop policy if exists "user_finance_onboarding_read" on public.user_finance_onboarding;
create policy "user_finance_onboarding_read"
  on public.user_finance_onboarding
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_finance_onboarding_write" on public.user_finance_onboarding;
create policy "user_finance_onboarding_write"
  on public.user_finance_onboarding
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
