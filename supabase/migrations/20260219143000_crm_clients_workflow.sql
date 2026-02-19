create table if not exists public.crm_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  stage text not null default 'conhecendo_cliente' check (
    stage in (
      'conhecendo_cliente',
      'analisando_orcamento',
      'assinatura_contrato',
      'cliente_fechado',
      'cliente_perdido'
    )
  ),
  event_type text,
  event_date_expected date,
  budget_expected numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_clients_user_stage_idx
  on public.crm_clients (user_id, stage, updated_at desc);

alter table public.crm_clients enable row level security;

drop policy if exists "crm_clients_read_own" on public.crm_clients;
create policy "crm_clients_read_own"
  on public.crm_clients
  for select
  using (auth.uid() = user_id);

drop policy if exists "crm_clients_insert_own" on public.crm_clients;
create policy "crm_clients_insert_own"
  on public.crm_clients
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "crm_clients_update_own" on public.crm_clients;
create policy "crm_clients_update_own"
  on public.crm_clients
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "crm_clients_delete_own" on public.crm_clients;
create policy "crm_clients_delete_own"
  on public.crm_clients
  for delete
  using (auth.uid() = user_id);

create table if not exists public.crm_client_checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.crm_clients (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_client_checklist_items_client_idx
  on public.crm_client_checklist_items (client_id, position, created_at);

alter table public.crm_client_checklist_items enable row level security;

drop policy if exists "crm_client_checklist_read_own" on public.crm_client_checklist_items;
create policy "crm_client_checklist_read_own"
  on public.crm_client_checklist_items
  for select
  using (auth.uid() = user_id);

drop policy if exists "crm_client_checklist_insert_own" on public.crm_client_checklist_items;
create policy "crm_client_checklist_insert_own"
  on public.crm_client_checklist_items
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "crm_client_checklist_update_own" on public.crm_client_checklist_items;
create policy "crm_client_checklist_update_own"
  on public.crm_client_checklist_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "crm_client_checklist_delete_own" on public.crm_client_checklist_items;
create policy "crm_client_checklist_delete_own"
  on public.crm_client_checklist_items
  for delete
  using (auth.uid() = user_id);

create table if not exists public.crm_client_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.crm_clients (id) on delete cascade,
  doc_type text not null check (doc_type in ('budget', 'contract')),
  title text not null,
  content text not null default '',
  status text not null default 'draft' check (
    status in ('draft', 'pending_signature', 'signed')
  ),
  pdf_file_url text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, doc_type)
);

create index if not exists crm_client_documents_client_idx
  on public.crm_client_documents (client_id, doc_type, updated_at desc);

alter table public.crm_client_documents enable row level security;

drop policy if exists "crm_client_documents_read_own" on public.crm_client_documents;
create policy "crm_client_documents_read_own"
  on public.crm_client_documents
  for select
  using (auth.uid() = user_id);

drop policy if exists "crm_client_documents_insert_own" on public.crm_client_documents;
create policy "crm_client_documents_insert_own"
  on public.crm_client_documents
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "crm_client_documents_update_own" on public.crm_client_documents;
create policy "crm_client_documents_update_own"
  on public.crm_client_documents
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "crm_client_documents_delete_own" on public.crm_client_documents;
create policy "crm_client_documents_delete_own"
  on public.crm_client_documents
  for delete
  using (auth.uid() = user_id);

create table if not exists public.crm_signature_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.crm_clients (id) on delete cascade,
  document_id uuid not null references public.crm_client_documents (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  client_name text not null,
  client_email text,
  status text not null default 'pending' check (status in ('pending', 'signed', 'expired', 'cancelled')),
  expires_at timestamptz,
  signer_name text,
  signer_email text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_signature_requests_client_idx
  on public.crm_signature_requests (client_id, status, created_at desc);

alter table public.crm_signature_requests enable row level security;

drop policy if exists "crm_signature_requests_read_own" on public.crm_signature_requests;
create policy "crm_signature_requests_read_own"
  on public.crm_signature_requests
  for select
  using (auth.uid() = user_id);

drop policy if exists "crm_signature_requests_insert_own" on public.crm_signature_requests;
create policy "crm_signature_requests_insert_own"
  on public.crm_signature_requests
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "crm_signature_requests_update_own" on public.crm_signature_requests;
create policy "crm_signature_requests_update_own"
  on public.crm_signature_requests
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "crm_signature_requests_delete_own" on public.crm_signature_requests;
create policy "crm_signature_requests_delete_own"
  on public.crm_signature_requests
  for delete
  using (auth.uid() = user_id);

create or replace function public.get_signature_request_by_token(p_token uuid)
returns table (
  request_id uuid,
  client_name text,
  client_email text,
  document_title text,
  document_content text,
  status text,
  expires_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    r.id as request_id,
    r.client_name,
    r.client_email,
    d.title as document_title,
    d.content as document_content,
    r.status,
    r.expires_at
  from public.crm_signature_requests r
  join public.crm_client_documents d on d.id = r.document_id
  where r.token = p_token
    and r.status = 'pending'
    and (r.expires_at is null or r.expires_at > now())
  limit 1;
$$;

grant execute on function public.get_signature_request_by_token(uuid) to anon, authenticated;

create or replace function public.sign_signature_request_by_token(
  p_token uuid,
  p_signer_name text,
  p_signer_email text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document_id uuid;
begin
  update public.crm_signature_requests r
  set
    status = 'signed',
    signer_name = nullif(trim(p_signer_name), ''),
    signer_email = nullif(trim(p_signer_email), ''),
    signed_at = now(),
    updated_at = now()
  where r.token = p_token
    and r.status = 'pending'
    and (r.expires_at is null or r.expires_at > now())
  returning r.document_id into v_document_id;

  if v_document_id is null then
    return false;
  end if;

  update public.crm_client_documents
  set
    status = 'signed',
    signed_at = now(),
    updated_at = now()
  where id = v_document_id;

  return true;
end;
$$;

grant execute on function public.sign_signature_request_by_token(uuid, text, text) to anon, authenticated;
