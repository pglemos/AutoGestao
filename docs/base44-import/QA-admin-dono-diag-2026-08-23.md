# QA — Admin↔Dono diagnóstico + AG (2026-08-23)

## Diagnóstico de Dados (Etapa A)

- Rota: `/plano-estrategico?storeId=c68d56bd-…` (AG AUTOMÓVEIS), Admin SynVolt
- Botão **Diagnóstico de Dados** visível; painel read-only abre
- Contexto: `clientAccountId=79130186-…`, `referenceMonth=7`, `scopeType=CONSOLIDATED` (filtro Dono `Todas as lojas` persistido no `OwnerProvider` global)
- Comparação META/REALIZADO/AA: situações **IGUAL** (valores vazios Admin consolidação = Dono scoped series)
- Shot: `visual-evidence/agent-browser/qa-admin-dono-diag-2026-08-23/01-diagnostico-dados.png`

## Etapa B (resolver)

- `resolveOwnerScopedSeries` aplica overlay CONSOLIDATED no view model Resumo/VG/cards
- STORE não usa mapa consolidado
- Testes unitários `applyOwnerScopeSeries.test.ts` PASS (4)

## Parcial N/M (AG)

- AG = 3 lojas (matriz + filiais) — suporte CONSOLIDATED confirmado no diagnóstico
- Mês 7 / `sales_volume` sem realizado nas unidades → comparação vazia IGUAL; banner **Parcial N/M** só aparece quando integrity status = PARCIAL (unidades com base parcial). Sem base em nenhuma unidade ≠ Parcial.
- Código + testes de `formatPartialUnitsLabel` / `unitConsolidation` já cobrem o caso; live banner depende de mês com subset de unidades preenchido.

## Prompt 3 (smoke)

- AG checklist: **Dono Master válido** = Impeditivo (“existem Donos, nenhum Master”) — regra P3 presente na ficha
