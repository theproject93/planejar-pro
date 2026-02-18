create or replace function public.get_vendor_by_token_v2(p_token uuid)
returns table (
  vendor_id uuid,
  event_id uuid,
  vendor_name text,
  vendor_category text,
  event_name text,
  event_date date,
  status text,
  expected_arrival_time time,
  expected_done_time time,
  latest_note text,
  latest_updated_at timestamptz
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
    ) as status,
    v.expected_arrival_time,
    v.expected_done_time,
    (
      select s.note
      from public.event_vendor_status s
      where s.vendor_id = v.id
      order by s.created_at desc
      limit 1
    ) as latest_note,
    (
      select s.created_at
      from public.event_vendor_status s
      where s.vendor_id = v.id
      order by s.created_at desc
      limit 1
    ) as latest_updated_at
  from public.event_vendors v
  join public.events e on e.id = v.event_id
  where v.control_token = p_token
  limit 1;
$$;

create or replace function public.get_vendor_status_history_by_token(p_token uuid)
returns table (
  status text,
  note text,
  updated_by text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    s.status,
    s.note,
    s.updated_by,
    s.created_at
  from public.event_vendor_status s
  where s.vendor_id = (
    select v.id
    from public.event_vendors v
    where v.control_token = p_token
    limit 1
  )
  order by s.created_at desc
  limit 30;
$$;

create or replace function public.update_vendor_status_by_token(
  p_token uuid,
  p_status text,
  p_note text
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

  insert into public.event_vendor_status (event_id, vendor_id, status, updated_by, note)
  values (v_row.event_id, v_row.id, p_status, 'fornecedor', nullif(trim(p_note), ''));
end;
$$;

grant execute on function public.get_vendor_by_token_v2(uuid) to anon, authenticated;
grant execute on function public.get_vendor_status_history_by_token(uuid) to anon, authenticated;
grant execute on function public.update_vendor_status_by_token(uuid, text, text) to anon, authenticated;