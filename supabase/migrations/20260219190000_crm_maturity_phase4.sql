alter table public.crm_clients
  add column if not exists stage_changed_at timestamptz,
  add column if not exists won_at timestamptz,
  add column if not exists lost_at timestamptz,
  add column if not exists lost_reason text;

update public.crm_clients
set
  stage_changed_at = coalesce(stage_changed_at, updated_at, created_at),
  won_at = case
    when stage = 'cliente_fechado' then coalesce(won_at, updated_at, created_at)
    else won_at
  end,
  lost_at = case
    when stage = 'cliente_perdido' then coalesce(lost_at, updated_at, created_at)
    else lost_at
  end;

create table if not exists public.crm_client_stage_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.crm_clients (id) on delete cascade,
  from_stage text,
  to_stage text not null,
  reason text,
  changed_at timestamptz not null default now()
);

create index if not exists crm_client_stage_history_client_idx
  on public.crm_client_stage_history (client_id, changed_at desc);

create index if not exists crm_client_stage_history_user_idx
  on public.crm_client_stage_history (user_id, changed_at desc);

alter table public.crm_client_stage_history enable row level security;

drop policy if exists "crm_client_stage_history_read_own" on public.crm_client_stage_history;
create policy "crm_client_stage_history_read_own"
  on public.crm_client_stage_history
  for select
  using (auth.uid() = user_id);

drop policy if exists "crm_client_stage_history_insert_own" on public.crm_client_stage_history;
create policy "crm_client_stage_history_insert_own"
  on public.crm_client_stage_history
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "crm_client_stage_history_update_own" on public.crm_client_stage_history;
create policy "crm_client_stage_history_update_own"
  on public.crm_client_stage_history
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "crm_client_stage_history_delete_own" on public.crm_client_stage_history;
create policy "crm_client_stage_history_delete_own"
  on public.crm_client_stage_history
  for delete
  using (auth.uid() = user_id);

insert into public.crm_client_stage_history (
  user_id,
  client_id,
  from_stage,
  to_stage,
  reason,
  changed_at
)
select
  c.user_id,
  c.id,
  null,
  c.stage,
  case when c.stage = 'cliente_perdido' then c.lost_reason else null end,
  coalesce(c.stage_changed_at, c.updated_at, c.created_at)
from public.crm_clients c
where not exists (
  select 1
  from public.crm_client_stage_history h
  where h.client_id = c.id
);

create or replace function public.handle_crm_client_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.stage_changed_at := coalesce(new.stage_changed_at, now());
    if new.stage = 'cliente_fechado' then
      new.won_at := coalesce(new.won_at, now());
    end if;
    if new.stage = 'cliente_perdido' then
      new.lost_at := coalesce(new.lost_at, now());
    end if;
    return new;
  end if;

  if new.stage is distinct from old.stage then
    new.stage_changed_at := now();
    if new.stage = 'cliente_fechado' then
      new.won_at := coalesce(new.won_at, now());
    end if;
    if new.stage = 'cliente_perdido' then
      new.lost_at := coalesce(new.lost_at, now());
    end if;

  end if;

  return new;
end;
$$;

create or replace function public.log_crm_client_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.crm_client_stage_history (
      user_id,
      client_id,
      from_stage,
      to_stage,
      reason,
      changed_at
    )
    values (
      new.user_id,
      new.id,
      null,
      new.stage,
      case when new.stage = 'cliente_perdido' then new.lost_reason else null end,
      coalesce(new.stage_changed_at, now())
    );
    return new;
  end if;

  if new.stage is distinct from old.stage then
    insert into public.crm_client_stage_history (
      user_id,
      client_id,
      from_stage,
      to_stage,
      reason,
      changed_at
    )
    values (
      new.user_id,
      new.id,
      old.stage,
      new.stage,
      case when new.stage = 'cliente_perdido' then new.lost_reason else null end,
      coalesce(new.stage_changed_at, now())
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_crm_client_stage_change on public.crm_clients;
create trigger trg_crm_client_stage_change
before insert or update on public.crm_clients
for each row
execute function public.handle_crm_client_stage_change();

drop trigger if exists trg_crm_client_stage_history on public.crm_clients;
create trigger trg_crm_client_stage_history
after insert or update on public.crm_clients
for each row
execute function public.log_crm_client_stage_change();

create or replace function public.get_crm_operational_metrics()
returns table (
  metric text,
  value bigint,
  priority text
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select auth.uid() as uid
  )
  select 'followups_em_atraso'::text as metric,
    coalesce((
      select count(*)
      from public.crm_followup_tasks t
      where t.user_id = me.uid
        and t.status = 'open'
        and t.due_date < current_date
    ), 0)::bigint as value,
    'alta'::text as priority
  from me

  union all

  select 'leads_sem_interacao_7d'::text as metric,
    coalesce((
      select count(*)
      from public.crm_clients c
      where c.user_id = me.uid
        and c.stage in ('conhecendo_cliente', 'analisando_orcamento', 'assinatura_contrato')
        and not exists (
          select 1
          from public.crm_lead_interactions i
          where i.user_id = c.user_id
            and i.client_id = c.id
            and i.happened_at >= now() - interval '7 days'
        )
    ), 0)::bigint as value,
    'media'::text as priority
  from me

  union all

  select 'assinaturas_pendentes_3d'::text as metric,
    coalesce((
      select count(*)
      from public.crm_signature_requests r
      where r.user_id = me.uid
        and r.status = 'pending'
        and r.created_at < now() - interval '3 days'
    ), 0)::bigint as value,
    'alta'::text as priority
  from me

  union all

  select 'orcamentos_sem_consentimento'::text as metric,
    coalesce((
      select count(*)
      from public.crm_clients c
      where c.user_id = me.uid
        and c.stage = 'analisando_orcamento'
        and not exists (
          select 1
          from public.crm_consent_records cr
          where cr.user_id = c.user_id
            and cr.client_id = c.id
        )
    ), 0)::bigint as value,
    'media'::text as priority
  from me;
$$;

grant execute on function public.get_crm_operational_metrics() to authenticated;
