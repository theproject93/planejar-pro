# Playbook Operacional - Deploy e Rollback

## 1. Pre-deploy (obrigatorio)
1. `npm run lint`
2. `npm run build`
3. `npm run e2e`
4. `.\scripts\sanity-check.ps1 -SkipE2E` (ou sem `-SkipE2E` quando possivel)
5. Confirmar CI verde no GitHub (`lint-build` + `e2e`)

## 2. Deploy
1. Garantir branch `main` atualizada.
2. Publicar frontend no provedor atual.
3. Aplicar migrations pendentes:
   - `npx supabase db push`
4. Validar rapidamente em producao:
   - login
   - `/dashboard/clientes`
   - criar lead
   - abrir um evento

## 3. Rollback
1. Frontend:
   - reverter para ultimo commit/tag estavel no provedor.
2. Banco:
   - priorizar rollback logico via feature flag/uso temporario de rotas antigas.
   - evitar rollback destrutivo direto em producao.
3. Abrir incidente interno:
   - quando iniciou
   - impacto
   - modulo afetado
   - acao tomada

## 4. Checklist de saida
- [ ] CI verde
- [ ] Sem erro bloqueador em cliente/evento
- [ ] Sem regressao de autenticacao
- [ ] Fluxo LGPD funcionando (exportar e anonimizar)

