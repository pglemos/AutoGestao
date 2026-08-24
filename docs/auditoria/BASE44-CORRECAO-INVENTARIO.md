# Inventário Prompt Correção Base44

Fonte: Downloads/PROMPT DE CORREÇÃO BASE44.md (redacted; sem secrets).

| 01 | L1 | 1. OBJETIVO DESTA CORREÇÃO |
| 02 | L2933 | 1. OBJETIVO E ESCOPO |
| 03 | L6079 | 1. OBJETIVO E ESCOPO |
| 04 | L7760 | 1. OBJETIVO E ESCOPO |
| 05 | L9311 | VISÃO 360 → CRIAR PLANO ESTRATÉGICO |
| 06 | L9945 | 1. PROBLEMA CONFIRMADO NA TELA ATUAL |
| 07 | L11017 | 1. PROBLEMA ATUAL |
| 08 | L12000 | PLANO ESTRATÉGICO — CÁLCULOS EM TEMPO REAL, |
| 09 | L13620 | VISÃO 360 — UNIFICAÇÃO DOS ATALHOS DO PLANO ESTRATÉGICO |
| 10 | L14113 | 1. OBJETIVO |
| 11 | L15738 | CLIENTES MX → PLANO ESTRATÉGICO |
| 12 | L16793 | PLANO ESTRATÉGICO — VISUALIZAÇÃO REAL DO MÓDULO DONO |
| 13 | L17780 | PLANO ESTRATÉGICO — VISUALIZAÇÃO DO DONO INTERNA AO ADMINISTRADOR |
| 14 | L18791 | VISUALIZAR COMO DONO — PLANO ESTRATÉGICO COM MESES NA HORIZONTAL |
| 15 | L19396 | VISUALIZAR COMO DONO — REPLICAÇÃO FIEL DA TELA OFICIAL DO DONO |
| 16 | L20005 | PLANO ESTRATÉGICO — CADASTRO MENSAL DO REALIZADO E ANO ANTERIOR |
| 17 | L22209 | PLANO ESTRATÉGICO — CÁLCULO DOS INDICADORES DERIVADOS |
| 18 | L23291 | REALIZADO E ANO ANTERIOR |
| 19 | L24288 | PLANO ESTRATÉGICO — ORDEM OFICIAL DOS INDICADORES |
| 20 | L26240 | PLANO ESTRATÉGICO — PERSISTÊNCIA DAS METAS, |
| 21 | L27329 | PLANO ESTRATÉGICO — LISTA ÚNICA DE INDICADORES |
| 22 | L28271 | CLIENTES MX — VALIDAÇÃO E ATIVAÇÃO DO CLIENTE |
| 23 | L33163 | PLANO ESTRATÉGICO — ESCOPO POR LOJA |
| 24 | L35190 | PLANO ESTRATÉGICO MULTIUNIDADE |
| 25 | L36843 | PLANO ESTRATÉGICO MULTIUNIDADE |
| 26 | L37656 | VISUALIZAR COMO DONO — PLANO ESTRATÉGICO |
| 27 | L38849 | VISÃO DO DONO, COMPETÊNCIA, REALIZADO, CALCULÁVEIS E CARDS |
| 28 | L40229 | VISÃO DO DONO — RECONCILIAÇÃO ENTRE ADMINISTRADOR, RESUMO, |
| 29 | L41178 | CLIENTES MX — RESUMO DO PLANO ESTRATÉGICO |
| 30 | L41919 | PESSOAS E ACESSOS — DONO MASTER, PAPÉIS E ATIVAÇÃO DO CLIENTE |
| 31 | L43152 | PESSOAS E ACESSOS — DONO MASTER |
| 32 | L45210 | PLANOS DE AÇÃO — SALVAMENTO, DUPLICIDADE DE RASCUNHOS |
| 33 | L46309 | PLANO DE AÇÃO DO CLIENTE |

## Prioridade de execução (proposta)

1. P0 bloqueantes: Plano Estratégico multiunidade / Visão Dono / Dono Master / Metas publicadas
2. P1 pontuais admin-mx restantes
3. P2 polish/fina

Não commitar tokens. Rotacionar secrets expostos no chat.

## Progresso sessão 2026-08-23 (debug bb88b1)

- Card metas: fonte publicada + label status completo; MX CONSULTORIA esperado 18/0/27 em_validacao (DB).
- Visão Dono: ViewSelector acima dos cards; resolveActualIndicatorValue.
- Dono Master: evaluateOwnerMasterReadiness + Corrigir (AG=1 dono via vínculo).
- Planos ação: collapseClientActionPlanRows (legado 7→1); apply idempotent já sem serviceToken no FE.
- QA UI ainda pendente (logs F/M2/V/A1).

## Verificação runtime 2026-08-23 (session bb88b1)

