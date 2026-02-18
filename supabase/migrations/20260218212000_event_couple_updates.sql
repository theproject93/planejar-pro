create extension if not exists pgcrypto;

create table if not exists public.event_couple_updates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null default 'info' check (kind in ('info', 'milestone', 'celebration')),
  title text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists event_couple_updates_event_idx
  on public.event_couple_updates (event_id, created_at desc);

alter table public.event_couple_updates enable row level security;

drop policy if exists "event_couple_updates_read" on public.event_couple_updates;
create policy "event_couple_updates_read"
  on public.event_couple_updates
  for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.user_id = auth.uid()
    )
  );

drop policy if exists "event_couple_updates_write" on public.event_couple_updates;
create policy "event_couple_updates_write"
  on public.event_couple_updates
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