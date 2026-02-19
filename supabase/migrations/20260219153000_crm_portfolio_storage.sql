insert into storage.buckets (id, name, public)
values ('crm-portfolios', 'crm-portfolios', true)
on conflict (id) do nothing;

drop policy if exists "crm_portfolios_public_read" on storage.objects;
create policy "crm_portfolios_public_read"
  on storage.objects
  for select
  using (bucket_id = 'crm-portfolios');

drop policy if exists "crm_portfolios_authenticated_insert" on storage.objects;
create policy "crm_portfolios_authenticated_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'crm-portfolios');

drop policy if exists "crm_portfolios_authenticated_update" on storage.objects;
create policy "crm_portfolios_authenticated_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'crm-portfolios')
  with check (bucket_id = 'crm-portfolios');

drop policy if exists "crm_portfolios_authenticated_delete" on storage.objects;
create policy "crm_portfolios_authenticated_delete"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'crm-portfolios');
