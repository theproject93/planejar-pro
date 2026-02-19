create index if not exists telemetry_events_event_created_idx
  on public.telemetry_events (event_name, created_at desc);

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
  v_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  with recent as (
    select *
    from public.telemetry_events
    where created_at >= v_from
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
      coalesce(nullif(metadata->>'path', ''), nullif(path, ''), nullif(page, ''), 'desconhecida') as screen,
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
      coalesce(nullif(metadata->>'path', ''), nullif(path, ''), 'sem_path') as path,
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
