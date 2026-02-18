-- Execute no Supabase SQL Editor.
-- This script adds anti-abuse helpers used by the telemetry-intake edge function.

create table if not exists public.telemetry_rate_limit_buckets (
  bucket_start timestamptz not null,
  rate_key text not null,
  hits integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (bucket_start, rate_key)
);

create index if not exists telemetry_rate_limit_buckets_created_at_idx
  on public.telemetry_rate_limit_buckets (created_at desc);

alter table public.telemetry_rate_limit_buckets enable row level security;

drop policy if exists "deny_all_select_telemetry_rate_limit_buckets"
  on public.telemetry_rate_limit_buckets;
drop policy if exists "deny_all_insert_telemetry_rate_limit_buckets"
  on public.telemetry_rate_limit_buckets;
drop policy if exists "deny_all_update_telemetry_rate_limit_buckets"
  on public.telemetry_rate_limit_buckets;
drop policy if exists "deny_all_delete_telemetry_rate_limit_buckets"
  on public.telemetry_rate_limit_buckets;

revoke all on public.telemetry_rate_limit_buckets from anon, authenticated;

drop function if exists public.check_telemetry_rate_limit(text, integer, integer);
create or replace function public.check_telemetry_rate_limit(
  p_rate_key text,
  p_limit integer default 20,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bucket_start timestamptz;
  v_hits integer;
begin
  if p_rate_key is null or btrim(p_rate_key) = '' then
    return false;
  end if;

  if p_limit <= 0 or p_window_seconds <= 0 then
    return false;
  end if;

  v_bucket_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.telemetry_rate_limit_buckets (bucket_start, rate_key, hits)
  values (v_bucket_start, p_rate_key, 1)
  on conflict (bucket_start, rate_key)
  do update set hits = public.telemetry_rate_limit_buckets.hits + 1
  returning hits into v_hits;

  delete from public.telemetry_rate_limit_buckets
  where bucket_start < now() - interval '1 day';

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.check_telemetry_rate_limit(text, integer, integer)
  from public;
grant execute on function public.check_telemetry_rate_limit(text, integer, integer)
  to anon, authenticated;

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
begin
  insert into public.telemetry_events (
    event_name,
    page,
    session_id,
    path,
    referrer,
    user_agent,
    metadata
  )
  values (
    left(coalesce(p_event_name, ''), 100),
    left(coalesce(p_page, ''), 100),
    left(coalesce(p_session_id, ''), 128),
    left(p_path, 500),
    left(p_referrer, 500),
    left(p_user_agent, 500),
    coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.ingest_telemetry_event(text, text, text, text, text, text, jsonb)
  from public;
grant execute on function public.ingest_telemetry_event(text, text, text, text, text, text, jsonb)
  to anon, authenticated;

