# Story MX-MGR-20260713-09 - Ranking Base44 1:1

## Status

Em auditoria

## Escopo e fontes

Reproduzir Base44 `/ranking` em `/ranking` com `src/pages/Ranking.jsx`, `src/components/ranking/*`, `ManagerRankingReference.tsx`, `StoreRankingView.tsx` e contratos do MX.

## Regras e limites

Tela PRELIMINAR. Implementar filtros de período, unidade e critério, líderes, tabela, posição, vendas, conversão, rotina, status e privacidade da equipe/unidade. A fórmula inicial 50% vendas/meta + 25% conversão + 25% rotina é provisória; pesos finais, margem, faturamento e desempate dependem do Módulo do Dono e não podem ser tratados como contrato definitivo.

## Estados, fluxos e testes

Validar mês, filtros, pódio, cores, vazio, dados insuficientes, loading, erro, responsividade e isolamento. Cobrir dados controlados, arredondamento somente na exibição, navegação contextual e ausência de conteúdo inventado.

## Evidências e file list

Baseline em `output/playwright/manager-parity/master-20260713/`; aprovação preliminar depende de decisão do Dono.

Arquivos tocados nesta iteração:

- `docs/qa/MODULO_GERENCIAL_PARITY_MATRIX.md`
- `src/features/ranking/views/ManagerRankingReference.tsx`
- `src/pages/ManagerMentor.tsx`
- `src/test/manager-module.playwright.ts`
