# Checklist Diario de Operacao

Objetivo: detectar problema cedo e evitar surpresa em horario comercial.
Tempo de execucao alvo: 10-15 minutos.

## 1) Saude tecnica rapida
- [ ] App sobe local/preview sem erro
- [ ] Dashboard carrega
- [ ] Logs sem erro critico novo desde a ultima rodada

## 2) Fluxos de negocio (smoke)
- [ ] Login com usuario operacional
- [ ] Abrir `Meus Clientes`
- [ ] Criar lead com dados parciais
- [ ] Avancar lead para `Analisando orcamento`
- [ ] Abrir `Meus Eventos` e entrar em um evento

## 3) Integridade de dados
- [ ] Cliente novo aparece em Pipeline e Carteira
- [ ] Historico de estagios registra transicao
- [ ] Notificacoes nao mostram evento excluido

## 4) Compliance/LGPD
- [ ] Exportar dados do titular funciona (JSON)
- [ ] Anonimizacao funciona e registra acao

## 5) Mobile rapido (3 breakpoints)
- [ ] `360x740` sem overflow horizontal
- [ ] `390x844` sem overflow horizontal
- [ ] `430x932` sem overflow horizontal

## 6) Encerramento da rodada
- [ ] Friccoes registradas no template UAT
- [ ] Bloqueadores marcados como P0/P1
- [ ] Time notificado sobre qualquer bloqueador

## Classificacao sugerida
- `P0`: quebra fluxo critico (sem workaround)
- `P1`: impacto alto com workaround ruim
- `P2`: impacto medio/baixo sem bloquear operacao
