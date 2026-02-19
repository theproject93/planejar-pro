create table if not exists public.crm_retention_deletions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null,
  client_name text,
  event_type text,
  lost_at timestamptz,
  deleted_at timestamptz not null default now(),
  reason text not null default 'retencao_cliente_perdido'
);

create index if not exists crm_retention_deletions_user_deleted_idx
  on public.crm_retention_deletions (user_id, deleted_at desc);

alter table public.crm_retention_deletions enable row level security;

drop policy if exists "crm_retention_deletions_read_own" on public.crm_retention_deletions;
create policy "crm_retention_deletions_read_own"
  on public.crm_retention_deletions
  for select
  using (auth.uid() = user_id);

drop policy if exists "crm_retention_deletions_insert_own" on public.crm_retention_deletions;
create policy "crm_retention_deletions_insert_own"
  on public.crm_retention_deletions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "crm_retention_deletions_update_own" on public.crm_retention_deletions;
create policy "crm_retention_deletions_update_own"
  on public.crm_retention_deletions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "crm_retention_deletions_delete_own" on public.crm_retention_deletions;
create policy "crm_retention_deletions_delete_own"
  on public.crm_retention_deletions
  for delete
  using (auth.uid() = user_id);

create or replace function public.purge_crm_lost_clients(
  p_days integer default 30,
  p_user_id uuid default auth.uid()
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user uuid := auth.uid();
  v_target_user uuid := coalesce(p_user_id, auth.uid());
  v_days integer := greatest(coalesce(p_days, 30), 1);
  v_deleted integer := 0;
begin
  if v_target_user is null then
    return 0;
  end if;

  if v_auth_user is not null and v_target_user <> v_auth_user then
    raise exception 'forbidden';
  end if;

  insert into public.crm_retention_deletions (
    user_id,
    client_id,
    client_name,
    event_type,
    lost_at,
    reason
  )
  select
    c.user_id,
    c.id,
    c.name,
    c.event_type,
    coalesce(c.lost_at, c.stage_changed_at, c.updated_at),
    'retencao_cliente_perdido'
  from public.crm_clients c
  where c.user_id = v_target_user
    and c.stage = 'cliente_perdido'
    and coalesce(c.lost_at, c.stage_changed_at, c.updated_at, c.created_at) < now() - make_interval(days => v_days);

  delete from public.crm_clients c
  where c.user_id = v_target_user
    and c.stage = 'cliente_perdido'
    and coalesce(c.lost_at, c.stage_changed_at, c.updated_at, c.created_at) < now() - make_interval(days => v_days);

  get diagnostics v_deleted = row_count;
  return coalesce(v_deleted, 0);
end;
$$;

grant execute on function public.purge_crm_lost_clients(integer, uuid) to authenticated;
