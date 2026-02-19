create table if not exists public.crm_consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.crm_clients (id) on delete cascade,
  lawful_basis text not null default 'consentimento' check (
    lawful_basis in ('consentimento', 'execucao_contrato', 'legitimo_interesse', 'anonimizacao_solicitada')
  ),
  consent_text_version text not null default 'v1',
  consent_note text,
  source text not null default 'manual' check (source in ('manual', 'formulario', 'whatsapp', 'email', 'sistema')),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists crm_consent_records_client_idx
  on public.crm_consent_records (client_id, consented_at desc);

create index if not exists crm_consent_records_user_idx
  on public.crm_consent_records (user_id, consented_at desc);

alter table public.crm_consent_records enable row level security;

drop policy if exists "crm_consent_records_read_own" on public.crm_consent_records;
create policy "crm_consent_records_read_own"
  on public.crm_consent_records
  for select
  using (auth.uid() = user_id);

drop policy if exists "crm_consent_records_insert_own" on public.crm_consent_records;
create policy "crm_consent_records_insert_own"
  on public.crm_consent_records
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "crm_consent_records_update_own" on public.crm_consent_records;
create policy "crm_consent_records_update_own"
  on public.crm_consent_records
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "crm_consent_records_delete_own" on public.crm_consent_records;
create policy "crm_consent_records_delete_own"
  on public.crm_consent_records
  for delete
  using (auth.uid() = user_id);

create or replace function public.export_crm_client_data(p_client_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_client jsonb;
  v_people jsonb;
  v_addresses jsonb;
  v_contract jsonb;
  v_interactions jsonb;
  v_consent jsonb;
  v_docs jsonb;
begin
  if v_user_id is null then
    raise exception 'unauthorized';
  end if;

  if not exists (
    select 1
    from public.crm_clients c
    where c.id = p_client_id
      and c.user_id = v_user_id
  ) then
    raise exception 'client_not_found_or_forbidden';
  end if;

  select to_jsonb(c.*) into v_client
  from public.crm_clients c
  where c.id = p_client_id;

  select coalesce(jsonb_agg(to_jsonb(p.*)), '[]'::jsonb) into v_people
  from public.crm_client_people p
  where p.client_id = p_client_id and p.user_id = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(a.*)), '[]'::jsonb) into v_addresses
  from public.crm_client_addresses a
  where a.client_id = p_client_id and a.user_id = v_user_id;

  select coalesce(to_jsonb(cd.*), '{}'::jsonb) into v_contract
  from public.crm_contract_data cd
  where cd.client_id = p_client_id and cd.user_id = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(i.*)), '[]'::jsonb) into v_interactions
  from public.crm_lead_interactions i
  where i.client_id = p_client_id and i.user_id = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(cr.*)), '[]'::jsonb) into v_consent
  from public.crm_consent_records cr
  where cr.client_id = p_client_id and cr.user_id = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(d.*)), '[]'::jsonb) into v_docs
  from public.crm_client_documents d
  where d.client_id = p_client_id and d.user_id = v_user_id;

  return jsonb_build_object(
    'exported_at', now(),
    'client', coalesce(v_client, '{}'::jsonb),
    'people', coalesce(v_people, '[]'::jsonb),
    'addresses', coalesce(v_addresses, '[]'::jsonb),
    'contract_data', coalesce(v_contract, '{}'::jsonb),
    'interactions', coalesce(v_interactions, '[]'::jsonb),
    'consent_records', coalesce(v_consent, '[]'::jsonb),
    'documents', coalesce(v_docs, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.export_crm_client_data(uuid) to authenticated;

create or replace function public.anonymize_crm_client_data(
  p_client_id uuid,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return false;
  end if;

  if not exists (
    select 1
    from public.crm_clients c
    where c.id = p_client_id
      and c.user_id = v_user_id
  ) then
    return false;
  end if;

  update public.crm_clients
  set
    name = 'Cliente anonimizado',
    email = null,
    phone = null,
    notes = coalesce(notes, '') || E'\n[ANONIMIZADO] ' || coalesce(p_reason, 'solicitacao LGPD'),
    updated_at = now()
  where id = p_client_id
    and user_id = v_user_id;

  update public.crm_client_people
  set
    full_name = null,
    email = null,
    phone = null,
    cpf = null,
    rg = null,
    birth_date = null,
    nationality = null,
    civil_status = null,
    profession = null,
    updated_at = now()
  where client_id = p_client_id
    and user_id = v_user_id;

  update public.crm_client_addresses
  set
    street = null,
    number = null,
    complement = null,
    neighborhood = null,
    city = null,
    state = null,
    zip = null,
    updated_at = now()
  where client_id = p_client_id
    and user_id = v_user_id;

  update public.crm_client_documents
  set
    content = '[ANONIMIZADO LGPD]',
    updated_at = now()
  where client_id = p_client_id
    and user_id = v_user_id;

  update public.crm_lead_interactions
  set
    summary = '[ANONIMIZADO LGPD]'
  where client_id = p_client_id
    and user_id = v_user_id;

  update public.crm_signature_requests
  set
    client_name = 'Cliente anonimizado',
    client_email = null,
    signer_name = null,
    signer_email = null,
    updated_at = now()
  where client_id = p_client_id
    and user_id = v_user_id;

  insert into public.crm_consent_records (
    user_id,
    client_id,
    lawful_basis,
    consent_text_version,
    consent_note,
    source
  )
  values (
    v_user_id,
    p_client_id,
    'anonimizacao_solicitada',
    'v1',
    coalesce(p_reason, 'Solicitacao de anonimizacao'),
    'sistema'
  );

  return true;
end;
$$;

grant execute on function public.anonymize_crm_client_data(uuid, text) to authenticated;
