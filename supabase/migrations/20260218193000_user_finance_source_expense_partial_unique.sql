alter table public.user_finance_entries
  add column if not exists source_payment_id uuid references public.expense_payments (id) on delete set null;

drop index if exists public.user_finance_entries_source_expense_id_key;
drop index if exists public.user_finance_entries_source_expense_planned_key;

create unique index if not exists user_finance_entries_source_expense_planned_key
  on public.user_finance_entries (source_expense_id)
  where source_expense_id is not null and source_payment_id is null;

create unique index if not exists user_finance_entries_source_payment_id_key
  on public.user_finance_entries (source_payment_id)
  where source_payment_id is not null;