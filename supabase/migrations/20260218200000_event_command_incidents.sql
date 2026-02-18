create extension if not exists pgcrypto;

create table if not exists public.event_command_incidents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  vendor_id uuid references public.event_vendors (id) on delete set null,
  severity text not null default 'warning' check (severity in ('warning', 'critical')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  title text not null,
  note text,
  action_plan text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);

create index if not exists event_command_incidents_event_idx
  on public.event_command_incidents (event_id, status, created_at desc);

create index if not exists event_command_incidents_vendor_idx
  on public.event_command_incidents (vendor_id);

alter table public.event_command_incidents enable row level security;

drop policy if exists "event_command_incidents_read" on public.event_command_incidents;
create policy "event_command_incidents_read"
  on public.event_command_incidents
  for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.user_id = auth.uid()
    )
  );

drop policy if exists "event_command_incidents_insert" on public.event_command_incidents;
create policy "event_command_incidents_insert"
  on public.event_command_incidents
  for insert
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.user_id = auth.uid()
    )
  );

drop policy if exists "event_command_incidents_update" on public.event_command_incidents;
create policy "event_command_incidents_update"
  on public.event_command_incidents
  for update
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