# Inventário Base44 — /indicadores & Plano Estratégico

> **Gap crítico:** `src/pages/` **ausente** no eject parcial (`PLANO-IMPORTACAO-BASE44.md:9`). Rotas em `App.jsx`; UI inferida de libs/comentários onde páginas faltam.

## Rotas & componentes de página

| Rota | Componente (import) | Arquivo esperado | Status |
|------|---------------------|------------------|--------|
| `/indicadores` | `PlanoEstrategicoGlobal` | `pages/PlanoEstrategicoGlobal.jsx` | **AUSENTE** |
| — | `Indicadores` (import não roteado) | `pages/Indicadores.jsx` | **AUSENTE** |
| `/clientes/:clientId/plano-estrategico` | `PlanoEstrategico` | `pages/PlanoEstrategico.jsx` | **AUSENTE** |
| `/clientes/:clientId/plano-estrategico/:year` | `PlanoEstrategicoEditor` | `pages/PlanoEstrategicoEditor.jsx` (38KB) | **AUSENTE** |
| `…/:year/preview` | `PlanoEstrategicoPreview` | `pages/PlanoEstrategicoPreview.jsx` | **AUSENTE** |
| `…/visualizacao-dono` | `VisualizacaoDono` | `pages/VisualizacaoDono.jsx` | **AUSENTE** |

- Rotas: `App.jsx:91-106`
- Label nav: `TopBar.jsx:11` → "Indicadores e Parâmetros"
- Abrir plano: `currentStrategicPlan.js:166` → navega para editor por ano

## Views/tabs inferidas (referenciadas em libs, sem JSX)

| View/Tab | Evidência |
|--------|-----------|
| **Cadastro Rápido** (`QuickEntryView`) | `strategicPlanOps.js:426-427`; `strategicCalc.js:177-178` `getManualIndicatorsByDept` |
| **Revisão Completa** | `strategicCalc.js:195-196` `getAllIndicatorsByDept` |
| **Editor Anual — Meta** | `strategicPlanOps.js:447` audit origin |
| **Editor Anual — Publicar** | `strategicPlanOps.js:484` |
| **Parâmetros do Cliente** | `strategicPlanOps.js:698`, `:725` |
| **Metas e Realizados** (viewType ACTUAL / PREVIOUS_YEAR) | `excelConfig.js:69-73`; `competenceUtils.js:67-72`; `ownerViewModel.js:31-32` |
| **Consolidado vs Loja** | `ownerViewModel.js:42-52` scopeType `ALL_STORES` \| `STORE` |

## Componentes UI presentes no import

### StoreActionsMenu — dropdown "Ações da Loja"
`components/strategic/storeActions/StoreActionsMenu.jsx`
- Toggle: `:27-36`
- Copiar Metas para Outra Loja: `:17`
- Exportar Metas Preenchidas: `:18`
- Baixar Modelo em Branco: `:20`
- Importar Tabela: `:21`
- Abrir Histórico: `:22`

### ExportStoreTargetsModal — dialog export Excel
`components/strategic/storeActions/ExportStoreTargetsModal.jsx`
- Fechar (X): `:38`
- Cancelar: `:57`
- Exportar Metas: `:58-59`
- Resumo loja/cliente/ano/versão/indicadores digitáveis: `:41-47`

## Tabelas / grids (sem JSX — estrutura de dados)

| Grid | Colunas / escopo | Fonte |
|------|------------------|-------|
| Metas mensais 12×N indicadores | Jan-Dez, manual vs calculado | `strategicPlanOps.js:867-883` |
| Metas por loja (STORE scope) | 12 meses × unidades × indicadores PER_UNIT | `unitScopeOps.js:329-341` |
| Prévia cópia entre lojas | indicador, mês, loja, ação PREENCHER/SUBSTITUIR/MANTER | `storeTargetCopyOps.js:50-84` |
| Catálogo 45 indicadores + dept | `GLOBAL_DISPLAY_ORDER`, 6 departamentos | `indicatorCatalog.js:19-368` |
| 13 parâmetros estratégicos | defaults mensais | `indicatorCatalog.js:472`; `seedCatalog` `:29-38` |
| Roster do plano (pacote produto) | origin PRODUCT_PACKAGE vs CLIENT_CUSTOMIZATION | `productPackageOps.js:75-96` |

