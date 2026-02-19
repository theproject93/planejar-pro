create or replace function public.get_crm_pipeline_forecast()
returns table (
  stage text,
  leads bigint,
  total_budget numeric,
  weighted_budget numeric,
  win_rate numeric
)
language sql
security definer
set search_path = public
as $$
  with base as (
    select
      c.stage,
      count(*)::bigint as leads,
      coalesce(sum(coalesce(cd.total_value, c.budget_expected, 0)), 0)::numeric as total_budget
    from public.crm_clients c
    left join public.crm_contract_data cd
      on cd.client_id = c.id
      and cd.user_id = c.user_id
    where c.user_id = auth.uid()
    group by c.stage
  ),
  rates as (
    select 'conhecendo_cliente'::text as stage, 0.20::numeric as win_rate
    union all select 'analisando_orcamento'::text, 0.45::numeric
    union all select 'assinatura_contrato'::text, 0.75::numeric
    union all select 'cliente_fechado'::text, 1.00::numeric
    union all select 'cliente_perdido'::text, 0.00::numeric
  )
  select
    r.stage,
    coalesce(b.leads, 0)::bigint as leads,
    coalesce(b.total_budget, 0)::numeric as total_budget,
    (coalesce(b.total_budget, 0) * r.win_rate)::numeric as weighted_budget,
    r.win_rate::numeric
  from rates r
  left join base b on b.stage = r.stage
  order by case r.stage
    when 'conhecendo_cliente' then 1
    when 'analisando_orcamento' then 2
    when 'assinatura_contrato' then 3
    when 'cliente_fechado' then 4
    when 'cliente_perdido' then 5
    else 99
  end;
$$;

grant execute on function public.get_crm_pipeline_forecast() to authenticated;

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
  with active_clients as (
    select
      c.id,
      c.name,
      c.stage
    from public.crm_clients c
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
          when 'conhecendo_cliente' then 40
          when 'analisando_orcamento' then 60
          when 'assinatura_contrato' then 75
          else 10
        end
        + case when coalesce(f.has_overdue, false) then 30 else 0 end
        + case when coalesce(s.old_pending_signature, false) then 20 else 0 end
        + case
            when il.last_interaction_at is null or il.last_interaction_at < now() - interval '7 days' then 15
            else 0
          end
        + case
            when c.stage = 'analisando_orcamento' and coalesce(cm.is_missing, false) then 10
            else 0
          end
      )::integer as priority_score,
      case
        when coalesce(f.has_overdue, false) then 'Follow-up atrasado'
        when coalesce(s.old_pending_signature, false) then 'Assinatura pendente ha mais de 3 dias'
        when il.last_interaction_at is null or il.last_interaction_at < now() - interval '7 days' then 'Sem interacao recente'
        when c.stage = 'analisando_orcamento' and coalesce(cm.is_missing, false) then 'Sem registro de consentimento'
        else 'Acompanhamento regular'
      end as priority_reason,
      case
        when coalesce(f.has_overdue, false) then 'Entrar em contato hoje'
        when coalesce(s.old_pending_signature, false) then 'Cobrar assinatura do contrato'
        when il.last_interaction_at is null or il.last_interaction_at < now() - interval '7 days' then 'Registrar nova interacao'
        when c.stage = 'analisando_orcamento' and coalesce(cm.is_missing, false) then 'Registrar consentimento LGPD'
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

grant execute on function public.get_crm_priority_queue(integer) to authenticated;
