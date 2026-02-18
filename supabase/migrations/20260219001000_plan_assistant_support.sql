create extension if not exists pgcrypto;

create table if not exists public.user_plan_assistant_hint_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  hint_id text not null,
  last_action text not null default 'shown'
    check (last_action in ('shown', 'opened', 'dismissed')),
  last_action_at timestamptz not null default now(),
  last_shown_at timestamptz,
  last_opened_at timestamptz,
  last_dismissed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, hint_id)
);

create index if not exists user_plan_assistant_hint_state_user_idx
  on public.user_plan_assistant_hint_state (user_id, last_action_at desc);

alter table public.user_plan_assistant_hint_state enable row level security;

drop policy if exists "user_plan_assistant_hint_state_read" on public.user_plan_assistant_hint_state;
create policy "user_plan_assistant_hint_state_read"
  on public.user_plan_assistant_hint_state
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_plan_assistant_hint_state_write" on public.user_plan_assistant_hint_state;
create policy "user_plan_assistant_hint_state_write"
  on public.user_plan_assistant_hint_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.platform_help_docs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  module text not null,
  title text not null,
  content text not null,
  keywords text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_help_docs_module_idx
  on public.platform_help_docs (module, is_active);

alter table public.platform_help_docs enable row level security;

drop policy if exists "platform_help_docs_read_authenticated" on public.platform_help_docs;
create policy "platform_help_docs_read_authenticated"
  on public.platform_help_docs
  for select
  using (auth.role() = 'authenticated');

insert into public.platform_help_docs (slug, module, title, content, keywords)
values
  (
    'eventos-basico',
    'eventos',
    'Como organizar um evento no painel',
    'Use a pagina de eventos para definir dados principais, checklist, cronograma, fornecedores e financeiro. Comece pelo cadastro base e depois avance por abas.',
    array['eventos', 'cadastro', 'abas', 'visao geral', 'organizacao']
  ),
  (
    'fornecedores-operacao',
    'fornecedores',
    'Fornecedor sem horario definido',
    'No modulo de fornecedores, preencha chegada e finalizacao para cada fornecedor. Esses horarios alimentam a torre de comando e os alertas de atraso.',
    array['fornecedor', 'horario', 'chegada', 'finalizacao', 'torre']
  ),
  (
    'convidados-rsvp',
    'convidados',
    'RSVP e confirmacao de convidados',
    'Use o disparo de convite e acompanhe RSVP pendente, confirmado ou recusado. Priorizacao: reduzir pendentes quando a data estiver proxima.',
    array['convidados', 'rsvp', 'confirmacao', 'pendente', 'token']
  ),
  (
    'cronograma-sugestoes',
    'cronograma',
    'Cronograma com sugestoes IA',
    'No cronograma voce pode aplicar sugestoes IA e regras locais. Resolva tarefas vencidas primeiro e mantenha fornecedores com horarios definidos.',
    array['cronograma', 'timeline', 'ia', 'tarefas', 'atraso']
  ),
  (
    'financeiro-fluxo',
    'financeiro',
    'Financeiro do usuario',
    'No financeiro acompanhe saldo em caixa, entradas confirmadas, entradas programadas e saidas programadas. Toda movimentacao salva deve refletir nos cards e graficos.',
    array['financeiro', 'caixa', 'entradas', 'saidas', 'movimentacoes']
  ),
  (
    'torre-comando',
    'torre',
    'Torre de comando no dia do evento',
    'A torre concentra status de fornecedores, alertas e incidentes. Use para operar tempo real e manter noivos no modo tranquilidade.',
    array['torre', 'comando', 'status', 'incidente', 'tempo real']
  ),
  (
    'configuracoes-gerais',
    'configuracoes',
    'Configuracoes da plataforma',
    'Em configuracoes voce ajusta perfil, preferencias e integracoes. Para problemas de deploy ou variaveis, revise ambiente no provedor e chaves do Supabase.',
    array['configuracoes', 'perfil', 'integracoes', 'deploy', 'variaveis']
  )
on conflict (slug) do update
set
  module = excluded.module,
  title = excluded.title,
  content = excluded.content,
  keywords = excluded.keywords,
  is_active = true,
  updated_at = now();
