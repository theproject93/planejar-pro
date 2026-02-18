create extension if not exists pgcrypto;

alter table public.events
  add column if not exists invite_message_template text,
  add column if not exists invite_dress_code text;

alter table public.event_guests
  add column if not exists invite_token text,
  add column if not exists rsvp_status text not null default 'pending'
    check (rsvp_status in ('pending', 'confirmed', 'declined')),
  add column if not exists dietary_restrictions text,
  add column if not exists rsvp_note text,
  add column if not exists plus_one_count integer not null default 0,
  add column if not exists invited_at timestamptz,
  add column if not exists responded_at timestamptz;

do $$
declare
  v_token_type text;
begin
  select data_type
  into v_token_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'event_guests'
    and column_name = 'invite_token';

  if v_token_type = 'uuid' then
    execute $sql$
      update public.event_guests
      set invite_token = gen_random_uuid()
      where invite_token is null
    $sql$;
    execute $sql$
      alter table public.event_guests
      alter column invite_token set default gen_random_uuid()
    $sql$;
  elsif v_token_type = 'text' then
    execute $sql$
      update public.event_guests
      set invite_token = gen_random_uuid()::text
      where invite_token is null or invite_token = ''
    $sql$;
    execute $sql$
      alter table public.event_guests
      alter column invite_token set default gen_random_uuid()::text
    $sql$;
  end if;
end;
$$;

update public.event_guests
set rsvp_status = case
  when confirmed = true then 'confirmed'
  when rsvp_status in ('confirmed', 'declined', 'pending') then rsvp_status
  else 'pending'
end;

update public.event_guests
set confirmed = (rsvp_status = 'confirmed')
where confirmed is distinct from (rsvp_status = 'confirmed');

create unique index if not exists event_guests_invite_token_key
  on public.event_guests ((invite_token::text))
  where invite_token is not null and btrim(invite_token::text) <> '';

create index if not exists event_guests_event_id_rsvp_status_idx
  on public.event_guests (event_id, rsvp_status);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_guests_plus_one_count_check'
  ) then
    alter table public.event_guests
      add constraint event_guests_plus_one_count_check check (plus_one_count >= 0);
  end if;
end;
$$;

create or replace function public.get_guest_invite_by_token(p_token text)
returns table (
  guest_id uuid,
  event_id uuid,
  event_name text,
  event_date date,
  location text,
  couple text,
  guest_name text,
  rsvp_status text,
  plus_one_count integer,
  dietary_restrictions text,
  rsvp_note text,
  invite_message_template text,
  invite_dress_code text,
  table_name text
)
language sql
security definer
set search_path = public
as $$
  select
    g.id,
    e.id,
    e.name,
    e.event_date,
    e.location,
    e.couple,
    g.name,
    g.rsvp_status,
    g.plus_one_count,
    g.dietary_restrictions,
    g.rsvp_note,
    e.invite_message_template,
    e.invite_dress_code,
    t.name
  from public.event_guests g
  join public.events e on e.id = g.event_id
  left join public.event_tables t on t.id = g.table_id
  where g.invite_token::text = btrim(p_token)
  limit 1;
$$;

create or replace function public.submit_guest_rsvp_by_token(
  p_token text,
  p_status text,
  p_plus_one_count integer default 0,
  p_dietary_restrictions text default null,
  p_rsvp_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest_id uuid;
  v_status text;
begin
  v_status := lower(trim(coalesce(p_status, 'pending')));

  if v_status not in ('pending', 'confirmed', 'declined') then
    raise exception 'invalid status';
  end if;

  select g.id
  into v_guest_id
  from public.event_guests g
  where g.invite_token::text = btrim(p_token)
  limit 1;

  if v_guest_id is null then
    raise exception 'invalid token';
  end if;

  update public.event_guests
  set
    rsvp_status = v_status,
    confirmed = (v_status = 'confirmed'),
    plus_one_count = greatest(coalesce(p_plus_one_count, 0), 0),
    dietary_restrictions = nullif(btrim(coalesce(p_dietary_restrictions, '')), ''),
    rsvp_note = nullif(btrim(coalesce(p_rsvp_note, '')), ''),
    responded_at = now()
  where id = v_guest_id;
end;
$$;

grant execute on function public.get_guest_invite_by_token(text) to anon, authenticated;
grant execute on function public.submit_guest_rsvp_by_token(text, text, integer, text, text) to anon, authenticated;
