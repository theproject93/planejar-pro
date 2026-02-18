alter table public.event_vendors
  add column if not exists control_token uuid default gen_random_uuid();

create unique index if not exists event_vendors_control_token_key
  on public.event_vendors (control_token);

create table if not exists public.event_vendor_status (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  vendor_id uuid not null references public.event_vendors (id) on delete cascade,
  status text not null check (status in ('pending', 'en_route', 'arrived', 'done')),
  updated_by text not null check (updated_by in ('assessoria', 'fornecedor')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists event_vendor_status_event_id_idx
  on public.event_vendor_status (event_id);

create index if not exists event_vendor_status_vendor_id_idx
  on public.event_vendor_status (vendor_id);

alter table public.event_vendor_status enable row level security;

drop policy if exists "event_vendor_status_read" on public.event_vendor_status;
create policy "event_vendor_status_read"
  on public.event_vendor_status
  for select
  using (
    exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.user_id = auth.uid()
    )
  );

drop policy if exists "event_vendor_status_write" on public.event_vendor_status;
create policy "event_vendor_status_write"
  on public.event_vendor_status
  for insert
  with check (
    exists (
      select 1
      from public.events e
      where e.id = event_id
        and e.user_id = auth.uid()
    )
  );

create or replace function public.get_vendor_by_token(p_token uuid)
returns table (
  vendor_id uuid,
  event_id uuid,
  vendor_name text,
  vendor_category text,
  event_name text,
  event_date date,
  status text
)
language sql
security definer
set search_path = public
as $$
  select
    v.id,
    v.event_id,
    v.name,
    v.category,
    e.name,
    e.event_date,
    (
      select s.status
      from public.event_vendor_status s
      where s.vendor_id = v.id
      order by s.created_at desc
      limit 1
    ) as status
  from public.event_vendors v
  join public.events e on e.id = v.event_id
  where v.control_token = p_token
  limit 1;
$$;

create or replace function public.update_vendor_status_by_token(
  p_token uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  if p_status not in ('pending', 'en_route', 'arrived', 'done') then
    raise exception 'invalid status';
  end if;

  select v.* into v_row
  from public.event_vendors v
  where v.control_token = p_token;

  if v_row.id is null then
    raise exception 'invalid token';
  end if;

  insert into public.event_vendor_status (event_id, vendor_id, status, updated_by)
  values (v_row.event_id, v_row.id, p_status, 'fornecedor');
end;
$$;

grant execute on function public.get_vendor_by_token(uuid) to anon, authenticated;
grant execute on function public.update_vendor_status_by_token(uuid, text) to anon, authenticated;
