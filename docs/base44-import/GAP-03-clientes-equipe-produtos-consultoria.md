# GAP 03 — /clientes, /equipe, /produtos, /consultoria-mx

Fonte: `_source/src/lib/` (35 arquivos espelhados do Base44).
Método: exports do Base44 procurados no `src/` do MX por nome e, quando ausentes, por semântica em PT e EN.

**Resultado diferente dos GAP-01/02: dois destes módulos estão em paridade de regra.** O diagnóstico "portaram telas e deixaram a regra para trás" vale para plano estratégico e plano de ação, não para o sistema inteiro.

## /equipe — em paridade
`capacityCalc.js`: **10 de 10 exports presentes** em `features/admin-mx/equipe/capacityCalc.ts`
(`calculateCapacity`, `calcOccupancy`, `buildTimeMap`, `getTimeForEncounter`, `getMaxTimeAcrossModalities`, `hasBothModalities`, `getCapacityStatus`, `CAPACITY_STATUS`, `getCurrentMonth`, `getMonthLabel`).
`userConstants.js`: 7 de 8 (falta só `ASSIGNMENT_LABELS`).
Nenhuma lacuna de regra encontrada. O MX ainda acrescenta o que o Base44 não tem: `userEdit.ts` e `userEditMutations.ts` (role grants, delegações, atribuições de loja).

## /consultoria-mx — em paridade
`consultingMxConstants.js`: **13 de 13 presentes** em `features/admin-mx/consultoria-mx/methodology.ts`
(`METHODOLOGY_TABS`, `ENCOUNTER_INNER_TABS`, `PARTICIPANT_ROLES`, `RESPONSIBLE_ROLES`, `CONTENT_TYPES`, `VISIBILITY_LABELS`, `DELIVERY_MOMENTS`, `EVIDENCE_TYPES`, `FILE_CATEGORIES`, `REPORT_SECTIONS`, `METHODOLOGY_STATUS`, `ENCOUNTER_COMPLETENESS`, `calculateCompleteness`).
`consultoriaMxData.ts` (35 KB) cobre versões de metodologia, encontros, entregáveis, evidências, guias, biblioteca, modelos de relatório e auditoria.

## /produtos — falta a ponte para o plano do cliente
`productPackageOps.js`: **4 de 4 ausentes**.
- `resolveClientProductPackage` — qual pacote de indicadores o cliente tem, pelo produto contratado
- `createStrategicPlanFromProduct` — nasce o plano estratégico do cliente a partir do produto
- `getStrategicPlanIndicatorRoster` — roster de indicadores do plano
- `syncStrategicPlanWithProductPackage` — sincroniza quando o pacote muda de versão

O MX tem o CRUD do pacote e o vínculo com o produto (`produtos/strategicPlan.ts`: `createStrategicPackage`, `publishPackageVersion`, `linkPackageToProduct`, `toggleProductUsesStrategicPlan`). O que falta é o outro lado: **do produto para o plano do cliente**. Sem isso, contratar um produto não gera plano nenhum, e publicar nova versão do pacote não alcança quem já contratou.

## /clientes — lacunas reais, mas parciais

**Ausentes por inteiro:**
- `capabilityCatalog.js` — ver abaixo.
- `capabilityCatalog.js`: `MODULES`, `PREVIEW_PROFILES`, `RELEASE_STAGE_LABELS`, `TECHNICAL_STATUS_LABELS`, `buildDefaultCapabilities`. Catálogo de módulos habilitáveis por cliente com estágio de release. O MX tem `clientConfig.ts`, que é configuração de canais, não catálogo de capacidades.
- `competenceUtils.js`: `resolveLastClosedCompetence`, `isMonthBlocked`, `getValidMonthsForView`. **Regra de competência fechada.** Sem ela, não há nada bloqueando lançamento em mês já fechado.
- `ownerViewModel.js` (8 KB): view model do plano estratégico para o Dono — `calcAttainment`, `calcVariation`, `getAccumulatedUntilMonth`, `getAnnualForMap`, `getStatus`, `STATUS_CONFIG`. O MX calcula atingimento pontualmente em `NetworkMetricsSection.tsx` (`sales / goal`), sem acumulado, variação nem faixa de status.
- `excelConfig.js`: `TEMPLATE_VERSION`, `generateTemplateHash`, `INSTRUCTION_LINES`, `getExcelNumberFormat`, `sanitizeFileName`. O MX exporta planilha (`exportXlsx`) sem versão nem hash de template — planilha antiga reimportada não é detectada.

