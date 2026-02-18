alter table public.event_vendors
  add column if not exists expected_arrival_time time,
  add column if not exists expected_done_time time;
