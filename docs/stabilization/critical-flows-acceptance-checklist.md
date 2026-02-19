# Checklist de Aceite - Fluxos Criticos (Estabilizacao)

## 1. Login
- [ ] Login com credenciais validas leva para `/dashboard`.
- [ ] Credencial invalida mostra erro claro.
- [ ] Usuario anonimo em rota protegida redireciona para `/login`.

## 2. Criar cliente
- [ ] Botao `Novo cliente` abre modal.
- [ ] Selecionar tipo de evento funciona.
- [ ] Salvar cliente com dados parciais cria lead em `Conhecendo cliente`.
- [ ] Cliente criado aparece em `Pipeline` e `Carteira de Clientes`.

## 3. Avancar estagio
- [ ] Troca `Conhecendo -> Analisando` funciona e mostra modulo de orcamento.
- [ ] Troca `Analisando -> Assinatura` funciona e mostra modulo de contrato.
- [ ] Troca `Assinatura -> Fechado` funciona.
- [ ] Troca para `Cliente perdido` solicita motivo.
- [ ] Historico de estagios registra transicoes.

## 4. Orcamento e contrato
- [ ] `Plan IA` gera texto base para orcamento.
- [ ] `Salvar` persiste documento.
- [ ] Exportacao Word/PDF funciona.
- [ ] Em assinatura, `Enviar` cria pendencia de assinatura.

## 5. Assinatura
- [ ] Link de assinatura e gerado e pode ser copiado.
- [ ] Tela publica de assinatura abre por token valido.
- [ ] Assinatura atualiza status do pedido/documento.

## 6. Timeline/Cronograma
- [ ] Cronograma do dia abre sem erros no evento.
- [ ] Timeline renderiza em desktop e mobile.
- [ ] Eventos excluidos nao geram notificacoes no widget.

## 7. Exclusao de cliente
- [ ] Acao abre popup de confirmacao premium.
- [ ] `Excluir definitivamente` remove cliente e dados relacionados.
- [ ] `Cliente perdido` preserva historico sem deletar.

## 8. LGPD
- [ ] Registrar consentimento grava em historico.
- [ ] Exportar dados baixa JSON completo do cliente.
- [ ] Anonimizar remove dados pessoais e registra motivo.

## 9. Priorizacao e playbook
- [ ] Forecast e fila de prioridade carregam.
- [ ] Pesos personalizados alteram score apos salvar.
- [ ] `Gerar tarefas do playbook` cria tarefas sem duplicar passos.

## 10. Criterios de saida da fase
- [ ] Lint e build verdes.
- [ ] E2E smoke verde.
- [ ] E2E autenticado verde (com secrets configurados no CI).
- [ ] Nenhum bug bloqueador aberto.

