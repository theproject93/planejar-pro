create table if not exists public.crm_client_people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.crm_clients (id) on delete cascade,
  role_label text not null default 'contato_principal',
  full_name text,
  email text,
  phone text,
  cpf text,
  rg text,
  birth_date date,
  nationality text,
  civil_status text,
  profession text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_client_people_client_idx
  on public.crm_client_people (client_id, role_label, created_at);

alter table public.crm_client_people enable row level security;

drop policy if exists "crm_client_people_read_own" on public.crm_client_people;
create policy "crm_client_people_read_own"
  on public.crm_client_people
  for select
  using (auth.uid() = user_id);

drop policy if exists "crm_client_people_insert_own" on public.crm_client_people;
create policy "crm_client_people_insert_own"
  on public.crm_client_people
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "crm_client_people_update_own" on public.crm_client_people;
create policy "crm_client_people_update_own"
  on public.crm_client_people
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "crm_client_people_delete_own" on public.crm_client_people;
create policy "crm_client_people_delete_own"
  on public.crm_client_people
  for delete
  using (auth.uid() = user_id);

create table if not exists public.crm_client_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.crm_clients (id) on delete cascade,
  person_id uuid references public.crm_client_people (id) on delete set null,
  label text not null default 'principal',
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  zip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_client_addresses_client_idx
  on public.crm_client_addresses (client_id, label, created_at);

alter table public.crm_client_addresses enable row level security;

drop policy if exists "crm_client_addresses_read_own" on public.crm_client_addresses;
create policy "crm_client_addresses_read_own"
  on public.crm_client_addresses
  for select
  using (auth.uid() = user_id);

drop policy if exists "crm_client_addresses_insert_own" on public.crm_client_addresses;
create policy "crm_client_addresses_insert_own"
  on public.crm_client_addresses
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "crm_client_addresses_update_own" on public.crm_client_addresses;
create policy "crm_client_addresses_update_own"
  on public.crm_client_addresses
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "crm_client_addresses_delete_own" on public.crm_client_addresses;
create policy "crm_client_addresses_delete_own"
  on public.crm_client_addresses
  for delete
  using (auth.uid() = user_id);

create table if not exists public.crm_contract_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null unique references public.crm_clients (id) on delete cascade,
  total_value numeric(12,2),
  currency text not null default 'BRL',
  service_scope text,
  payment_terms text,
  cancellation_terms text,
  foro_city text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_contract_data_client_idx
  on public.crm_contract_data (client_id, updated_at desc);

alter table public.crm_contract_data enable row level security;

drop policy if exists "crm_contract_data_read_own" on public.crm_contract_data;
create policy "crm_contract_data_read_own"
  on public.crm_contract_data
  for select
  using (auth.uid() = user_id);

drop policy if exists "crm_contract_data_insert_own" on public.crm_contract_data;
create policy "crm_contract_data_insert_own"
  on public.crm_contract_data
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "crm_contract_data_update_own" on public.crm_contract_data;
create policy "crm_contract_data_update_own"
  on public.crm_contract_data
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "crm_contract_data_delete_own" on public.crm_contract_data;
create policy "crm_contract_data_delete_own"
  on public.crm_contract_data
  for delete
  using (auth.uid() = user_id);
