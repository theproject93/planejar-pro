# Guia Curto de Suporte - Triage

## 1. Coleta minima de evidencia
Sempre pedir:
1. Tela/rota exata (ex.: `/dashboard/clientes`)
2. Acao executada
3. Horario aproximado
4. Print ou video curto
5. Mensagem de erro visivel (se houver)

## 2. Prioridade
- `P0` indisponibilidade total (login/quebra geral)
- `P1` fluxo critico bloqueado (criar cliente, salvar evento, assinatura)
- `P2` erro contornavel
- `P3` melhoria visual/usabilidade

## 3. Passos tecnicos de triagem
1. Reproduzir em ambiente local com mesmo fluxo.
2. Rodar:
   - `npm run lint`
   - `npm run build`
   - `npm run e2e`
3. Verificar logs do GitHub Actions (job `e2e`).
4. Se for banco/RPC, revisar migration e RLS relacionados.

## 4. Incidentes comuns
- Falha de login:
  - validar credenciais de teste no Supabase Auth
- Cliente nao salva:
  - checar RLS de `crm_clients`
- Erro em assinatura:
  - validar token em `crm_signature_requests`
- Erro LGPD:
  - testar `export_crm_client_data` e `anonymize_crm_client_data`

## 5. Fechamento
- Registrar causa raiz
- Registrar fix aplicado (commit/migration)
- Registrar teste de validacao executado