### P0 Card metas — CONFIRMADO
- MX CONSULTORIA UI: Em validação · 18 · 0 · 27
- Log F: `cardStatus=em_validacao`, `rowsLen=420`, `indicadoresComMeta=18`, `metasPublicadas=0`, `metasPendentes=27`

### P0 Dono Master — CONFIRMADO (AG)
- Antes: OWNER_WITHOUT_MASTER, 2 impeditivos
- Deep-link `corrigirMaster=1` → Log M2 `donos:1, persons:22`
- Depois: Gleyson = Dono Master · Ativo; prontidão 7/12; 1 impeditivo restante (módulos)

### P0 Visão Dono — CONFIRMADO (AG multiunidade)
- ViewSelector acima dos cards + resolveActual (código/testes)
- Checklist multiunidade (proxy AG; MX VEÍCULOS TESTE 4 ausente): Matriz Meta 8/Estoque 13; 3 PISO Admin vazio → Dono Meta — (sem herança legado); Consolidado banner Parcial 1/3; Resultado Sem resultado; competência Jul/2026; shell owner via viewAs=dono

### P1 Planos de ação
- collapse 7→1 (testes); A1 MX raw=2 collapsed=2


## Matriz status 33 prompts (evidência 2026-08-23)

| # | Status | Nota |
|---|--------|------|
| 01 | DONE | Objetivo geral — contexto |
| 02 | DONE | Escopo correção |
| 03 | DONE | Escopo |
| 04 | DONE | Escopo |
| 05 | DONE | Visão 360: Abrir Plano sem seletor catálogo → cycleId bd5f482d; toast “N indicadores padrão” no create |

| 06 | DONE | Roster AG=45; ordem Base44 (O19); motor calcCodes=45 no cadastro rápido (P08b) |
| 07 | DONE | Cadastro rápido só 18 digitáveis + cards 18/27/45 (P07 runtime) |
| 08 | DONE | applyPatches+recalc; Resumo Calculado live (P08b salesMonth=8/annual=96); save→recalc persist |
| 09 | DONE | openCurrentStrategicPlan único; header+card mesmo cycleId (P09 AG bd5f482d); consultoria resolve cycle |
| 10 | DONE | formatStrategicValue alias; parseStrategicInput compartilhado |
| 11 | DONE | Clientes MX plano — card |
| 12 | DONE | viewAs=dono → shell owner + StrategicPlanWorkspace (D1) |
| 13 | DONE | AdminAsOwnerStrategicPlan; botão editor → viewAs=dono |
| 14 | DONE | VG Jan–Dez + Total; áreas expandidas; P14 monthHeaders=12 series=45 |
| 15 | DONE | Chrome Dono: Módulo Executivo + Menu Dono (P15 auth→shellRole) |
| 16 | DONE | AA editável+save; M-1 Jul (P16); Resumo conferência Jul; highlight mês |
| 17 | DONE | Derivados: soma aditiva IND null→0 (P08 salesTotal=12; P20 walkJan=8) |
| 18 | DONE | Resumo Meta/Resultado/%; calc por dependência (P08b/P16/P20); sem bloqueio global 30/30 |
| 19 | DONE | Ordem indicadores Base44 (O19 head SALES_TOTAL) |
| 20 | DONE | Persistência: save 18 + recalc; reload Jan–Dez=8; Visão Dono Meta=8 |
| 21 | DONE | Matriz meta/realizado roster=45 uniqueCodes=45 (P21); LEADS no sample |
| 22 | DONE | Validação ativação + Dono Master |
| 23 | DONE | Escopo UI Admin + STORE default (unitId undefined não consolida) |
| 24 | DONE | Seletor Todas/unidades; VG usa series scoped; overlay vazio não zera meta |
| 25 | DONE | CONSOLIDATED + aliases→Base44; banner Parcial 1/3 (P25 U1+U5); filiais sem rows |

| 26 | DONE | Preview shell owner; escopo multiunidade disponível (P15) |
| 27 | DONE | ViewSelector compartilhado Resumo↔VG (valueView no controller) |
| 28 | DONE | Mesmo view model series+mês+valueView; diagnostics selectedValueView=meta|realizado|aa |
| 29 | DONE | Resumo plano — card 18/0/27 verificado |
| 30 | DONE | Dono Master papéis ativação |
| 31 | DONE | Dono Master Corrigir AG |
| 32 | DONE | Apply idempotent sem serviceToken; collapse 7→1; diagnóstico reconcile drafts |
| 33 | DONE | Kanban Admin DnD (@hello-pangea); onMove→changePlanStatus; log P33 em_andamento→pendente |

Resumo: **33 DONE**, **0 PARTIAL**; 0 BLOCKED. P33+P05+P25 bb88b1.

### P08 Cadastro rápido — CONFIRMADO (bb88b1)
- Painel **Resumo Calculado** no Cadastro Rápido (6 KPIs).
- Log P08b: `calcCodes=45`, `digitaveis=18`, `salesMonth=8`, `salesAnnual=96`.
- `onSaved` → `recalculateAndPersistCycle` + refresh.

