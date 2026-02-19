create table if not exists public.crm_portfolio_shares (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Portfolio',
  pdf_url text not null,
  sender_name text,
  sender_email text,
  sender_whatsapp text,
  sender_instagram text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists crm_portfolio_shares_user_created_idx
  on public.crm_portfolio_shares (user_id, created_at desc);

alter table public.crm_portfolio_shares enable row level security;

drop policy if exists "crm_portfolio_shares_read_own" on public.crm_portfolio_shares;
create policy "crm_portfolio_shares_read_own"
  on public.crm_portfolio_shares
  for select
  using (auth.uid() = user_id);

drop policy if exists "crm_portfolio_shares_insert_own" on public.crm_portfolio_shares;
create policy "crm_portfolio_shares_insert_own"
  on public.crm_portfolio_shares
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "crm_portfolio_shares_update_own" on public.crm_portfolio_shares;
create policy "crm_portfolio_shares_update_own"
  on public.crm_portfolio_shares
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "crm_portfolio_shares_delete_own" on public.crm_portfolio_shares;
create policy "crm_portfolio_shares_delete_own"
  on public.crm_portfolio_shares
  for delete
  using (auth.uid() = user_id);

create or replace function public.get_portfolio_share_by_token(p_token uuid)
returns table (
  title text,
  pdf_url text,
  sender_name text,
  sender_email text,
  sender_whatsapp text,
  sender_instagram text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    s.title,
    s.pdf_url,
    s.sender_name,
    s.sender_email,
    s.sender_whatsapp,
    s.sender_instagram,
    s.created_at
  from public.crm_portfolio_shares s
  where s.token = p_token
    and (s.expires_at is null or s.expires_at > now())
  limit 1;
$$;

grant execute on function public.get_portfolio_share_by_token(uuid) to anon, authenticated;
