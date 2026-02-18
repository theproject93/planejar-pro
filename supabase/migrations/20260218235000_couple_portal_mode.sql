create extension if not exists pgcrypto;

alter table public.events
  add column if not exists couple_portal_token uuid default gen_random_uuid();

update public.events
set couple_portal_token = gen_random_uuid()
where couple_portal_token is null;

create unique index if not exists events_couple_portal_token_key
  on public.events (couple_portal_token);

alter table public.event_couple_updates
  add column if not exists author_role text not null default 'assessoria'
    check (author_role in ('assessoria', 'noivos')),
  add column if not exists author_name text,
  add column if not exists photo_url text;

update public.event_couple_updates
set author_role = 'assessoria'
where author_role is null;

create or replace function public.get_couple_portal_event_by_token(p_token uuid)
returns table (
  event_id uuid,
  event_name text,
  event_date date,
  location text,
  couple text
)
language sql
security definer
set search_path = public
as $$
  select
    e.id,
    e.name,
    e.event_date,
    e.location,
    e.couple
  from public.events e
  where e.couple_portal_token = p_token
  limit 1;
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
language sql
security definer
set search_path = public
as $$
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
begin
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

grant execute on function public.get_couple_portal_event_by_token(uuid) to anon, authenticated;
grant execute on function public.get_couple_updates_by_token(uuid) to anon, authenticated;
grant execute on function public.create_couple_update_by_token(uuid, text, text, text, text) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'couple-updates',
  'couple-updates',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "couple_updates_public_read" on storage.objects;
create policy "couple_updates_public_read"
  on storage.objects
  for select
  using (bucket_id = 'couple-updates');

drop policy if exists "couple_updates_public_insert" on storage.objects;
create policy "couple_updates_public_insert"
  on storage.objects
  for insert
  with check (bucket_id = 'couple-updates');

drop policy if exists "couple_updates_public_update" on storage.objects;
create policy "couple_updates_public_update"
  on storage.objects
  for update
  using (bucket_id = 'couple-updates')
  with check (bucket_id = 'couple-updates');

drop policy if exists "couple_updates_public_delete" on storage.objects;
create policy "couple_updates_public_delete"
  on storage.objects
  for delete
  using (bucket_id = 'couple-updates');

