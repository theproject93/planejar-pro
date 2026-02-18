alter table public.user_finance_entries
  add column if not exists source_payment_id uuid references public.expense_payments (id) on delete set null;

create unique index if not exists user_finance_entries_source_payment_id_key
  on public.user_finance_entries (source_payment_id)
  where source_payment_id is not null;