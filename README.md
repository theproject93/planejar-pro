# PlanejarPro

Plataforma web para planejamento e gestÃ£o de eventos (voltada para cerimonial/organizaÃ§Ã£o), com login, dashboard e gestÃ£o de eventos/detalhes. [cite:24][cite:23]

## Objetivo
Centralizar tarefas, convidados, mesas, orÃ§amento e informaÃ§Ãµes do evento em um sÃ³ lugar, com uma experiÃªncia simples (dashboard â†’ evento â†’ abas de detalhes). [cite:24][cite:27]

## Stack
- React + TypeScript + Vite [cite:16]
- React Router (rotas pÃºblicas e protegidas) [cite:24]
- Supabase (Auth + banco) [cite:16][cite:23]
- Tailwind (via @tailwindcss/vite) [cite:16]

## Rotas
- `/` Landing [cite:24]
- `/login` Login/Cadastro [cite:24]
- `/dashboard` (protegida) [cite:24]
- `/dashboard/saude` dashboard interno de saude operacional
- `/dashboard/eventos` lista de eventos [cite:24]
- `/dashboard/eventos/:id` detalhes do evento [cite:24]

## Features (status)
### JÃ¡ existe
- Landing page [cite:24]
- Login/cadastro e sessÃ£o (AuthContext + rota protegida) [cite:24]
- Dashboard com visÃ£o geral (contagem de eventos, prÃ³ximo evento, orÃ§amento agregado) [cite:24]
- CRUD/gestÃ£o de eventos + tela de detalhes do evento [cite:24]
- Abas no detalhe do evento (ex.: tarefas, orÃ§amento, convidados, mesas, mapa visual etc.) [cite:27]

### Em progresso / melhoria
- PadronizaÃ§Ã£o de schema (snake_case) e tipagem consistente entre front e Supabase. [cite:23]
- Melhorar â€œestado vazioâ€, loading e feedback de erro por aba. [cite:27]

## Como rodar localmente
1) `npm install`
2) Copie `.env.example` â†’ `.env` e preencha: [cite:23]
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3) `npm run dev` [cite:16]

## Scripts
- `npm run dev` [cite:16]
- `npm run build` [cite:16]
- `npm run preview` [cite:16]
- `npm run lint` [cite:16]
- `npm run e2e`
- `npm run e2e:headed`
- `npm run e2e:ui`

## Estabilizacao (14 dias)
- Checklist de aceite dos fluxos criticos:
  - `docs/stabilization/critical-flows-acceptance-checklist.md`
- Checklist Go/No-Go de release:
  - `docs/stabilization/release-go-no-go-checklist.md`
- Checklist diario de operacao:
  - `docs/stabilization/daily-operations-checklist.md`
- Playbook de deploy/rollback:
  - `docs/stabilization/deploy-rollback-playbook.md`
- Mapa de dados CRM:
  - `docs/stabilization/crm-data-map.md`
- Guia curto de suporte/triage:
  - `docs/stabilization/support-triage-guide.md`
- Auditoria de performance/mobile:
  - `docs/stabilization/performance-mobile-audit.md`
- Runbook UAT real (prospect -> fechamento):
  - `docs/stabilization/uat-real-scenario-runbook.md`
- Template de friccoes UAT:
  - `docs/stabilization/uat-friction-log-template.md`
- Relatorio da rodada UAT (2026-02-19):
  - `docs/stabilization/uat-session-2026-02-19.md`
- Release estavel (Dia 14):
  - `docs/stabilization/release-stable-2026-02-19.md`
- Politica de backlog pos-estabilizacao:
  - `docs/stabilization/post-stabilization-backlog-policy.md`
- Backlog P1 inicial pos-estabilizacao:
  - `docs/stabilization/post-stabilization-p1-backlog.md`
- Script de sanity check pos-migration:
  - `scripts/sanity-check.ps1`
  - Execucao completa: `.\scripts\sanity-check.ps1`
  - Sem E2E: `.\scripts\sanity-check.ps1 -SkipE2E`
- Auditoria local de hardening (RLS/indices/RPCs criticos):
  - `scripts/hardening-audit.ps1`
  - Execucao: `.\scripts\hardening-audit.ps1`

## CI (GitHub Actions)
- Workflow: `.github/workflows/ci.yml`
- Executa:
  - lint
  - build
  - e2e (Playwright)
- Secrets recomendados no repositorio:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `E2E_EMAIL`
  - `E2E_PASSWORD`

## Deploy (SPA)
HÃ¡ um `public/_redirects` para suporte a rotas SPA em hosts como Netlify. [cite:20]

## Supabase (operacao)
- Schemas de referencia:
  - `supabase/schema_telemetry_events.sql`
  - `supabase/schema_telemetry_intake.sql`
  - `supabase/schema_subscription_leads.sql`
- Migrations versionadas:
  - `supabase/migrations/20260217230000_telemetry_events.sql`
  - `supabase/migrations/20260217230100_telemetry_intake.sql`
  - `supabase/migrations/20260217230200_subscription_leads.sql`
- Edge function de telemetria:
  - `supabase/functions/telemetry-intake/index.ts`

### Deploy da Edge Function
1) Defina seu token:
   - PowerShell: `$env:SUPABASE_ACCESS_TOKEN="<seu_token>"`
2) Deploy:
   - `npx supabase functions deploy telemetry-intake --project-ref kcjpperavjuronkneezm`

### Validacao rapida (telemetry-intake)
- Requisicao valida deve retornar `200`.
- Requisicao sem `eventName/page/sessionId` deve retornar `400`.
- Burst de 25 requests com mesmo `sessionId` deve resultar em ~20 `200` e ~5 `429` (rate limit 20/60s).
