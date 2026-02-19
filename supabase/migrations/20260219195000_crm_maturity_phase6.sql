alter table public.crm_followup_tasks
  add column if not exists source_kind text default 'manual' check (
    source_kind in ('manual', 'rule', 'stage_playbook')
  ),
  add column if not exists source_ref text;

create index if not exists crm_followup_tasks_source_idx
  on public.crm_followup_tasks (user_id, source_kind, due_date desc);

create table if not exists public.crm_stage_playbook_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  stage text not null check (
    stage in ('conhecendo_cliente', 'analisando_orcamento', 'assinatura_contrato')
  ),
  title text not null,
  reason text,
  due_offset_days integer not null default 0 check (due_offset_days between 0 and 30),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_stage_playbook_steps_user_stage_idx
  on public.crm_stage_playbook_steps (user_id, stage, active);

alter table public.crm_stage_playbook_steps enable row level security;

drop policy if exists "crm_stage_playbook_steps_read_own" on public.crm_stage_playbook_steps;
create policy "crm_stage_playbook_steps_read_own"
  on public.crm_stage_playbook_steps
  for select
  using (auth.uid() = user_id);

drop policy if exists "crm_stage_playbook_steps_insert_own" on public.crm_stage_playbook_steps;
create policy "crm_stage_playbook_steps_insert_own"
  on public.crm_stage_playbook_steps
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "crm_stage_playbook_steps_update_own" on public.crm_stage_playbook_steps;
create policy "crm_stage_playbook_steps_update_own"
  on public.crm_stage_playbook_steps
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "crm_stage_playbook_steps_delete_own" on public.crm_stage_playbook_steps;
create policy "crm_stage_playbook_steps_delete_own"
  on public.crm_stage_playbook_steps
  for delete
  using (auth.uid() = user_id);

create or replace function public.ensure_crm_playbook_defaults_for_user(p_user_id uuid default auth.uid())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := coalesce(p_user_id, auth.uid());
  v_inserted integer := 0;
begin
  if v_user_id is null then
    return 0;
  end if;

  insert into public.crm_stage_playbook_steps (user_id, stage, title, reason, due_offset_days)
  values
    (v_user_id, 'conhecendo_cliente', 'Enviar mensagem inicial de alinhamento', 'Primeiro contato apos captura do lead', 0),
    (v_user_id, 'conhecendo_cliente', 'Agendar reuniao de descoberta', 'Mapear contexto e necessidades', 2),
    (v_user_id, 'analisando_orcamento', 'Enviar proposta comercial', 'Converter lead para proposta objetiva', 0),
    (v_user_id, 'analisando_orcamento', 'Fazer follow-up da proposta', 'Evitar esfriamento da negociacao', 3),
    (v_user_id, 'assinatura_contrato', 'Reforcar urgencia da assinatura', 'Pendencia contratual em aberto', 1),
    (v_user_id, 'assinatura_contrato', 'Confirmar recebimento do link de assinatura', 'Garantir avancao para cliente fechado', 3)
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  return coalesce(v_inserted, 0);
end;
$$;

grant execute on function public.ensure_crm_playbook_defaults_for_user(uuid) to authenticated;

create or replace function public.generate_crm_stage_playbook_tasks(p_user_id uuid default auth.uid())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := coalesce(p_user_id, auth.uid());
  v_inserted integer := 0;
begin
  if v_user_id is null then
    return 0;
  end if;

  perform public.ensure_crm_playbook_defaults_for_user(v_user_id);

  with candidates as (
    select
      c.id as client_id,
      c.name as client_name,
      c.stage,
      c.stage_changed_at,
      p.id as playbook_step_id,
      p.title,
      p.reason,
      p.due_offset_days,
      (coalesce(c.stage_changed_at, c.updated_at, c.created_at)::date + p.due_offset_days) as due_date
    from public.crm_clients c
    join public.crm_stage_playbook_steps p
      on p.user_id = c.user_id
      and p.stage = c.stage
      and p.active = true
    where c.user_id = v_user_id
      and c.stage in ('conhecendo_cliente', 'analisando_orcamento', 'assinatura_contrato')
  ),
  ins as (
    insert into public.crm_followup_tasks (
      user_id,
      client_id,
      title,
      reason,
      due_date,
      status,
      source_kind,
      source_ref
    )
    select
      v_user_id,
      can.client_id,
      can.title || ' - ' || can.client_name,
      can.reason,
      greatest(can.due_date, current_date - 7),
      'open',
      'stage_playbook',
      can.playbook_step_id::text
    from candidates can
    where not exists (
      select 1
      from public.crm_followup_tasks t
      where t.user_id = v_user_id
        and t.client_id = can.client_id
        and t.status = 'open'
        and t.source_kind = 'stage_playbook'
        and t.source_ref = can.playbook_step_id::text
    )
    returning 1
  )
  select count(*) into v_inserted from ins;

  return coalesce(v_inserted, 0);
end;
$$;

grant execute on function public.generate_crm_stage_playbook_tasks(uuid) to authenticated;

create or replace function public.get_crm_execution_metrics()
returns table (
  metric text,
  value bigint
)
language sql
security definer
set search_path = public
as $$
  select 'tarefas_playbook_abertas'::text as metric,
    count(*)::bigint as value
  from public.crm_followup_tasks t
  where t.user_id = auth.uid()
    and t.status = 'open'
    and t.source_kind = 'stage_playbook'

  union all

  select 'tarefas_playbook_atrasadas'::text as metric,
    count(*)::bigint as value
  from public.crm_followup_tasks t
  where t.user_id = auth.uid()
    and t.status = 'open'
    and t.source_kind = 'stage_playbook'
    and t.due_date < current_date

  union all

  select 'clientes_ativos_sem_playbook'::text as metric,
    count(*)::bigint as value
  from public.crm_clients c
  where c.user_id = auth.uid()
    and c.stage in ('conhecendo_cliente', 'analisando_orcamento', 'assinatura_contrato')
    and not exists (
      select 1
      from public.crm_followup_tasks t
      where t.user_id = c.user_id
        and t.client_id = c.id
        and t.status = 'open'
        and t.source_kind = 'stage_playbook'
    );
$$;

grant execute on function public.get_crm_execution_metrics() to authenticated;
