# Backlog P1 Inicial (Pós-Estabilização)

## P1-001: Dashboard de saúde operacional (telemetria)
- Problema:
  - Hoje existe coleta de eventos/erros, mas não há visão consolidada para operação diária.
- Impacto esperado:
  - Reduzir tempo de diagnóstico de incidentes e priorizar correções com dados reais.
- Escopo mínimo (MVP):
  - Página interna com:
    - erros frontend por tela (últimas 24h/7d)
    - falhas RPC por ação
    - volume de page views principais
- Risco técnico:
  - Médio (consultas agregadas e modelagem de métricas).
- Validação:
  - E2E smoke da nova página
  - conferir consistência com eventos registrados no `telemetry-intake`.
- Critério de aceite:
  - Painel carrega < 2s com filtros básicos
  - ranking de top 5 erros por tela funcional.

## P1-002: EventDetails com carregamento incremental por aba
- Problema:
  - `EventDetails` ainda concentra muita carga inicial.
- Impacto esperado:
  - Melhor tempo de resposta e experiência mobile.
- Escopo mínimo (MVP):
  - Lazy load de dados por aba (timeline, convidados, fornecedores, docs)
  - manter visão geral carregando primeiro.
- Risco técnico:
  - Médio-alto (sincronização de estado e regressões entre abas).
- Validação:
  - Medir tempo de first render antes/depois
  - E2E cobrindo abertura de 4 abas críticas.
- Critério de aceite:
  - reduzir tempo inicial percebido em pelo menos 30%.

## P1-003: Hardening de exclusão de evento com auditoria
- Problema:
  - Exclusão de evento depende de múltiplas operações encadeadas sem trilha consolidada.
- Impacto esperado:
  - Menor risco de inconsistência e melhor rastreabilidade.
- Escopo mínimo (MVP):
  - RPC transacional para exclusão lógica/física conforme política
  - tabela de auditoria de exclusão de evento.
- Risco técnico:
  - Médio (impacta fluxo sensível de dados).
- Validação:
  - testes de borda: evento com muitos relacionamentos
  - confirmação de limpeza segura.
- Critério de aceite:
  - nenhum órfão após exclusão
  - log de auditoria sempre gerado.

## P1-004: Fluxo de assinatura com lembrete automático
- Problema:
  - Pendências de assinatura podem ficar paradas sem cadência automática.
- Impacto esperado:
  - Melhor taxa de conversão em `assinatura_contrato`.
- Escopo mínimo (MVP):
  - lembrete automático para solicitações pendentes > 3 dias
  - ação única para reenviar link com texto padrão.
- Risco técnico:
  - Médio (integração de mensagens e regras de frequência).
- Validação:
  - teste manual + E2E do ciclo pendente -> lembrete enviado.
- Critério de aceite:
  - cliente com assinatura pendente recebe lembrete dentro da regra configurada.

## P1-005: Perfil operacional do usuário (contatos oficiais)
- Problema:
  - Módulos como Portfólio usam campos manuais repetidos.
- Impacto esperado:
  - Reduzir retrabalho e padronizar comunicação com leads.
- Escopo mínimo (MVP):
  - cadastro de contatos oficiais (nome, whatsapp, e-mail, instagram) no perfil
  - autopreenchimento no módulo Portfólio.
- Risco técnico:
  - Baixo-médio.
- Validação:
  - E2E: editar perfil -> abrir Portfólio -> campos preenchidos.
- Critério de aceite:
  - 100% dos campos de remetente carregam automaticamente.

## Prioridade sugerida (ordem de execução)
1. `P1-002` EventDetails incremental
2. `P1-001` Dashboard de saúde operacional
3. `P1-004` Lembrete de assinatura
4. `P1-005` Perfil operacional
5. `P1-003` Hardening de exclusão de evento

## Definition of Done (referência)
- Seguir `docs/stabilization/post-stabilization-backlog-policy.md`
- `npm run lint` verde
- `npm run build` verde
- E2E relevante verde
- Documentação atualizada

