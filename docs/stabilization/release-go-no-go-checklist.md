# Checklist Go/No-Go de Release

Use este checklist imediatamente antes de liberar para producao.
Regra: se qualquer item P0 falhar, a decisao e `NO-GO`.

## 1) Gate tecnico (P0)
- [ ] `npm run lint` verde
- [ ] `npm run build` verde
- [ ] `npm run e2e` verde (sem falhas)
- [ ] CI do commit alvo verde (`lint-build` + `e2e`)

## 2) Fluxos criticos (P0)
- [ ] Login funciona (`/login` -> `/dashboard`)
- [ ] Criar cliente em `Conhecendo cliente` funciona
- [ ] Avancar estagio funciona (`Conhecendo -> Analisando -> Assinatura -> Fechado`)
- [ ] Timeline/Cronograma abre sem erro
- [ ] Excluir cliente definitivo funciona
- [ ] LGPD exportar e anonimizar funcionam

## 3) Banco e seguranca (P0)
- [ ] Migrations aplicadas e sem erro
- [ ] Script de sanity check pos-migration verde
- [ ] RLS valida para recursos criticos (clientes/eventos/documentos)
- [ ] Sem dados sensiveis expostos por link publico indevido

## 4) Observabilidade minima (P1)
- [ ] Erros front/edge visiveis no monitoramento
- [ ] Latencia de RPC critica sem degradacao severa
- [ ] Sem aumento anormal de erros nas ultimas 24h

## 5) UX de resiliencia (P1)
- [ ] Sem `alert()` em fluxos criticos
- [ ] Estados de loading/erro/sucesso consistentes
- [ ] Mensagens de erro com contexto (acao + tela)

## 6) Criterio final
- `GO`: todos os itens P0 marcados.
- `NO-GO`: qualquer item P0 pendente.
- Em `NO-GO`, abrir incidente curto com:
  - modulo afetado
  - impacto
  - plano de correcao
  - novo ETA de release