**Parciais:**
- Reparos: o MX tem `clientRepairs.ts` com `REPAIRABLE_CHECKS = ['consultor-responsavel', 'modulos', 'loja-principal']`. O Base44 tem `repairHeadquarters` + `upsertHeadquartersFromLegalEntity` + `generateInternalCode` (`headquartersRepair.js`), `repairProgramAssignmentFromJourney` (`programRepair.js`) e `repairClientOwnerMasterReference` (`ownerMasterResolver.js`). Há sobreposição em "loja-principal" e "modulos"; o reparo de referência de dono-master e a criação de matriz a partir da pessoa jurídica não têm equivalente.
- `storeHoursUtils.js`: `DEFAULT_MX_HOURS` e a construção do horário padrão existem; `ensureDefaultOperatingHours` e `restoreDefaultOperatingHours` não.
- `storeTargetCopyOps.js`: `previewStoreTargetsCopy` existe; `copyStoreStrategicTargets` e `exportStoreTargets` foram reimplementados no MX de outro jeito (`buildStoreCopyMutations` + `applyStoreCopyMutations`).

**Sem lacuna:** CNPJ (`isValidCnpj` em `novo-cliente/newClientDraft.ts`, `maskStoreCnpj` em `clientes/storeForm.ts`) e resolução de dono-master (`resolveOwnerMaster` em `personAccess.ts`).

## Correção — `journeyTemplates` NÃO está ausente

Eu havia registrado `journeyTemplates.js` como ausente por inteiro. Errado: os modelos de jornada existem no MX **em tabela**, não em constante. `etapas_modelo_visita_consultoria` tem **59 etapas** cobrindo os seis programas (`pmr_7`: 8, `pmr_9`: 9, `pmr_online`: 12, `pmr_hibrido`: 12, `pmr_plus`: 9, `ppa`: 9), com objetivo, público-alvo e duração. Portar a constante criaria uma segunda fonte de verdade — pior que a lacuna.

O que de fato falta, comparando o conteúdo:

| | Base44 | MX |
|---|---|---|
| Encontro de Onboarding (nº 0) | presente nos 4 modelos | **nenhuma linha com `visit_number = 0`** |
| Checklist de onboarding | `ONBOARDING_STAGES`, 7 itens por programa, com responsável | `checklist_template` existe como coluna e está **vazio em todas as 59 linhas** |
| Modalidade por encontro | por encontro (`PMR_HIBRIDO`: 11 online + 2 presenciais; `PMR_PLUS`/`PPA`: 9 `A_DEFINIR`) | só no programa (`modalidade` + faixa `min/max_presenciais`); `pmr_7` e `pmr_9` com modalidade nula |
| Escopo por encontro | `EMPRESA` / `TODAS_LOJAS` | não existe |
| `evidence_required` | por encontro | coluna existe, nula em todas |

`A_DEFINIR` como modalidade explica o check de prontidão "Encontros futuros com modalidade a definir" que o Base44 tem e o MX não: sem modalidade por encontro, não há o que verificar.

**Preencher isso é semear dado em produção**, não escrever código: 4 linhas de onboarding, 59 modalidades, 59 escopos e 28 itens de checklist. Decisão do dono do produto, não minha.

## Prontidão de ativação do cliente — divergência de cobertura e de severidade
`clientActivationReadiness.js` (17 KB) expõe `evaluateClientActivationReadiness` e `CHECK_STATUS`; ambos ausentes por nome. O MX tem equivalente próprio em `clientes/clientReadiness.ts` (`buildClientReadiness`, `readinessSummary`, `journeyProgress`), então não é lacuna total — é cobertura diferente.

**Checks que o Base44 avalia e o MX não:**
- Jornada gerada
- Dono Master válido — inclusive o caso "vínculo do Dono Master inconsistente"
- Plano Estratégico e metas
- Encontros futuros com modalidade a definir
- Calendar e WhatsApp não conectados

**Checks que o MX avalia e o Base44 não:** CNPJ, contato, contrato.

**Sobreposição:** matriz ≈ `loja-principal`, programa ≈ `produto`/`modulos`, consultores ≈ `consultor`, responsáveis ≈ `responsavel-mx`.

**Divergência de severidade, mais séria que a de cobertura.** O Base44 tem cinco estados:
`VALID`, `INVALID`, `WARNING`, `NOT_APPLICABLE`, `TECHNICAL_ERROR`.
O MX tem dois: `impeditivo` e `informativo`.

Sem `NOT_APPLICABLE`, um check que não se aplica àquele produto precisa ser forçado a passar ou a bloquear. Sem `TECHNICAL_ERROR`, uma falha ao *avaliar* o check fica indistinguível do resultado do check — o cliente pode aparecer pronto para ativar porque a verificação quebrou, não porque passou. É o mesmo padrão de erro silencioso do rollup de percentuais.

Cada check do Base44 também carrega `correctionRoute` — link direto para a tela que corrige aquele item. O MX não tem equivalente.

## Ordem sugerida
1. `competenceUtils` — mês fechado sem bloqueio é erro de dado que ninguém vê acontecer.
1b. `TECHNICAL_ERROR` / `NOT_APPLICABLE` na prontidão — falha de avaliação hoje se confunde com aprovação.
2. `productPackageOps` — sem a ponte produto→plano, `/produtos` e `/indicadores` seguem desconectados.
3. `journeyTemplates` + `capabilityCatalog` — dão sentido ao onboarding e à habilitação de módulos.
4. `ownerViewModel` — o Dono hoje vê atingimento cru.
