alter table public.telemetry_events
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists telemetry_events_user_created_idx
  on public.telemetry_events (user_id, created_at desc);

drop function if exists public.ingest_telemetry_event(text, text, text, text, text, text, jsonb);
create or replace function public.ingest_telemetry_event(
  p_event_name text,
  p_page text,
  p_session_id text,
  p_path text default null,
  p_referrer text default null,
  p_user_agent text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  insert into public.telemetry_events (
    event_name,
    page,
    session_id,
    path,
    referrer,
    user_agent,
    user_id,
    metadata
  )
  values (
    left(coalesce(p_event_name, ''), 100),
    left(coalesce(p_page, ''), 100),
    left(coalesce(p_session_id, ''), 128),
    left(p_path, 500),
    left(p_referrer, 500),
    left(p_user_agent, 500),
    v_user_id,
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.ingest_telemetry_event(text, text, text, text, text, text, jsonb)
  from public;
grant execute on function public.ingest_telemetry_event(text, text, text, text, text, text, jsonb)
  to anon, authenticated;

drop function if exists public.get_operational_health_dashboard(integer);
create or replace function public.get_operational_health_dashboard(
  p_window_days integer default 7
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_window_days, 7), 30));
  v_from timestamptz := now() - make_interval(days => v_days);
  v_user_id uuid := auth.uid();
  v_payload jsonb;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  with recent as (
    select
      event_name,
      page,
      session_id,
      path,
      metadata,
      created_at
    from public.telemetry_events
    where created_at >= v_from
      and user_id = v_user_id
  ),
  summary as (
    select
      count(*)::bigint as total_events,
      count(*) filter (where event_name = 'frontend_page_view')::bigint as page_views,
      count(*) filter (where event_name = 'frontend_rpc_error')::bigint as rpc_errors,
      count(*) filter (
        where event_name in ('frontend_error', 'frontend_unhandled_rejection')
      )::bigint as frontend_errors
    from recent
  ),
  top_errors as (
    select
      coalesce(
        nullif(
          case
            when coalesce(metadata->>'path', path, '') like '/assinatura/%' then '/assinatura/:token'
            when coalesce(metadata->>'path', path, '') like '/convite/%' then '/convite/:token'
            when coalesce(metadata->>'path', path, '') like '/torre/%' then '/torre/:token'
            when coalesce(metadata->>'path', path, '') like '/noivos/%' then '/noivos/:token'
            when coalesce(metadata->>'path', path, '') like '/portfolio/%' then '/portfolio/:token'
            else coalesce(metadata->>'path', path, '')
          end,
          ''
        ),
        nullif(page, ''),
        'desconhecida'
      ) as screen,
      count(*)::bigint as total
    from recent
    where event_name in ('frontend_error', 'frontend_unhandled_rejection')
    group by 1
    order by total desc
    limit 5
  ),
  top_rpc_failures as (
    select
      coalesce(nullif(page, ''), 'desconhecido') as scope,
      coalesce(nullif(metadata->>'action', ''), 'acao_desconhecida') as action,
      count(*)::bigint as total
    from recent
    where event_name = 'frontend_rpc_error'
    group by 1, 2
    order by total desc
    limit 10
  ),
  top_page_views as (
    select
      coalesce(
        nullif(
          case
            when coalesce(metadata->>'path', path, '') like '/assinatura/%' then '/assinatura/:token'
            when coalesce(metadata->>'path', path, '') like '/convite/%' then '/convite/:token'
            when coalesce(metadata->>'path', path, '') like '/torre/%' then '/torre/:token'
            when coalesce(metadata->>'path', path, '') like '/noivos/%' then '/noivos/:token'
            when coalesce(metadata->>'path', path, '') like '/portfolio/%' then '/portfolio/:token'
            else coalesce(metadata->>'path', path, '')
          end,
          ''
        ),
        'sem_path'
      ) as path,
      count(*)::bigint as total
    from recent
    where event_name = 'frontend_page_view'
    group by 1
    order by total desc
    limit 10
  )
  select jsonb_build_object(
    'window_days', v_days,
    'generated_at', now(),
    'summary', coalesce((select to_jsonb(s) from summary s), '{}'::jsonb),
    'top_errors_by_screen', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('screen', e.screen, 'count', e.total)
          order by e.total desc
        )
        from top_errors e
      ),
      '[]'::jsonb
    ),
    'top_rpc_failures', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('scope', r.scope, 'action', r.action, 'count', r.total)
          order by r.total desc
        )
        from top_rpc_failures r
      ),
      '[]'::jsonb
    ),
    'top_page_views', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('path', p.path, 'count', p.total)
          order by p.total desc
        )
        from top_page_views p
      ),
      '[]'::jsonb
    )
  ) into v_payload;

  return coalesce(v_payload, '{}'::jsonb);
end;
$$;

revoke all on function public.get_operational_health_dashboard(integer) from public;
grant execute on function public.get_operational_health_dashboard(integer) to authenticated;

drop policy if exists "couple_updates_public_insert" on storage.objects;
create policy "couple_updates_public_insert"
  on storage.objects
  for insert
  with check (
    bucket_id = 'couple-updates'
    and split_part(name, '/', 1) <> ''
    and exists (
      select 1
      from public.events e
      where e.couple_portal_token::text = split_part(name, '/', 1)
    )
  );

drop policy if exists "couple_updates_public_update" on storage.objects;
create policy "couple_updates_public_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'couple-updates'
    and split_part(name, '/', 1) <> ''
    and exists (
      select 1
      from public.events e
      where e.couple_portal_token::text = split_part(name, '/', 1)
        and e.user_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'couple-updates'
    and split_part(name, '/', 1) <> ''
    and exists (
      select 1
      from public.events e
      where e.couple_portal_token::text = split_part(name, '/', 1)
        and e.user_id = auth.uid()
    )
  );

drop policy if exists "couple_updates_public_delete" on storage.objects;
create policy "couple_updates_public_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'couple-updates'
    and split_part(name, '/', 1) <> ''
    and exists (
      select 1
      from public.events e
      where e.couple_portal_token::text = split_part(name, '/', 1)
        and e.user_id = auth.uid()
    )
  );

drop policy if exists "crm_portfolios_authenticated_insert" on storage.objects;
create policy "crm_portfolios_authenticated_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'crm-portfolios'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "crm_portfolios_authenticated_update" on storage.objects;
create policy "crm_portfolios_authenticated_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'crm-portfolios'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'crm-portfolios'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "crm_portfolios_authenticated_delete" on storage.objects;
create policy "crm_portfolios_authenticated_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'crm-portfolios'
    and split_part(name, '/', 1) = auth.uid()::text
  );
