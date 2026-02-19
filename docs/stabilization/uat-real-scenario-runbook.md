# UAT Real - Roteiro Prospect -> Fechamento

## Objetivo
Validar ponta a ponta o fluxo comercial e operacional com dados reais, registrando fricções e bloqueadores para correção imediata.

## Pré-condições
- CI verde (`lint-build` + `e2e`)
- Usuário de teste operacional ativo
- Projeto Supabase com migrations aplicadas
- Checklist de fluxos críticos revisado:
  - `docs/stabilization/critical-flows-acceptance-checklist.md`

## Cenário-base
- Tipo de evento: `casamento`
- Nome: casal real ou mock realista
- Orçamento esperado: faixa compatível com operação
- Contato: e-mail e telefone válidos

## Passo a passo de execução
1. Login na plataforma (`/login` -> `/dashboard`)
2. Criar novo cliente em `Conhecendo cliente`
3. Abrir modal de prospecção e avançar para `Analisando orçamento`
4. Gerar orçamento com Plan IA e salvar documento
5. Registrar consentimento LGPD
6. Avançar para `Assinatura de contrato`
7. Gerar contrato com Plan IA e salvar
8. Enviar para assinatura (link/token)
9. Confirmar pendência de assinatura visível
10. Avançar manualmente para `Cliente fechado` após validação
11. Verificar histórico de estágios e métricas operacionais
12. Exportar dados LGPD em JSON

## Critérios de aceite
- Nenhum erro bloqueador no caminho feliz
- Mensagens de feedback claras (toast) em ações críticas
- Dados refletidos corretamente em:
  - pipeline
  - carteira
  - histórico
  - LGPD

## Registro obrigatório de fricções
Para cada fricção, preencher:
- passo
- sintoma
- impacto
- evidência (print/video)
- severidade
- ação proposta

Use o template:
- `docs/stabilization/uat-friction-log-template.md`

