# Release Estável - 2026-02-19

## Versão
- `v0.1.0-stable`

## Escopo da estabilização concluída
- Pipeline CI com lint, build e E2E.
- Suíte E2E crítica em funcionamento (incluindo smoke de responsividade mobile).
- Hardening de banco/RPC com auditoria local e sanity check.
- Observabilidade mínima no frontend (erros globais, rejeições, page view e falhas RPC).
- UX de resiliência com toasts padronizados nos fluxos críticos.
- Compliance operacional com retenção segura de `cliente_perdido`.
- Documentação operacional (deploy/rollback, mapa CRM, triagem suporte, UAT).

## Evidências
- Workflow CI: `.github/workflows/ci.yml`
- Checklist crítico: `docs/stabilization/critical-flows-acceptance-checklist.md`
- Sanity + hardening audit:
  - `scripts/sanity-check.ps1`
  - `scripts/hardening-audit.ps1`
- UAT runbook e template:
  - `docs/stabilization/uat-real-scenario-runbook.md`
  - `docs/stabilization/uat-friction-log-template.md`

## Riscos residuais
- Cobertura E2E autenticada depende de secrets válidos no GitHub.
- Algumas áreas ainda não possuem testes de regressão detalhados por aba.
- Observabilidade ainda sem dashboard dedicado em ferramenta externa.

## Recomendação de operação
- Tratar `v0.1.0-stable` como baseline para próximas entregas.
- Novas features só entram com:
  - critério de impacto definido,
  - teste mínimo (lint/build + E2E relevante),
  - rollback claro.

