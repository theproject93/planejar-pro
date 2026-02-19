create table if not exists public.crm_priority_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  weight_key text not null,
  weight_value integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, weight_key),
  check (
    weight_key in (
      'base_conhecendo',
      'base_orcamento',
      'base_assinatura',
      'overdue_followup',
      'old_pending_signature',
      'stale_interaction',
      'missing_consent',
      'event_type_casamento',
      'event_type_corporativo',
      'event_type_debutante',
      'event_type_aniversario',
      'ticket_ge_30000',
      'ticket_ge_60000'
    )
  )
);

create index if not exists crm_priority_weights_user_idx
  on public.crm_priority_weights (user_id, weight_key);

alter table public.crm_priority_weights enable row level security;

drop policy if exists "crm_priority_weights_read_own" on public.crm_priority_weights;
create policy "crm_priority_weights_read_own"
  on public.crm_priority_weights
  for select
  using (auth.uid() = user_id);

drop policy if exists "crm_priority_weights_insert_own" on public.crm_priority_weights;
create policy "crm_priority_weights_insert_own"
  on public.crm_priority_weights
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "crm_priority_weights_update_own" on public.crm_priority_weights;
create policy "crm_priority_weights_update_own"
  on public.crm_priority_weights
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "crm_priority_weights_delete_own" on public.crm_priority_weights;
create policy "crm_priority_weights_delete_own"
  on public.crm_priority_weights
  for delete
  using (auth.uid() = user_id);

create or replace function public.get_crm_priority_weights()
returns table (
  weight_key text,
  label text,
  weight_value integer,
  default_value integer
)
language sql
security definer
set search_path = public
as $$
  with defaults as (
    select 'base_conhecendo'::text as weight_key, 'Base: Conhecendo cliente'::text as label, 35::integer as default_value
    union all select 'base_orcamento', 'Base: Analisando orcamento', 62
    union all select 'base_assinatura', 'Base: Assinatura de contrato', 80
    union all select 'overdue_followup', 'Bonus: Follow-up atrasado', 28
    union all select 'old_pending_signature', 'Bonus: Assinatura pendente > 3 dias', 22
    union all select 'stale_interaction', 'Bonus: Sem interacao recente', 14
    union all select 'missing_consent', 'Bonus: Orcamento sem consentimento', 10
    union all select 'event_type_casamento', 'Bonus: Tipo casamento', 8
    union all select 'event_type_corporativo', 'Bonus: Tipo corporativo', 6
    union all select 'event_type_debutante', 'Bonus: Tipo debutante', 4
    union all select 'event_type_aniversario', 'Bonus: Tipo aniversario', 3
    union all select 'ticket_ge_30000', 'Bonus: Ticket >= 30k', 4
    union all select 'ticket_ge_60000', 'Bonus: Ticket >= 60k', 8
  )
  select
    d.weight_key,
    d.label,
    coalesce(w.weight_value, d.default_value) as weight_value,
    d.default_value
  from defaults d
  left join public.crm_priority_weights w
    on w.user_id = auth.uid()
    and w.weight_key = d.weight_key
  order by d.weight_key;
$$;

grant execute on function public.get_crm_priority_weights() to authenticated;

