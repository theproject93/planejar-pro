create table if not exists public.super_admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.super_admin_users enable row level security;

drop policy if exists "super_admin_users_select_own" on public.super_admin_users;
create policy "super_admin_users_select_own"
  on public.super_admin_users
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.is_super_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.super_admin_users sau
    where sau.user_id = p_user_id
  );
$$;

grant execute on function public.is_super_admin(uuid) to authenticated;

drop policy if exists "billing_subscriptions_select_own" on public.billing_subscriptions;
create policy "billing_subscriptions_select_own"
  on public.billing_subscriptions
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_super_admin(auth.uid())
  );

drop policy if exists "billing_payments_select_own" on public.billing_payments;
create policy "billing_payments_select_own"
  on public.billing_payments
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_super_admin(auth.uid())
  );