## Filtros, ano, escopo, modos

| Feature | Detalhe | Arquivo:linha |
|---------|---------|---------------|
| Ano referência | `referenceYear` / `cycle.year` | `productPackageOps.js:100`; `competenceUtils.js:10-12` |
| Mês (12) | `MONTH_LABELS` / `MONTH_LABELS_FULL` | `strategicPlanOps.js:920-921` |
| Competência M-1 (SP tz) | meses válidos import realizado | `competenceUtils.js:3-80` |
| viewType ACTUAL \| PREVIOUS_YEAR | bloqueio meses futuros | `competenceUtils.js:67-72`; `excelConfig.js:18` |
| Escopo unidade COMPANY \| STORE | Matriz + filiais | `unitScopeOps.js:10-74`; `StrategicPlanUnitScope.jsonc` |
| UNIT_ENTRY_MODES | COMPANY_ONLY, SHARED, PER_UNIT_REQUIRED | `unitPolicyDefaults.js:20-25` |
| UNIT_ROLLUP_METHODS | SUM, WEIGHTED_AVERAGE, etc. | `unitPolicyDefaults.js:27-37` |
| Seletor loja (Dono) | scopeType ALL_STORES / STORE + storeId | `ownerViewModel.js:6,42-52` |
| Filtro indicadores cópia | `selectedIndicatorIds`, `selectedMonths` | `storeTargetCopyOps.js:23,35-37,109` |
| Política conflito cópia | FILL_EMPTY_ONLY vs substituir | `storeTargetCopyOps.js:77-80,139` |
| FORMAT_CONTEXTS | INPUT, TABLE, CARD, CHART, EXPORT | `indicatorFormat.js:18-26` |

## Export / import Excel

| Ação | Arquivo:linha |
|------|---------------|
| Export metas loja (.xlsx) | `storeTargetCopyOps.js:178-191`; modal `:16-24` |
| Nome arquivo METAS_{CLIENT}_{STORE}_{YEAR} | `ExportStoreTargetsModal.jsx:53`; `excelConfig.js:69-73` |
| Template metas consolidado | `excelConfig.js:90-92` `getTargetTemplateFileName` |
| Template REALIZADO / ANO_ANTERIOR | `excelConfig.js:69-73` |
| Instruções células brancas/cinzas, LIMPAR | `excelConfig.js:8-18`, `:76-88` |
| Import tabela (menu) | `StoreActionsMenu.jsx:21` — gerador `excelTargetTemplateGenerator` **AUSENTE** no import |

## Parâmetros & overrides

| Op | Função | Arquivo:linha |
|----|--------|---------------|
| Hierarquia efetiva | cliente/mês > cliente/ano > MX mês > MX padrão | `strategicPlanOps.js:322-341` |
| Salvar override | scopes ANO_INTEIRO, SOMENTE_ESTE_MES, meses | `strategicPlanOps.js:657-705` |
| Restaurar padrão MX | encerra overrides ATIVO | `strategicPlanOps.js:709-730` |
| Prévia impacto fórmulas | antes/depois por indicador impactado | `strategicPlanOps.js:734-782` |
| Atualizar parâmetro MX | `updateParameter` | `strategicPlanOps.js:637-653` |
| Entidade override | `ClientStrategicParameterOverride.jsonc` | base44/entities/ |

## Catálogo & pacotes

| Op | Arquivo:linha |
|----|---------------|
| Seed 45 indicadores + 13 params | `strategicPlanOps.js:10-48` |
| Ordem oficial / move up-down / restore | `indicatorOrder.js:11-69,99-152` |
| Resolver produto→pacote PUBLISHED | `productPackageOps.js:13-71` |
| Criar plano do pacote | `productPackageOps.js:100-224` |
| Sync plano com pacote (add ausentes) | `productPackageOps.js:229-337` |
| Adicionar indicador ao plano | `strategicPlanOps.js:836-917` |
| Ocultar/reactivar visibilidade Dono | `strategicPlanOps.js:617-633` |
| Entidades pacote | `StrategicIndicatorPackage*.jsonc` | base44/entities/ |

## Edição valores mensais

