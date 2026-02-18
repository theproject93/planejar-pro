create table if not exists public.telemetry_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  event_name text not null,
  page text not null,
  session_id text not null,
  path text,
  referrer text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists telemetry_events_created_at_idx
  on public.telemetry_events (created_at desc);

create index if not exists telemetry_events_event_name_idx
  on public.telemetry_events (event_name);

create index if not exists telemetry_events_session_id_idx
  on public.telemetry_events (session_id);

alter table public.telemetry_events enable row level security;

drop policy if exists "public_can_insert_telemetry_events" on public.telemetry_events;
drop policy if exists "anon_can_insert_telemetry_events" on public.telemetry_events;
drop policy if exists "authenticated_can_insert_telemetry_events" on public.telemetry_events;
revoke insert on table public.telemetry_events from anon, authenticated;

drop policy if exists "authenticated_can_read_telemetry_events" on public.telemetry_events;
drop policy if exists "anon_can_read_telemetry_events" on public.telemetry_events;

