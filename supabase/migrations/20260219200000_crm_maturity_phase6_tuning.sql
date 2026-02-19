alter table public.crm_stage_playbook_steps
  add column if not exists event_type text;

create index if not exists crm_stage_playbook_steps_event_type_idx
  on public.crm_stage_playbook_steps (user_id, event_type, stage, active);

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

  insert into public.crm_stage_playbook_steps (
    user_id,
    event_type,
    stage,
    title,
    reason,
    due_offset_days
  )
  values
    (v_user_id, null, 'conhecendo_cliente', 'Enviar mensagem inicial de alinhamento', 'Primeiro contato apos captura do lead', 0),
    (v_user_id, null, 'conhecendo_cliente', 'Agendar reuniao de descoberta', 'Mapear contexto e necessidades', 2),
    (v_user_id, null, 'analisando_orcamento', 'Enviar proposta comercial', 'Converter lead para proposta objetiva', 0),
    (v_user_id, null, 'analisando_orcamento', 'Fazer follow-up da proposta', 'Evitar esfriamento da negociacao', 3),
    (v_user_id, null, 'assinatura_contrato', 'Reforcar urgencia da assinatura', 'Pendencia contratual em aberto', 1),
    (v_user_id, null, 'assinatura_contrato', 'Confirmar recebimento do link de assinatura', 'Garantir avancao para cliente fechado', 3),

    (v_user_id, 'casamento', 'conhecendo_cliente', 'Solicitar briefing completo do casal', 'Coletar visao, estilo e prioridades do casamento', 1),
    (v_user_id, 'casamento', 'analisando_orcamento', 'Apresentar proposta com cenarios A/B', 'Facilitar decisao por faixa de investimento', 1),
    (v_user_id, 'casamento', 'assinatura_contrato', 'Alinhar minuta final com dados civis', 'Preparar contrato para assinatura sem retrabalho', 0),

    (v_user_id, 'debutante', 'conhecendo_cliente', 'Mapear expectativas da debutante e familia', 'Alinhamento de estilo, rituais e protocolo', 1),
    (v_user_id, 'debutante', 'analisando_orcamento', 'Propor pacote com opcoes de cerimonial', 'Aumentar percepcao de valor do servico', 2),
    (v_user_id, 'debutante', 'assinatura_contrato', 'Confirmar aprovacao dos responsaveis legais', 'Evitar atraso na formalizacao', 1),

    (v_user_id, 'corporativo', 'conhecendo_cliente', 'Mapear objetivos de negocio e KPIs', 'Garantir proposta orientada a resultado', 1),
    (v_user_id, 'corporativo', 'analisando_orcamento', 'Enviar proposta com escopo executivo', 'Acelerar validacao interna do cliente', 1),
    (v_user_id, 'corporativo', 'assinatura_contrato', 'Validar fluxo juridico e aprovadores', 'Evitar gargalo em procurement/juridico', 0),

    (v_user_id, 'aniversario', 'conhecendo_cliente', 'Mapear perfil da comemoracao', 'Definir formato e experiencia esperada', 1),
    (v_user_id, 'aniversario', 'analisando_orcamento', 'Enviar proposta objetiva com upgrades', 'Aumentar ticket medio da festa', 2),
    (v_user_id, 'aniversario', 'assinatura_contrato', 'Confirmar condicoes finais e sinal', 'Fechar contratacao rapidamente', 1)
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  return coalesce(v_inserted, 0);
end;
$$;

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

  with per_client as (
    select
      c.id as client_id,
      c.name as client_name,
      c.stage,
      c.event_type,
      coalesce(c.stage_changed_at, c.updated_at, c.created_at) as stage_base_at,
      exists (
        select 1
        from public.crm_stage_playbook_steps ps
        where ps.user_id = c.user_id
          and ps.stage = c.stage
          and ps.active = true
          and ps.event_type is not null
          and lower(ps.event_type) = lower(coalesce(c.event_type, ''))
      ) as has_specific
    from public.crm_clients c
    where c.user_id = v_user_id
      and c.stage in ('conhecendo_cliente', 'analisando_orcamento', 'assinatura_contrato')
  ),
  candidates as (
    select
      pc.client_id,
      pc.client_name,
      pc.stage,
      ps.id as playbook_step_id,
      ps.title,
      ps.reason,
      ps.due_offset_days,
      (pc.stage_base_at::date + ps.due_offset_days) as due_date
    from per_client pc
    join public.crm_stage_playbook_steps ps
      on ps.user_id = v_user_id
      and ps.stage = pc.stage
      and ps.active = true
      and (
        (pc.has_specific = true and ps.event_type is not null and lower(ps.event_type) = lower(coalesce(pc.event_type, '')))
        or (pc.has_specific = false and ps.event_type is null)
      )
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
          when 'conhecendo_cliente' then 35
          when 'analisando_orcamento' then 62
          when 'assinatura_contrato' then 80
          else 10
        end
        + case when coalesce(f.has_overdue, false) then 28 else 0 end
        + case when coalesce(s.old_pending_signature, false) then 22 else 0 end
        + case
            when il.last_interaction_at is null or il.last_interaction_at < now() - interval '7 days' then 14
            else 0
          end
        + case
            when c.stage = 'analisando_orcamento' and coalesce(cm.is_missing, false) then 10
            else 0
          end
        + case
            when c.event_type = 'casamento' then 8
            when c.event_type = 'corporativo' then 6
            when c.event_type = 'debutante' then 4
            when c.event_type = 'aniversario' then 3
            else 0
          end
        + case
            when coalesce(c.total_value, 0) >= 60000 then 8
            when coalesce(c.total_value, 0) >= 30000 then 4
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
