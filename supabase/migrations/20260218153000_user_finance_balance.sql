create table if not exists public.user_finance_balance (
  user_id uuid primary key references auth.users (id) on delete cascade,
  base_balance numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_finance_balance enable row level security;

drop policy if exists "user_finance_balance_read" on public.user_finance_balance;
create policy "user_finance_balance_read"
  on public.user_finance_balance
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_finance_balance_write" on public.user_finance_balance;
create policy "user_finance_balance_write"
  on public.user_finance_balance
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
