create table if not exists public.user_ui_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  event_sidebar_order text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_ui_preferences_updated_idx
  on public.user_ui_preferences (updated_at desc);

alter table public.user_ui_preferences enable row level security;

drop policy if exists "user_ui_preferences_read" on public.user_ui_preferences;
create policy "user_ui_preferences_read"
  on public.user_ui_preferences
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_ui_preferences_write" on public.user_ui_preferences;
create policy "user_ui_preferences_write"
  on public.user_ui_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);