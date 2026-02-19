# Política de Backlog Pós-Estabilização

## Objetivo
Garantir que novas funcionalidades não comprometam a baseline estável.

## Critério de entrada (obrigatório)
Uma demanda só entra em desenvolvimento quando tiver:
1. Problema claro (quem é impactado e como).
2. Resultado esperado mensurável.
3. Escopo mínimo definido (MVP da entrega).
4. Risco técnico identificado.
5. Plano de validação (teste manual/E2E).

## Priorização por impacto
- `P0` Bloqueador operacional: quebra fluxo crítico (login, cliente, evento, assinatura, LGPD).
- `P1` Alto impacto de receita/operação: reduz atrito comercial ou risco de dados.
- `P2` Ganho incremental: melhoria de produtividade/UX sem bloqueio.
- `P3` Oportunidade: melhorias cosméticas/experimentais.

## Matriz simples de decisão
- Prioridade alta quando:
  - impacto no usuário: alto
  - urgência operacional: alta
  - esforço: baixo/médio
- Prioridade baixa quando:
  - impacto no usuário: baixo
  - urgência operacional: baixa
  - esforço: alto

## Definition of Done (DoD)
- Código revisado.
- `npm run lint` verde.
- `npm run build` verde.
- E2E do fluxo afetado verde (ou novo teste adicionado).
- Documento/guia atualizado quando necessário.
- Rollback da mudança conhecido.

## Regra de proteção da baseline
- Não iniciar duas features de alto risco em paralelo.
- Alterações estruturais de banco exigem sanity check pós-migration.
- Hotfix em produção tem prioridade sobre backlog novo.

