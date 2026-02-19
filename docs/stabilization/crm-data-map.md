# Mapa de Dados - CRM

## Tabelas principais
- `crm_clients`
  - cadastro principal do lead/cliente
  - estagio, contato, tipo de evento, previsao de data/orcamento
- `crm_client_people`
  - pessoas vinculadas ao cliente (noiva, noivo, contato principal etc)
- `crm_client_addresses`
  - enderecos das pessoas do cliente
- `crm_contract_data`
  - campos estruturados para contrato/orcamento

## Execucao comercial
- `crm_lead_interactions`
  - historico de interacoes (canal, resumo, follow-up)
- `crm_followup_rules`
  - regra de geracao automatica de follow-up por usuario
- `crm_followup_tasks`
  - tarefas comerciais abertas/concluidas (inclui `source_kind`)
- `crm_stage_playbook_steps`
  - playbook de tarefas por estagio e tipo de evento
- `crm_client_stage_history`
  - trilha de mudancas de estagio do cliente

## Documentos e assinatura
- `crm_client_documents`
  - textos de orcamento/contrato
- `crm_signature_requests`
  - pedidos de assinatura e token publico

## LGPD e compliance
- `crm_consent_records`
  - registros de base legal/consentimento
- `crm_retention_deletions`
  - auditoria de exclusoes por regra de retencao

## Portfolio de prospeccao
- `crm_portfolio_shares`
  - links publicos de portfolio para leads

