create table if not exists public.public_endpoint_rate_limit_buckets (
  bucket_start timestamptz not null,
  endpoint text not null,
  scope text not null,
  hits integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (bucket_start, endpoint, scope)
);

create index if not exists public_endpoint_rate_limit_buckets_created_idx
  on public.public_endpoint_rate_limit_buckets (created_at desc);

alter table public.public_endpoint_rate_limit_buckets enable row level security;

revoke all on public.public_endpoint_rate_limit_buckets from anon, authenticated;

create or replace function public.get_request_ip()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(
      split_part(
        coalesce((coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb ->> 'x-forwarded-for'), ''),
        ',',
        1
      ),
      ''
    ),
    nullif(coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb ->> 'cf-connecting-ip', ''),
    nullif(coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb ->> 'x-real-ip', ''),
    'unknown'
  );
$$;

revoke all on function public.get_request_ip() from public;
grant execute on function public.get_request_ip() to anon, authenticated;

create or replace function public.check_public_endpoint_rate_limit(
  p_endpoint text,
  p_scope text,
  p_limit integer default 60,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket_start timestamptz;
  v_hits integer;
  v_endpoint text := left(coalesce(nullif(trim(p_endpoint), ''), 'unknown'), 100);
  v_scope text := left(coalesce(nullif(trim(p_scope), ''), 'anon'), 200);
begin
  if p_limit <= 0 or p_window_seconds <= 0 then
    return false;
  end if;

  v_bucket_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.public_endpoint_rate_limit_buckets (bucket_start, endpoint, scope, hits)
  values (v_bucket_start, v_endpoint, v_scope, 1)
  on conflict (bucket_start, endpoint, scope)
  do update set hits = public.public_endpoint_rate_limit_buckets.hits + 1
  returning hits into v_hits;

  delete from public.public_endpoint_rate_limit_buckets
  where bucket_start < now() - interval '1 day';

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.check_public_endpoint_rate_limit(text, text, integer, integer) from public;
grant execute on function public.check_public_endpoint_rate_limit(text, text, integer, integer) to anon, authenticated;

alter table public.crm_signature_requests
  alter column expires_at set default (now() + interval '30 days');

update public.crm_signature_requests
set expires_at = now() + interval '30 days'
where expires_at is null
  and status = 'pending';

alter table public.crm_portfolio_shares
  alter column expires_at set default (now() + interval '45 days');

update public.crm_portfolio_shares
set expires_at = now() + interval '45 days'
where expires_at is null;

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
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  v_allowed := public.check_public_endpoint_rate_limit(
    'guest_invite_get',
    public.get_request_ip(),
    120,
    60
  );
  if not v_allowed then
    raise exception 'rate_limited';
  end if;

  return query
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
end;
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
  v_allowed boolean;
begin
  v_allowed := public.check_public_endpoint_rate_limit(
    'guest_invite_submit',
    public.get_request_ip(),
    30,
    60
  );
  if not v_allowed then
    raise exception 'rate_limited';
  end if;

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

create or replace function public.get_signature_request_by_token(p_token uuid)
returns table (
  request_id uuid,
  client_name text,
  client_email text,
  document_title text,
  document_content text,
  status text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  v_allowed := public.check_public_endpoint_rate_limit(
    'signature_request_get',
    public.get_request_ip(),
    80,
    60
  );
  if not v_allowed then
    raise exception 'rate_limited';
  end if;

  return query
  select
    r.id as request_id,
    r.client_name,
    r.client_email,
    d.title as document_title,
    d.content as document_content,
    r.status,
    r.expires_at
  from public.crm_signature_requests r
  join public.crm_client_documents d on d.id = r.document_id
  where r.token = p_token
    and r.status = 'pending'
    and (r.expires_at is null or r.expires_at > now())
  limit 1;
end;
$$;

create or replace function public.sign_signature_request_by_token(
  p_token uuid,
  p_signer_name text,
  p_signer_email text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document_id uuid;
  v_allowed boolean;
begin
  v_allowed := public.check_public_endpoint_rate_limit(
    'signature_request_sign',
    public.get_request_ip(),
    25,
    60
  );
  if not v_allowed then
    raise exception 'rate_limited';
  end if;

  update public.crm_signature_requests r
  set
    status = 'signed',
    signer_name = nullif(trim(p_signer_name), ''),
    signer_email = nullif(trim(p_signer_email), ''),
    signed_at = now(),
    updated_at = now()
  where r.token = p_token
    and r.status = 'pending'
    and (r.expires_at is null or r.expires_at > now())
  returning r.document_id into v_document_id;

  if v_document_id is null then
    return false;
  end if;

  update public.crm_client_documents
  set
    status = 'signed',
    signed_at = now(),
    updated_at = now()
  where id = v_document_id;

  return true;
end;
$$;

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
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  v_allowed := public.check_public_endpoint_rate_limit(
    'portfolio_share_get',
    public.get_request_ip(),
    80,
    60
  );
  if not v_allowed then
    raise exception 'rate_limited';
  end if;

  return query
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
end;
$$;

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
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  v_allowed := public.check_public_endpoint_rate_limit(
    'vendor_portal_get_legacy',
    public.get_request_ip(),
    100,
    60
  );
  if not v_allowed then
    raise exception 'rate_limited';
  end if;

  return query
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
end;
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
  v_allowed boolean;
begin
  v_allowed := public.check_public_endpoint_rate_limit(
    'vendor_portal_update_legacy',
    public.get_request_ip(),
    30,
    60
  );
  if not v_allowed then
    raise exception 'rate_limited';
  end if;

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
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  v_allowed := public.check_public_endpoint_rate_limit(
    'vendor_portal_get_v2',
    public.get_request_ip(),
    100,
    60
  );
  if not v_allowed then
    raise exception 'rate_limited';
  end if;

  return query
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
end;
$$;

create or replace function public.get_vendor_status_history_by_token(p_token uuid)
returns table (
  status text,
  note text,
  updated_by text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  v_allowed := public.check_public_endpoint_rate_limit(
    'vendor_portal_history_v2',
    public.get_request_ip(),
    120,
    60
  );
  if not v_allowed then
    raise exception 'rate_limited';
  end if;

  return query
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
end;
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
  v_allowed boolean;
begin
  v_allowed := public.check_public_endpoint_rate_limit(
    'vendor_portal_update_v2',
    public.get_request_ip(),
    30,
    60
  );
  if not v_allowed then
    raise exception 'rate_limited';
  end if;

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

create or replace function public.get_couple_portal_event_by_token(p_token uuid)
returns table (
  event_id uuid,
  event_name text,
  event_date date,
  location text,
  couple text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  v_allowed := public.check_public_endpoint_rate_limit(
    'couple_portal_event_get',
    public.get_request_ip(),
    100,
    60
  );
  if not v_allowed then
    raise exception 'rate_limited';
  end if;

  return query
  select
    e.id,
    e.name,
    e.event_date,
    e.location,
    e.couple
  from public.events e
  where e.couple_portal_token = p_token
  limit 1;
end;
$$;

create or replace function public.get_couple_updates_by_token(p_token uuid)
returns table (
  id uuid,
  event_id uuid,
  kind text,
  title text,
  message text,
  photo_url text,
  author_role text,
  author_name text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  v_allowed := public.check_public_endpoint_rate_limit(
    'couple_portal_updates_get',
    public.get_request_ip(),
    120,
    60
  );
  if not v_allowed then
    raise exception 'rate_limited';
  end if;

  return query
  select
    u.id,
    u.event_id,
    u.kind,
    u.title,
    u.message,
    u.photo_url,
    u.author_role,
    u.author_name,
    u.created_at
  from public.event_couple_updates u
  where u.event_id = (
    select e.id
    from public.events e
    where e.couple_portal_token = p_token
    limit 1
  )
  order by u.created_at desc
  limit 100;
end;
$$;

create or replace function public.create_couple_update_by_token(
  p_token uuid,
  p_title text,
  p_message text,
  p_photo_url text default null,
  p_author_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_id uuid;
  v_message text;
  v_allowed boolean;
begin
  v_allowed := public.check_public_endpoint_rate_limit(
    'couple_portal_update_create',
    public.get_request_ip(),
    20,
    60
  );
  if not v_allowed then
    raise exception 'rate_limited';
  end if;

  select e.id
  into v_event_id
  from public.events e
  where e.couple_portal_token = p_token
  limit 1;

  if v_event_id is null then
    raise exception 'invalid token';
  end if;

  v_message := trim(coalesce(p_message, ''));
  if v_message = '' then
    raise exception 'message required';
  end if;

  insert into public.event_couple_updates (
    event_id,
    kind,
    title,
    message,
    photo_url,
    author_role,
    author_name
  )
  values (
    v_event_id,
    'info',
    coalesce(nullif(trim(coalesce(p_title, '')), ''), 'Atualizacao dos noivos'),
    v_message,
    nullif(trim(coalesce(p_photo_url, '')), ''),
    'noivos',
    nullif(trim(coalesce(p_author_name, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.rotate_vendor_control_token(p_vendor_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next uuid := gen_random_uuid();
begin
  update public.event_vendors v
  set control_token = v_next
  where v.id = p_vendor_id
    and exists (
      select 1
      from public.events e
      where e.id = v.event_id
        and e.user_id = auth.uid()
    );

  if not found then
    raise exception 'vendor_not_found_or_forbidden';
  end if;

  return v_next;
end;
$$;

create or replace function public.rotate_couple_portal_token(p_event_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next uuid := gen_random_uuid();
begin
  update public.events e
  set couple_portal_token = v_next
  where e.id = p_event_id
    and e.user_id = auth.uid();

  if not found then
    raise exception 'event_not_found_or_forbidden';
  end if;

  return v_next;
end;
$$;

create or replace function public.rotate_guest_invite_token(p_guest_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next text := gen_random_uuid()::text;
begin
  update public.event_guests g
  set invite_token = v_next
  where g.id = p_guest_id
    and exists (
      select 1
      from public.events e
      where e.id = g.event_id
        and e.user_id = auth.uid()
    );

  if not found then
    raise exception 'guest_not_found_or_forbidden';
  end if;

  return v_next;
end;
$$;

create or replace function public.rotate_signature_request_token(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next uuid := gen_random_uuid();
begin
  update public.crm_signature_requests r
  set token = v_next,
      expires_at = now() + interval '30 days',
      updated_at = now()
  where r.id = p_request_id
    and r.user_id = auth.uid();

  if not found then
    raise exception 'request_not_found_or_forbidden';
  end if;

  return v_next;
end;
$$;

create or replace function public.rotate_portfolio_share_token(p_share_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next uuid := gen_random_uuid();
begin
  update public.crm_portfolio_shares s
  set token = v_next,
      expires_at = now() + interval '45 days'
  where s.id = p_share_id
    and s.user_id = auth.uid();

  if not found then
    raise exception 'share_not_found_or_forbidden';
  end if;

  return v_next;
end;
$$;

grant execute on function public.rotate_vendor_control_token(uuid) to authenticated;
grant execute on function public.rotate_couple_portal_token(uuid) to authenticated;
grant execute on function public.rotate_guest_invite_token(uuid) to authenticated;
grant execute on function public.rotate_signature_request_token(uuid) to authenticated;
grant execute on function public.rotate_portfolio_share_token(uuid) to authenticated;
