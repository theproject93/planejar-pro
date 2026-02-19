create table if not exists public.crm_lead_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.crm_clients (id) on delete cascade,
  channel text not null check (channel in ('whatsapp', 'email', 'ligacao', 'instagram', 'reuniao', 'outro')),
  direction text not null default 'outbound' check (direction in ('outbound', 'inbound')),
  summary text not null,
  happened_at timestamptz not null default now(),
  next_followup_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists crm_lead_interactions_client_idx
  on public.crm_lead_interactions (client_id, happened_at desc);

create index if not exists crm_lead_interactions_user_idx
  on public.crm_lead_interactions (user_id, happened_at desc);

alter table public.crm_lead_interactions enable row level security;

drop policy if exists "crm_lead_interactions_read_own" on public.crm_lead_interactions;
create policy "crm_lead_interactions_read_own"
  on public.crm_lead_interactions
  for select
  using (auth.uid() = user_id);

drop policy if exists "crm_lead_interactions_insert_own" on public.crm_lead_interactions;
create policy "crm_lead_interactions_insert_own"
  on public.crm_lead_interactions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "crm_lead_interactions_update_own" on public.crm_lead_interactions;
create policy "crm_lead_interactions_update_own"
  on public.crm_lead_interactions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "crm_lead_interactions_delete_own" on public.crm_lead_interactions;
create policy "crm_lead_interactions_delete_own"
  on public.crm_lead_interactions
  for delete
  using (auth.uid() = user_id);

create table if not exists public.crm_followup_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  active boolean not null default true,
  days_without_reply integer not null default 3 check (days_without_reply between 1 and 30),
  stage_filter text[] not null default array['conhecendo_cliente', 'analisando_orcamento', 'assinatura_contrato'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.crm_followup_rules enable row level security;

drop policy if exists "crm_followup_rules_read_own" on public.crm_followup_rules;
create policy "crm_followup_rules_read_own"
  on public.crm_followup_rules
  for select
  using (auth.uid() = user_id);

drop policy if exists "crm_followup_rules_insert_own" on public.crm_followup_rules;
create policy "crm_followup_rules_insert_own"
  on public.crm_followup_rules
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "crm_followup_rules_update_own" on public.crm_followup_rules;
create policy "crm_followup_rules_update_own"
  on public.crm_followup_rules
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "crm_followup_rules_delete_own" on public.crm_followup_rules;
create policy "crm_followup_rules_delete_own"
  on public.crm_followup_rules
  for delete
  using (auth.uid() = user_id);

create table if not exists public.crm_followup_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.crm_clients (id) on delete cascade,
  rule_id uuid references public.crm_followup_rules (id) on delete set null,
  title text not null,
  reason text,
  due_date date not null default current_date,
  status text not null default 'open' check (status in ('open', 'done', 'dismissed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists crm_followup_tasks_unique_daily
  on public.crm_followup_tasks (user_id, client_id, due_date, status)
  where status = 'open';

create index if not exists crm_followup_tasks_user_status_idx
  on public.crm_followup_tasks (user_id, status, due_date, created_at desc);

alter table public.crm_followup_tasks enable row level security;

drop policy if exists "crm_followup_tasks_read_own" on public.crm_followup_tasks;
create policy "crm_followup_tasks_read_own"
  on public.crm_followup_tasks
  for select
  using (auth.uid() = user_id);

drop policy if exists "crm_followup_tasks_insert_own" on public.crm_followup_tasks;
create policy "crm_followup_tasks_insert_own"
  on public.crm_followup_tasks
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "crm_followup_tasks_update_own" on public.crm_followup_tasks;
create policy "crm_followup_tasks_update_own"
  on public.crm_followup_tasks
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "crm_followup_tasks_delete_own" on public.crm_followup_tasks;
create policy "crm_followup_tasks_delete_own"
  on public.crm_followup_tasks
  for delete
  using (auth.uid() = user_id);

create or replace function public.generate_crm_followups_for_user(p_user_id uuid default auth.uid())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule record;
  v_inserted integer := 0;
begin
  if p_user_id is null then
    return 0;
  end if;

  insert into public.crm_followup_rules (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  select *
    into v_rule
  from public.crm_followup_rules
  where user_id = p_user_id
  limit 1;

  if v_rule is null or coalesce(v_rule.active, true) = false then
    return 0;
  end if;

  with latest_interaction as (
    select
      i.client_id,
      max(i.happened_at) as last_contact_at
    from public.crm_lead_interactions i
    where i.user_id = p_user_id
    group by i.client_id
  ),
  candidate as (
    select
      c.id as client_id,
      c.name,
      li.last_contact_at
    from public.crm_clients c
    left join latest_interaction li on li.client_id = c.id
    where c.user_id = p_user_id
      and c.stage = any(v_rule.stage_filter)
      and (
        li.last_contact_at is null
        or li.last_contact_at < now() - make_interval(days => v_rule.days_without_reply)
      )
  ),
  ins as (
    insert into public.crm_followup_tasks (
      user_id,
      client_id,
      rule_id,
      title,
      reason,
      due_date,
      status
    )
    select
      p_user_id,
      candidate.client_id,
      v_rule.id,
      'Retomar contato com ' || candidate.name,
      case
        when candidate.last_contact_at is null then 'Sem interação registrada'
        else 'Sem retorno recente'
      end,
      current_date,
      'open'
    from candidate
    where not exists (
      select 1
      from public.crm_followup_tasks t
      where t.user_id = p_user_id
        and t.client_id = candidate.client_id
        and t.status = 'open'
        and t.due_date = current_date
    )
    returning 1
  )
  select count(*) into v_inserted from ins;

  return coalesce(v_inserted, 0);
end;
$$;

grant execute on function public.generate_crm_followups_for_user(uuid) to authenticated;

create or replace function public.get_crm_funnel_metrics()
returns table (
  stage text,
  leads integer,
  avg_days_in_stage numeric,
  conversion_rate numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_total integer := 0;
  v_won integer := 0;
begin
  if v_user_id is null then
    return;
  end if;

  select count(*)::integer into v_total
  from public.crm_clients c
  where c.user_id = v_user_id;

  select count(*)::integer into v_won
  from public.crm_clients c
  where c.user_id = v_user_id
    and c.stage = 'cliente_fechado';

  return query
  select
    s.stage,
    coalesce(t.leads, 0)::integer as leads,
    coalesce(t.avg_days, 0)::numeric as avg_days_in_stage,
    case
      when v_total = 0 then 0::numeric
      else round((v_won::numeric / v_total::numeric) * 100, 2)
    end as conversion_rate
  from (
    values
      ('conhecendo_cliente'::text),
      ('analisando_orcamento'::text),
      ('assinatura_contrato'::text),
      ('cliente_fechado'::text),
      ('cliente_perdido'::text)
  ) as s(stage)
  left join (
    select
      c.stage,
      count(*)::integer as leads,
      avg(extract(epoch from (now() - c.created_at)) / 86400.0) as avg_days
    from public.crm_clients c
    where c.user_id = v_user_id
    group by c.stage
  ) t on t.stage = s.stage;
end;
$$;

grant execute on function public.get_crm_funnel_metrics() to authenticated;