| Op | Arquivo:linha |
|----|---------------|
| `updateMonthlyValue` — só MANUAL | `strategicPlanOps.js:421-451` |
| `recalculateMonthlyValues` — 3 passes deps | `strategicPlanOps.js:345-417` |
| Bloqueio indicador calculado | `strategicPlanOps.js:427-428` |
| Override calculado + justificativa | `validatePlan` `:533-539` |
| Consolidação multi-loja | `unitConsolidation.js:35-292` |
| Editable por escopo | `unitConsolidation.js:246-267` |

## Ciclo: criar → validar → publicar → revisar

| Status ciclo | `StrategicPlanCycle.jsonc:24-31` RASCUNHO…PUBLICADO…ARQUIVADO |
| Etapa | Função | Arquivo:linha |
|-------|--------|---------------|
| Criar | `createStrategicPlan` → `createStrategicPlanFromProduct` | `strategicPlanOps.js:106-141`; `productPackageOps.js:100` |
| Copiar ano anterior | `copyFromPreviousYear` + `copyTargets` | `strategicPlanOps.js:122-138` |
| Reparar escopos/sync | `repairStrategicPlan` | `strategicPlanOps.js:288-318` |
| Validar prontidão | `validatePlan` — vazios, PLAN_EMPTY, pendências | `strategicPlanOps.js:491-545` |
| Publicar | `publishPlan` — copia applied→published | `strategicPlanOps.js:455-487` |
| Revisar | `createPlanRevision` — novo ciclo vN+1 RASCUNHO | `strategicPlanOps.js:786-832` |
| Resolver plano atual | `resolveCurrentStrategicPlan` | `currentStrategicPlan.js:22-114` |
| Abrir editor | `openCurrentStrategicPlan` | `currentStrategicPlan.js:161-185` |

## strategicPlanOps.js — todas as funções exportadas

| Função | Propósito | Linha |
|--------|-----------|-------|
| `seedCatalog` | Import idempotente 45 indicadores + 13 parâmetros | 10 |
| `migrateUndefinedIndicators` | Corrigir indicadores sem departamento | 52 |
| `createStrategicPlan` | Criar ciclo via pacote produto; opcional copiar ano anterior | 106 |
| `repairStrategicPlanStoreScopes` | Criar escopos loja + MVs ausentes; legacy COMPANY | 147 |
| `repairStrategicPlan` | Reparo escopos + sync pacote | 288 |
| `getEffectiveParameter` | Valor param com hierarquia override | 322 |
| `recalculateMonthlyValues` | Recalcular indicadores calculados (3 passes) | 345 |
| `updateMonthlyValue` | Gravar meta manual + audit | 421 |
| `publishPlan` | Publicar ciclo e valores | 455 |
| `validatePlan` | Validar preenchimento antes publicar | 491 |
| `seedDemoData` | Cliente demo + plano 2026 preenchido | 549 |
| `toggleIndicatorVisibility` | Ocultar/reativar no Dono | 617 |
| `updateParameter` | Alterar default param MX | 637 |
| `saveClientParameterOverride` | Override param por cliente/mês | 657 |
| `restoreParameterToDefault` | Encerrar overrides cliente | 709 |
| `previewParameterImpact` | Simular impacto em fórmulas | 734 |
| `createPlanRevision` | Nova versão rascunho copiando targets/MVs | 786 |
| `addIndicatorToPlan` | Adicionar indicador + 12 MVs + CSI | 836 |
| `MONTH_LABELS` / `MONTH_LABELS_FULL` | Labels meses | 920-921 |

## Ops relacionadas (outros libs)

| Função | Lib | Linha |
|--------|-----|-------|
| `previewStoreTargetsCopy` / `copyStoreStrategicTargets` | storeTargetCopyOps | 22, 96 |
| `exportStoreTargets` | storeTargetCopyOps | 178 |
| `resolveClientProductPackage` / `getStrategicPlanIndicatorRoster` | productPackageOps | 13, 75 |
| `syncStrategicPlanUnitScopes` / `buildMonthlyValuesByUnit` | unitScopeOps | 86, 295 |
| `getOwnerStrategicPlanViewModel` | ownerViewModel | 6 |
| `getManualIndicatorsByDept` / `computeDeptProgress` | strategicCalc | 178, 213 |

---
Gerado: 2026-08-22 | Fonte: `docs/base44-import/_source/`