create or replace function public.get_crm_priority_queue(p_limit integer default 8)
returns table (
  client_id uuid,
  client_name text,
  stage text,
  priority_score integer,
  priority_reason text,
  next_action text,
  due_date date
)
language sql
security definer
set search_path = public
as $$
  with defaults as (
    select 'base_conhecendo'::text as weight_key, 35::integer as default_value
    union all select 'base_orcamento', 62
    union all select 'base_assinatura', 80
    union all select 'overdue_followup', 28
    union all select 'old_pending_signature', 22
    union all select 'stale_interaction', 14
    union all select 'missing_consent', 10
    union all select 'event_type_casamento', 8
    union all select 'event_type_corporativo', 6
    union all select 'event_type_debutante', 4
    union all select 'event_type_aniversario', 3
    union all select 'ticket_ge_30000', 4
    union all select 'ticket_ge_60000', 8
  ),
  weights as (
    select
      d.weight_key,
      coalesce(w.weight_value, d.default_value) as value
    from defaults d
    left join public.crm_priority_weights w
      on w.user_id = auth.uid()
      and w.weight_key = d.weight_key
  ),
  active_clients as (
    select
      c.id,
      c.name,
      c.stage,
      lower(coalesce(c.event_type, '')) as event_type,
      coalesce(cd.total_value, c.budget_expected, 0) as total_value
    from public.crm_clients c
    left join public.crm_contract_data cd
      on cd.client_id = c.id
      and cd.user_id = c.user_id
    where c.user_id = auth.uid()
      and c.stage in ('conhecendo_cliente', 'analisando_orcamento', 'assinatura_contrato')
  ),
  interaction_last as (
    select
      i.client_id,
      max(i.happened_at) as last_interaction_at
    from public.crm_lead_interactions i
    where i.user_id = auth.uid()
    group by i.client_id
  ),
  followup_open as (
    select
      t.client_id,
      min(t.due_date) as next_due_date,
      bool_or(t.due_date < current_date) as has_overdue
    from public.crm_followup_tasks t
    where t.user_id = auth.uid()
      and t.status = 'open'
    group by t.client_id
  ),
  signature_pending as (
    select
      r.client_id,
      bool_or(r.created_at < now() - interval '3 days') as old_pending_signature
    from public.crm_signature_requests r
    where r.user_id = auth.uid()
      and r.status = 'pending'
    group by r.client_id
  ),
  consent_missing as (
    select
      c.id as client_id,
      not exists (
        select 1
        from public.crm_consent_records cr
        where cr.user_id = auth.uid()
          and cr.client_id = c.id
      ) as is_missing
    from active_clients c
  ),
  scored as (
    select
      c.id as client_id,
      c.name as client_name,
      c.stage,
      (
        case c.stage
          when 'conhecendo_cliente' then (select value from weights where weight_key = 'base_conhecendo')
          when 'analisando_orcamento' then (select value from weights where weight_key = 'base_orcamento')
          when 'assinatura_contrato' then (select value from weights where weight_key = 'base_assinatura')
          else 10
        end
        + case when coalesce(f.has_overdue, false) then (select value from weights where weight_key = 'overdue_followup') else 0 end
        + case when coalesce(s.old_pending_signature, false) then (select value from weights where weight_key = 'old_pending_signature') else 0 end
        + case
            when il.last_interaction_at is null or il.last_interaction_at < now() - interval '7 days'
              then (select value from weights where weight_key = 'stale_interaction')
            else 0
          end
        + case
            when c.stage = 'analisando_orcamento' and coalesce(cm.is_missing, false)
              then (select value from weights where weight_key = 'missing_consent')
            else 0
          end
        + case
            when c.event_type = 'casamento' then (select value from weights where weight_key = 'event_type_casamento')
            when c.event_type = 'corporativo' then (select value from weights where weight_key = 'event_type_corporativo')
            when c.event_type = 'debutante' then (select value from weights where weight_key = 'event_type_debutante')
            when c.event_type = 'aniversario' then (select value from weights where weight_key = 'event_type_aniversario')
            else 0
          end
        + case
            when coalesce(c.total_value, 0) >= 60000 then (select value from weights where weight_key = 'ticket_ge_60000')
            when coalesce(c.total_value, 0) >= 30000 then (select value from weights where weight_key = 'ticket_ge_30000')
            else 0
          end
      )::integer as priority_score,
      case
        when coalesce(f.has_overdue, false) then 'Follow-up atrasado'
        when coalesce(s.old_pending_signature, false) then 'Assinatura pendente ha mais de 3 dias'
        when il.last_interaction_at is null or il.last_interaction_at < now() - interval '7 days' then 'Sem interacao recente'
        when c.stage = 'analisando_orcamento' and coalesce(cm.is_missing, false) then 'Sem registro de consentimento'
        when c.event_type = 'casamento' and c.stage = 'assinatura_contrato' then 'Lead casamento perto do fechamento'
        when c.event_type = 'corporativo' and c.stage = 'analisando_orcamento' then 'Proposta corporativa em validacao'
        else 'Acompanhamento regular'
      end as priority_reason,
      case
        when coalesce(f.has_overdue, false) then 'Entrar em contato hoje'
        when coalesce(s.old_pending_signature, false) then 'Cobrar assinatura do contrato'
        when il.last_interaction_at is null or il.last_interaction_at < now() - interval '7 days' then 'Registrar nova interacao'
        when c.stage = 'analisando_orcamento' and coalesce(cm.is_missing, false) then 'Registrar consentimento LGPD'
        when c.event_type = 'casamento' and c.stage = 'assinatura_contrato' then 'Priorizar fechamento do casal esta semana'
        when c.event_type = 'corporativo' and c.stage = 'analisando_orcamento' then 'Agendar reuniao executiva de proposta'
        else 'Manter cadencia semanal'
      end as next_action,
      f.next_due_date as due_date
    from active_clients c
    left join interaction_last il on il.client_id = c.id
    left join followup_open f on f.client_id = c.id
    left join signature_pending s on s.client_id = c.id
    left join consent_missing cm on cm.client_id = c.id
  )
  select
    s.client_id,
    s.client_name,
    s.stage,
    s.priority_score,
    s.priority_reason,
    s.next_action,
    s.due_date
  from scored s
  order by s.priority_score desc, s.client_name asc
  limit greatest(coalesce(p_limit, 8), 1);
$$;