### Persistência P20 — CONFIRMADO (bb88b1)
- Log: `save draft + recalc persist` dirty=18 saved=18 recalcError=null walkJan=8 salesTotalJan=8
- Reload editor: Fluxo de Porta Meta Jan–Dez value=8; Salvar disabled
- Visão Dono Resumo: Vendas Total Meta do mês = 8

### Multiunidade AG — 2026-08-23 (bb88b1)
- Bug: `resolveOwnerPlanningScopeType(undefined, multi)=CONSOLIDATED` zerava metas (50→null). Fix → STORE.
- Visão Geral agora recebe `controller.series` (antes só repository loja-identidade).
- Overlay consolidado vazio não apaga série da loja.
- Seletor Escopo no Admin quando `supportsConsolidated`.
- P25: códigos snake_case (`sales_door_flow`) canônicos na consolidação → banner **Parcial — 1 de 3 unidades** (log U1; UI confirmada).
- Log U5: matriz 384 rows; filiais 0/0 (parcial esperado).

### Planos ação (32–33) — 2026-08-23 (bb88b1)
- P33: Kanban Admin com DragDropContext; log `from=em_andamento to=pendente`; board pós-move: pendente=PA-EE3D3389.
- P32: collapse + apply idempotente (sessão anterior).
- Client panel: toggle Quadro/Lista; kanban com `MxProgress` no card (`data-testid=action-plan-kanban-card`).
- U5 per-store fetch revertido (hipótese rejeitada); vigentes AG 2026 vazios permanece dado.

### Visualizar como Dono (12–15, 26) — 2026-08-23 (bb88b1)
- Antes: `/dono/plano-estrategico` → redirect → shell **internal** (Admin).
- Agora: `/plano-estrategico?...&viewAs=dono` → `AdminAsOwnerStrategicPlan` (shell **owner**).
- Runtime AG: banner “Visualizando como Dono”, Resumo/VG + meses, `#page-plano-estrategico`.
- Logs D1/D2: shell=owner.
- **P15 chrome:** Layout `shellRole=dono` com `viewAs` — UI “Módulo Executivo” / “Menu principal do Dono” (antes Admin). Log P15 `authRole=administrador_geral, shellRole=dono`.

### Reconciliação valueView (27–28, 18) — 2026-08-23 (bb88b1)
- `StrategicValueView` no controller; Overview controlado; ViewSelector também no Resumo.
- Runtime: VG Meta→Resultado Atual (“—” → “Sem resultado”); Resumo mantém “Resultado Atual”; % Meta 0,0% (50/0).
- Log R1: `valueView=realizado` em `visao-geral` e `resumo`; V: meta→realizado.

### P14/P16/P21 — CONFIRMADO (bb88b1)
- P14: Visão Dono VG `monthHeaders=12`, `seriesLen=45`, departamentos expandíveis.
- P16: competência M-1 Jul; AA com Salvar; Resumo Calculado conferência Jul.
- P21: matriz field=realizado `roster=45` `uniqueCodes=45`.

## Fix SALES_TOTAL=0 (2026-08-23)

- Commit `311a966c`: ZERO_IF_EMPTY só nas deps da fórmula; limpa SALES_OTHER legado; Realizado calculado não herda 0 persistido.
- Verificado Visão Dono AG: Resultado **Sem resultado** (não 0%/Crítico).
- Residual Estoque: **DONE** — `applyOfficialComputedMetas` só recalcula Meta; Realizado manual preservado (AG Resultado Estoque=3, Vendas=Sem resultado). Commit `f7edb7b1`.
- Push `eeda37fa` (+ auditoria visibilidade Dono).

## Fix herança multiunidade (2026-08-23)

- Causa: `mergeOfficialPlanningSeries` fazia backfill numérico de série legada/check-in → filial sem planejamento Admin mostrava Meta inventada (ex.: 3 PISO Vendas 26 / Estoque 43).
- Correção: herdar só `sourceMetricCode`/`sourceId`; nunca `target`/`current`/`AA` do legado.
- Evidência Visão Dono AG: Matriz Meta 8/13 + Resultado Sem resultado; 3 PISO Meta —; Consolidado Parcial 1/3.

## G01 Diagnóstico Admin↔Dono (2026-08-24)

- Causa: painel lia só linha bruta `SALES_TOTAL` em vigentes → Meta Admin `—` com Dono `8` (calculado dos canais).
- Correção: `resolveAdminStoreDiagnosticSides` usa a mesma grade oficial (`buildOfficialMonthlyGrid` + `applyActualComputedPasses`); `admin` ausente + owner null = IGUAL.
- Evidência AG Matriz Jul `SALES_TOTAL`: META 8=8 IGUAL; REALIZADO —=— IGUAL; fonte Admin `admin_official_monthly_grid`.

