create table if not exists public.event_command_config (
  event_id uuid primary key references public.events (id) on delete cascade,
  lead_minutes integer[] not null default array[60, 30, 15],
  late_grace_minutes integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_command_alerts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  vendor_id uuid not null references public.event_vendors (id) on delete cascade,
  alert_type text not null check (
    alert_type in (
      'arrival_pre_alert',
      'arrival_late',
      'done_late'
    )
  ),
  severity text not null check (severity in ('info', 'warning', 'critical')),
  message text not null,
  dedupe_key text not null,
  triggered_for timestamptz,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index if not exists event_command_alerts_dedupe_key_key
  on public.event_command_alerts (dedupe_key);

create index if not exists event_command_alerts_event_id_idx
  on public.event_command_alerts (event_id, created_at desc);

alter table public.event_command_config enable row level security;
alter table public.event_command_alerts enable row level security;

drop policy if exists "event_command_config_read" on public.event_command_config;
create policy "event_command_config_read"
  on public.event_command_config
  for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.user_id = auth.uid()
    )
  );

drop policy if exists "event_command_config_write" on public.event_command_config;
create policy "event_command_config_write"
  on public.event_command_config
  for all
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.user_id = auth.uid()
    )
  );

drop policy if exists "event_command_alerts_read" on public.event_command_alerts;
create policy "event_command_alerts_read"
  on public.event_command_alerts
  for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.user_id = auth.uid()
    )
  );

drop policy if exists "event_command_alerts_write" on public.event_command_alerts;
create policy "event_command_alerts_write"
  on public.event_command_alerts
  for insert
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.user_id = auth.uid()
    )
  );
