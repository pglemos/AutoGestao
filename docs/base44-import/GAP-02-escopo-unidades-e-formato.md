# GAP 02 — Escopo de unidades, consolidação, formato e ordem de indicadores

Fonte: `_source/src/lib/` (14 arquivos, 257 KB, tamanhos conferidos contra a origem).
Método: exports do Base44 procurados no `src/` do MX por nome; ausentes reconferidos por semântica.

**44 de 48 exports não têm equivalente no MX.** Presentes: `formatDisplay`, `getFormatConfig`, `parseStrategicInput`, `restoreDefaultOrder`.

## 1. Subsistema de unidades/escopo — ausente por inteiro
`unitScopeOps.js` + `unitConsolidation.js` + `unitPolicyDefaults.js` (39 KB) não têm contraparte:
- `loadClientUnits`, `loadUnitScopes`, `createUnitScopes`, `syncStrategicPlanUnitScopes`, `hasMultipleUnits`
- `computeConsolidatedMonth`, `computeConsolidatedYear`, `computeConsolidatedValueMap`, `groupValuesByUnit`
- `isEditableInScope`, `getIndicatorScopeBadge`, `CONSOLIDATION_STATUS`
- `resolveUnitPolicy`, `isUnitPolicyDefined`, `UNIT_POLICY_DEFAULTS`, `UNIT_ENTRY_MODES`, `UNIT_ROLLUP_METHODS`
- migrações: `migrateLegacyConsolidatedValues`, `migrateSingleUnitValues`

**É a causa raiz da inconsistência apontada no GAP-01.** `planejamentos_estrategicos` é por `client_id`, `valores_indicadores_planejamento` é por `loja_id`. No Base44 a ponte entre os dois é exatamente este subsistema: escopos de unidade por plano (`StrategicPlanUnitScope`), política por indicador (soma / média / média ponderada / valor único) e um estado de consolidação. Sem ele, o MX não tem como responder "qual é a meta do cliente" quando o cliente tem mais de uma loja — só a da loja.

`UNIT_ROLLUP_METHODS` é o que decide se consolidar é somar (faturamento) ou não (ticket médio, taxa de conversão). Somar um percentual é erro silencioso: número plausível, errado. Suspeito que seja parte do que se percebe como "fluxo errado".

## 2. Formatação de indicadores — 8 de 12 ausentes
`formatForCard`, `formatForChart`, `formatForExport`, `formatForTooltip`, `formatStrategicValue`, `parseInput`, `validateStrategicInput`, `VALUE_FORMATS`, `FORMAT_CONTEXTS`.
No Base44 o mesmo valor é renderizado por contexto (card ≠ gráfico ≠ export ≠ tooltip). O MX tem só `formatDisplay`/`getFormatConfig` — formatação única. Resultado: moeda/percentual/inteiro saindo com precisão errada conforme a superfície, e `validateStrategicInput` ausente significa entrada aceita sem validação de formato.

## 3. Ordem de indicadores — 10 de 12 ausentes
`DEFAULT_MX_ORDER`, `sortByGlobalOrder`, `groupByDeptOrdered`, `getActiveIndicators`, `getOfficialNumber`, `reorderIndicator`, `moveUp`, `moveDown`, `saveOrderChanges`, `normalizeOrderSequence`, `saveRestoreDefault`.
A ordem canônica MX dos indicadores e a reordenação por departamento não existem no MX. Indicador aparece em ordem arbitrária.

## 4. Produto → plano estratégico — ausente
`resolveClientProductPackage`, `createStrategicPlanFromProduct`, `getStrategicPlanIndicatorRoster`, `syncStrategicPlanWithProductPackage`.
É o elo `/produtos` → `/indicadores`: o produto contratado define o pacote de indicadores do plano do cliente. Sem isso, o plano estratégico não herda nada do produto — tem que ser montado à mão, e desalinha quando o pacote muda de versão.

## Leitura conjunta com GAP-01
GAP-01: falta o ciclo de vida (criar/validar/publicar/revisar) e as operações de plano de ação.
GAP-02: falta a semântica de escopo, consolidação, formato e ordenação por baixo dele.

São a mesma lacuna vista de dois ângulos: **o MX portou as telas e deixou a camada de regra para trás.** Por isso tem 1,1 MB de UI em `features/admin-mx/` e ainda assim os fluxos saem errados.
