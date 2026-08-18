# GAP 01 — /planos-acao e /indicadores (plano estratégico)

Fonte: `_source/src/lib/actionPlanOps.js` (61.752 B, 30 ops) e `_source/src/lib/strategicPlanOps.js` (41.470 B, 20 exports).
Método: cada operação do Base44 procurada no `src/` do MX por nome e, para as não encontradas, por semântica (PT/EN).

## Divergência estrutural (a mais grave)
Base44 aplica modelo de plano de ação **ao cliente**: `applyTemplateToClient`.
MX aplica **à loja**: `applyTemplateToStore` / `applyTemplateToStoreIdempotent`
(`features/admin-mx/planos-acao/templateApplicationIdempotency.ts:54`, `useActionPlanTemplates.ts:149`, `StrategicIndicatorActionSelector.tsx:79`).

Nível de escopo errado. Cliente com N lojas: no Base44 o plano nasce um, no MX nasce N — ou nasce preso a uma loja arbitrária. Contamina idempotência, progresso, promoção a modelo e consolidação. Corrigir isto **antes** de portar o resto do módulo, senão o port herda o erro.

## actionPlanOps — 25 de 30 sem equivalente no MX
Sem correspondência por nome nem por semântica:
- **Ciclo de vida do modelo**: `createTemplate`, `publishTemplate`, `archiveTemplate`, `disableTemplate`, `reenableTemplate`, `createNewVersion`, `generateTemplateCode`
- **Aplicação**: `applyTemplateToClient` (ver acima), `detectPartialApplications`
- **Plano do cliente**: `getActionPlanWithItems`, `transitionClientActionPlanStatus`, `updateClientActionPlanDueDate`, `correctClientActionPlanCompletionDate`, `reorderClientActionPlanCard`, `deriveKanbanColumn`, `toggleActionItemComplete`, `calculatePlanProgress`
- **Sugestões**: `createSuggestion`, `convertSuggestionToActionPlan`
- **Promoção**: `promoteClientActionPlanToTemplate`
- **Reconciliação**: `reconcileDuplicatedActionPlanDrafts`, `reconcileDuplicatedClientActionPlans`
- **Seed/migração**: `seedDemoTemplates`, `migrateDepartments`, `ensureIndicatorCatalog`

Presentes no MX (5): `calculateWeights`, `suggestTitle` (`actionPlanWizardLogic.ts`), `dismissSuggestion`, `publishSuggestionToOwner`, `validateSuggestion` (`SuggestionsTab.tsx`).

Observação: MX tem `KANBAN_COLUMNS` hardcoded em `features/dashboard-loja/sections/owner-cockpit/ActionPlanView.tsx:10`, contra `deriveKanbanColumn` (derivada de status+datas) no Base44. Coluna estática vs derivada → cartão aparece na coluna errada.

## strategicPlanOps — 12 de 17 sem equivalente
Ausentes: `createStrategicPlan`, `publishPlan`, `validatePlan`, `createPlanRevision`, `recalculateMonthlyValues`, `updateMonthlyValue`, `addIndicatorToPlan`, `toggleIndicatorVisibility`, `updateParameter`, `seedCatalog`, `migrateUndefinedIndicators`, `repairStrategicPlan`, `repairStrategicPlanStoreScopes`.

Ou seja: **o ciclo de vida do plano estratégico não existe no MX** — não há criar → validar → publicar → revisar. Sem isso a tela de indicadores é um CRUD solto, não um plano.

Presentes (4, todos em `features/admin-mx/indicadores/`): `getEffectiveParameter`, `previewParameterImpact`, `saveClientParameterOverride` (`parameterCatalog.ts`), `restoreParameterToDefault` (`indicatorData.ts`).
`validatePlan` do MX (`features/action-plan/`) valida plano de ação, não plano estratégico — homônimo, não equivalente.

## Consequência para o plano de ondas
A onda de `/planos-acao` e `/indicadores` não é "portar telas": é portar **camada de operações + ciclo de vida**, e corrigir o escopo cliente vs loja. Telas do MX já existem e ficam; o que entra por baixo é a regra.

---

# Correção (mesma sessão) — modelo de dados existe, com nomes PT

O `artifacts/base44-admin-parity-matrix.json` mapeia entidades para tabelas que **não existem** com aqueles nomes:
`empresas_cliente`, `modelos_plano_acao_global`, `itens_modelo_plano_acao_global`, `instancias_plano_acao_cliente`, `consultores_mx`, `solicitacoes_suporte_implantacao`.

Os nomes reais no schema são outros:
| Parity matrix (inexistente) | Real no Supabase |
|---|---|
| modelos_plano_acao_global | `planos_acao_templates` |
| itens_modelo_plano_acao_global | `planos_acao_template_itens` |
| instancias_plano_acao_cliente | `planos_acao` (+ `itens_plano_acao`) |
| empresas_cliente | `clientes_consultoria` |
| consultores_mx | `perfil_consultor_mx` |
| — | `planos_acao_template_versoes` (versionamento existe) |

**O parity matrix não é confiável como mapa.** Vale como lista de intenção, não como estado. Mapa real = `src/types/database.generated.ts`.

## Consequência para o achado de escopo
`planos_acao` tem **`scope_type` + `scope_id`** — escopo genérico. Aplicar modelo a cliente é representável no banco hoje; nenhuma migration nova é necessária para isso.
O erro é só de aplicação: `applyTemplateToStore*` fixa escopo em loja. Correção = passar a escrever `scope_type='cliente'` quando a aplicação for de cliente, e consolidar leitura por escopo. Barato — desde que feito antes de portar o resto.

## Onde o plano estratégico realmente mora
Existe: `planejamentos_estrategicos` (client_id, period, status, diagnosis), `valores_indicadores_planejamento` (indicator_code, loja_id, year/month, meta, realizado), `catalogo_indicadores_planejamento`, `pacotes_indicadores_{estrategicos,itens,versoes}`, `historico_valores_indicadores_planejamento`, RPCs `salvar_metas_indicador_planejamento` / `restaurar_metas_indicador_planejamento`.

Ou seja: **tabela tem, ciclo de vida não**. `planejamentos_estrategicos.status` existe mas as operações que o movimentam (criar → validar → publicar → revisar) não estão implementadas em lugar nenhum do `src/`. Confirma o achado original por outro caminho.

Nota de escopo: `valores_indicadores_planejamento` é chaveado por **`loja_id`**, enquanto `planejamentos_estrategicos` é por **`client_id`**. Mesma inconsistência cliente-vs-loja do plano de ação, agora no modelo de dados. Consolidação cliente = soma de lojas precisa de regra explícita — no Base44 isso é `unitConsolidation.js` / `unitScopeOps.js` (slice B, ainda copiando).
