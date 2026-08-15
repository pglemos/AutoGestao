# Story MX-FOUNDATION-ZERO — Universal UI & Geometry Contract

## Status

In Progress

## Source of truth

- Prompt aprovado: `/Users/pedroguilherme/Downloads/PROMPT_MESTRE_FOUNDATION_ZERO_MX_MAIN_SEM_WORKTREE_AUTONOMO_2026-08-11.md`
- Ledger operacional: `.superpowers/mx-foundation-zero/progress.md`
- Branch autorizada: `main`, sem worktree ou branch de implementação.

## Objetivo

Executar o contrato Foundation Zero no estado real do `main`, consolidando a fundação visual, geométrica, responsiva e de acessibilidade do sistema sem alterar regras de negócio, contratos de dados, permissões ou segurança do Supabase fora de uma necessidade comprovada.

## Critérios de aceitação

- [ ] Todas as tasks do prompt e child tasks geradas pelo inventário têm status individual e evidência no ledger.
- [ ] Rotas, perfis, exceções de layout, componentes, estados e overlays possuem denominadores explícitos.
- [ ] A fundação canônica tem um único proprietário de geometria, tipografia, tokens, shell e overlays aplicáveis.
- [ ] As rotas `STANDARD_CANVAS` válidas passam por PageCanvas/PageViewport e não criam scroll vertical concorrente.
- [ ] Estados interativos, responsividade, teclado, reduced motion e WCAG aplicáveis têm testes/evidências.
- [ ] Gates locais completos, revisão adversarial, rollback e paridade de SHA/deploy são registrados antes de release.
- [ ] Nenhuma credencial é rotacionada, versionada ou reproduzida em logs/artefatos.

## Tasks / Subtasks

- [ ] Executar e revisar as fases A–D do prompt no `main` real.
- [ ] Completar os lotes canônicos E–W com TDD, contratos e revisão.
- [ ] Migrar e validar rotas/perfis X–AB conforme os denominadores gerados.
- [ ] Fechar gates AC–AI, incluindo harness visual/DOM, E2E, Supabase e performance.
- [ ] Executar regressão AJ, release AK, rollback AL e relatório AM.
- [ ] Atualizar o ledger para cada task e child task; não agrupar checkboxes sem evidência.

## Dev Agent Record

### Orchestration notes

- Execução coordenada pelo aiox-master/Orion; alterações de código devem ser implementadas em lotes pequenos e revisadas por QA.
- O checkout inicial desta retomada estava limpo em `main` no SHA `3d8158ea`; o grafo Graphify foi atualizado estruturalmente e deixou pendências de descrições assistidas, que não serão tratadas como prova de código.
- 2026-08-11: lote release-probe implementado em TDD pelo aiox-dev e revisado pelo aiox-qa. O RED confirmou que `/api/health.release` não existia; o GREEN confirmou 3 contratos novos e regressão de `/api/health` preservada.
- 2026-08-12: a reconciliação trouxe `origin/main` (`475da966bfb371d4d27367508a5866f0d8a88f6c`) para a base dos 8 commits locais até `336b62d15ed251d78a500896987f29792e60c52c`, sem conflito e sem descartar trabalho local. O contrato Node ESM reproduziu o `ERR_MODULE_NOT_FOUND` do artefato sem extensão e ficou verde após a correção mínima `.js`.
- 2026-08-12: o CI do SHA `64ff4a710cf24d3803f75c84e1ede70f59141df3` revelou duas diferenças do runner Ubuntu: ausência de `rg` e a fronteira `\b` do `git grep` contando fallbacks hex dos arquivos-fonte de tokens. O `Quality Gates` passou a instalar `ripgrep`; o guard passou a excluir definições de tokens e usar classes POSIX portáveis. O workflow paralelo de `Typecheck and unit tests` também recebeu a dependência no job de testes após o rerun confirmar o mesmo problema. Gates locais completos seguem verdes.
- 2026-08-13: a coorte H foi implementada em single-writer pelo Maestri/OpenCode e revisada pelo DeepSeek 2. O lote adicionou estados pressed/disabled da sidebar, corrigiu seletores E2E do shell canônico e criou `src/test/shell-contract.playwright.ts`. Evidência inicial: 2966 testes/20006 asserts, shell E2E 41/41, typecheck, ESLint, audits e Graphify verdes. O rerun dedicado posterior fechou 08.003, 08.016 e 08.017 com 7/7 E2E, incluindo primeiro Tab no skip-link, zoom 200% e keyboard-only.
- 2026-08-13: o Golden visual do Dono corrigiu um seletor inválido (`main[data-mx-page-canvas]`); `PageCanvas` é conteúdo dentro do único `main` do shell. O fixture sintético sem vínculo foi classificado como estado de produto válido, e a validação oficial com credencial real passou em `/home` 1440x900. Golden desktop/tablet/mobile passou 3/3 sem atualizar snapshots; contratos Foundation Zero focados passaram 22/22. Graphify naquele momento (snapshot histórico): 56.607 nós / 112.994 arestas / 7.444 comunidades — estado corrente pós-fechamentos: 56.607 nós / 112.998 arestas / 7.444 comunidades, `stale: false`.
- 2026-08-13: H 08.003/08.016/08.017 foi fechado em single-writer: `PageViewport` passou a ter `tabIndex=-1` por padrão, o RED reproduziu o primeiro Tab incorreto e o GREEN confirmou o skip-link como primeira parada. `src/test/shell-zoom-keyboard.playwright.ts` cobre zoom 200% e keyboard-only; shell E2E dedicado passou 7/7.
- 2026-08-13: a coorte I 09.012 foi fechada em single-writer e revisão read-only: os quatro resíduos de tabela foram migrados para `ScrollableRegion`; o gate passou com `violationCount=0`, contrato 3/3, ESLint, typecheck e parity visual do fechamento diário 1/1. Harness quiescente nas rotas da coorte e `/home` Dono confirmou `main=1`, `viewport=1`, `scrollOwner=1`, overflow horizontal 0 e nenhuma violação a11y crítica/séria. Pixel Golden final de `/home` e sweep dos 216 renderings continuam pendentes.
- 2026-08-13: fatia bounded da FASE J (10.013/10.019) em single-writer: o `TabNav` (tablist underline canônico, 14 consumidores) fechou o drift de teclado do padrão ARIA tabs — roving tabindex (só a aba ativa com `tabindex=0`) e navegação por setas (ArrowLeft/Right/Up/Down, Home/End). TDD: RED 2 testes novos falhando, GREEN no componente + contrato unit. Validação: 6/6 unit TabNav, 84/84 suítes de tabs, E2E browser 2/2 (roving + setas reais em `/organograma` e `/banco-talentos`), E2E gerencial 7/7 sem regressão; tsc, ESLint e `git diff --check` verdes.
- 2026-08-13: resíduo reproduzível da FASE I em single-writer — `TabelaRanking.tsx:27` (/ranking) migrou a região horizontal declarada (`data-mx-scroll-region`) não-focável para o primitivo `ScrollableRegion` (focável + nomeada + `overflow-y-hidden`), preservando DOM/tabela/visual/desktop. Novo gate `lint-scroll-region-focusable` + contrato garantem que região declarada de tabela seja focável ou use o primitivo; `AdminStoreMatrixTable` (outra rota) ficou orçado como residual. Prova browser em /ranking 390x844 e 1440x900: região com `tabindex=0`/`role=region`/`aria-label`, axe `scrollable-region-focusable` 0 violações, zero overflow horizontal de página; 14/14 testes do ranking, tsc/eslint/diff check verdes.
- 2026-08-13: correção do foco inicial no fluxo `"/"` → redirect → home (H 08.003), em single-writer. Hipótese confirmada: em carga nova em `/`, o shell monta na rota raiz (invisível) e o `RouteAnnouncer` consome o guard `firstRender` ali; o redirect interno para a home vira "navegação" e move o foco para `main#main-content`, fazendo a primeira parada de Tab pular a skip-link (ex.: botão "Atualizar" em `/painel` para perfil interno MX). RED: `src/test/route-announcer-redirect.playwright.ts` (perfil interno MX, `"/"` → `/painel`, sem blur) falhava; GREEN em `src/design-system/shell/RouteAnnouncer.tsx`: guard `hasInteracted` (listeners `keydown`/`pointerdown`) — foco/announce só passam a valer após a primeira interação do usuário; carga nova (inclusive redirect) mantém a skip-link como 1ª parada; comportamento pós-interação preservado (manager E2E 7/7, shell E2E + zoom/keyboard 7/7, contratos estáticos do shell 9/9). Graphify pós-código: 56.607 nós / 112.996 arestas / 7.444 comunidades, `stale: false`. Sem alteração de regras de negócio, dados, auth ou Supabase.
- 2026-08-13: fechamentos adicionais registrados com evidência, sem reabrir fases — `TabNavPill` (FASE J 10.013/10.019): roving tabindex + setas, 6/6 unit, 150/150 consumidores, browser `/lojas` 3/3; race de stdout do gerador JSON (`scripts/audit_route_data_inventory.mjs --json`): escrita síncrona completa no fd 1, contrato node-consumer 1/1, canário `tsx generate_foundation_zero_route_matrix.ts` exit 0; `AdminStoreMatrixTable` → `ScrollableRegion` (residual zerado): gate `lint-scroll-region-focusable` 0 violações, contrato 3/3, browser `/relatorios/performance-vendas` 2/2 (390/1440), axe limpo.
- 2026-08-13: correção de geometria do Login em single-writer — o painel `flex-1` do formulário ganhou `min-w-0` (FASE I 09.011). RED reproduzido em /login 320x568 + zoom 2 (`docOverflow` true; painel do formulário com `right:342` sem ancestral rolável); GREEN sem `docOverflow` nem clipping real nos probes 320/390/412 (incluindo reduced-motion e zoom); contrato permanente `src/pages/login-layout-contract.test.ts` (1/1); desktop/tablet goldens preservados; nenhuma mudança de autenticação.
- 2026-08-14: fatia da largura da coorte C7 (rotas `wide`/1280px) em single-writer (DeepSeek 4). O harness confirmou o gap: nenhuma das rotas C7 renderizava `wide` (727 capturas, 0 com `widthToken=wide`). A migração adotou 9 paths: `carteira-clientes`, `relatorios`, `relatorios-vendedor`, `notificacoes`, `lojas`, `lojas/:storeSlug/filiais`, `produtos`, `relatorios/performance-vendedor` e `agenda` — páginas passaram a declarar `PageCanvas`/`PageTemplate`/`MxModulePage` com `width="wide"` e a metadata registrou `adopted: true` + `bottomClearance` compatível. O gate `lint-adopted-route-canvas` foi estendido para reconhecer `MxModulePage` como canvas-bearing e seguir re-export de página em um nível (ADR-0050), com 4 testes novos de contrato. Ficaram orçadas como pendentes as rotas C7 cuja raiz é compartilhada com larguras diferentes (`DashboardLoja` em departamentos*/lojas/:storeSlug/equipe, `NetworkDashboardPage` em minhas-lojas, `InternalMxPlanningShell` em consultoria, `ReportPageShell` em performance-vendas) e as páginas condicionais por perfil (`consultoria/clientes*`). Validação: `npm run lint` completo verde (19 rotas adotadas, 0 violações), `tsc --noEmit` 0 erros, contratos 18/18 (adopted-canvas 10/10, parity, route-layout, lint-chain); 3 falhas em `button-variants`/`superfície unificada` são pré-existentes do Lote 1 de contraste/toast (confirmadas no baseline sem esta fatia), não desta mudança.

- 2026-08-14: Padrão A da coorte C7 (largura dinâmica por rota) em single-writer (DeepSeek 4). As 12 rotas C7 restantes compartilhavam raízes de página com rotas de larguras diferentes; em vez de literal fixo, `DashboardLoja` (departamentos*, lojas/:storeSlug, lojas/:storeSlug/equipe), `NetworkDashboardPage` (minhas-lojas + painel), `InternalMxPlanningShell` (consultoria + plano-estrategico + plano-acao) e `ReportPageShell` (relatorios/performance-vendas + relatorio-matinal) passaram a resolver `width`/`bottomClearance` via `resolveRouteLayout(useLocation().pathname)` — a metadata da rota é a fonte de decisão. `OwnerConsultoria.jsx` (dono, rota única wide) e `StorePerformanceView` (só performance-vendas) migraram para literal `wide`. O gate `lint-adopted-route-canvas` foi estendido: aceita o padrão dinâmico `width={resolveRouteLayout(...).width}` (e variáveis locais que derivam dele), segue re-exports, wrappers que delegam a outro componente de página (inclusive ternários com dois delegados, ex. `SalesPerformance`) e rotas `<Route index>` aninhadas — com `fileHasCanvas` parando a BFS na folha canônica. TDD: 3 testes novos (GREEN dinâmico, GREEN wrapper, RED non-literal arbitrário). Metadata de `painel`, `relatorio-matinal`, `plano-estrategico` e `consultoria` passou a declarar `bottomClearance: 'navigation'` (runtime real do MxModulePage). Validação: `npm run lint` completo EXIT=0 (31 rotas adotadas, 0 violações), `tsc --noEmit` 0 erros, contratos 22/22, features afetadas 73/73, harness 1280x800 23 PASS/0 FAIL com todas as 12 rotas renderizando `widthToken=wide`/1280px. Padrões B (consultoria/clientes*) e C (rotas com dois roots por role restantes) seguem pendentes.

- 2026-08-14: Padrão B da coorte C7 (rotas condicionais por perfil) em single-writer (DeepSeek 4). As 3 rotas `consultoria/clientes`, `consultoria/clientes/:clientSlug` e `consultoria/clientes/:clientSlug/visitas/:visitNumber` tinham raízes condicionais por perfil: a primeira é um ternário (`role === 'consultor_mx' ? <ConsultantAssignedClientsPage/> : <ConsultingClientsPage/>`); as outras duas envolvem `ConsultingClientScopeGuard` (wrapper que renderiza children). O gate `lint-adopted-route-canvas` foi estendido: (1) `extractRenderedTags` passa a descer nos children de tags comuns (ex.: `<LojasErrorBoundary>`/`<ConsultingClientScopeGuard>` envolvendo o canvas), eliminando falso-positivos de sub-componentes de loading como raiz; (2) restaurada a validação de `width`/`bottomClearance` **default** (prop ausente = `dashboard`/`none`) — antes `width !== undefined` deixava `MxModulePage` sem width passar numa rota wide (falso-negativo). Migradas para o padrão dinâmico `width={pageWidth}`/`bottomClearance={pageBottomClearance}` via `resolveRouteLayout`: `ConsultingClientsPage`, `ConsultantAssignedClientsPage`, `ConsultingClientScopeGuard` (3 ramos loading/error/forbidden), `ScopedConsultoriaClienteDetalhe` (3 ramos) e `LegacyConsultoriaVisitaExecucaoPage` (3 PageCanvas). Decisão `wide`/`navigation` mantida após outro agente tentar sobrescrever para dashboard/none (arbitrado pelo orquestrador). TDD: 3 testes novos (GREEN wrapper+children, RED default-width mismatch, GREEN ternário por role) → 16/16. Validação: `npm run lint` completo EXIT=0 (57 rotas adotadas, 0 violações), `tsc --noEmit` 0 erros, contratos 24/24, features de consultoria 10/10, harness 1280x800 6/6 PASS (admin_geral + admin_mx) com as 3 rotas renderizando `widthToken=wide`/1280px, clearance navigation. Coorte C7 completa (50 rotas adotadas da coorte + outras).

- 2026-08-14: FASE AF — Viewport Matrix (8 viewports de borda de breakpoint) em single-writer (DeepSeek 4). Rodado `scripts/foundation_zero_harness.ts --role all` nas **25 rotas** (coorte C7 completa de 24 + `/home` golden Dono), nos viewports `320x568`, `360x800`, `390x844`, `412x915`, `599x900`, `600x900`, `768x1024`, `839x1024`. Resultado consolidado: **464 PASS / 0 FAIL** (58 casos aplicáveis por viewport × 8). Cada viewport: 58 PASS / 0 FAIL; 14 skip/viewport = `consultor_mx` sem credencial E2E. Os 2 fails de captura interrompida (`/relatorios/performance-vendas` admin 412x915, `/home` gerente 768x1024) foram recapturados isolados com `--no-resume` → PASS (flake de sessão, não regressão). Combinações rota×role não-aplicáveis (ForbiddenRoute por perfil) não capturadas, conforme esperado. Cobre 32.001-32.006 e 32.009-32.010; 639/640, 840, 1023/1024 e os modos especiais (zoom/reduced-motion/safe-area) seguem pendentes.



### File List

- `docs/stories/story-MX-FOUNDATION-ZERO-20260811.md`
- `.superpowers/mx-foundation-zero/progress.md` (artefato ignorado)
- `api/health.ts`
- `api/health.release.ts`
- `src/lib/observability/server-release.ts`
- `src/test/api-health-release-contract.test.ts`
- `src/test/api-health-node-esm-contract.test.ts`
- `.github/workflows/quality-gates.yml`
- `.github/workflows/typecheck-and-unit-tests.yml`
- `scripts/lint-visual-raw.mjs`
- `src/design-system/sidebar/sidebar-contract.test.ts`
- `src/design-system/sidebar/tokens.ts`
- `src/test/navigation.playwright.ts`
- `src/test/shell-contract.playwright.ts`
- `src/test/shell-zoom-keyboard.playwright.ts`
- `src/design-system/page/PageViewport.tsx`
- `src/design-system/page/page-viewport-contract.test.ts`
- `scripts/lint-table-horizontal-scroll.mjs`
- `src/test/table-horizontal-scroll-contract.test.ts`
- `src/features/gerente/FunilVendasGerente.tsx`
- `src/features/manager/development/ManagerUniversityReference.tsx`
- `src/pages/GerenteTreinamentos.tsx`
- `src/features/ranking/views/ManagerRankingReference.tsx`
- `src/features/manager/team-routine/ManagerTeamRoutineCanonical.container.tsx`
- `src/features/manager/daily-closing/ManagerDailyClosing.container.tsx`
- `src/features/manager/daily-closing/ManagerDailyClosingBase44.tsx`
- `src/components/molecules/TabNav.tsx`
- `src/test/molecules/TabNav.test.tsx`
- `src/features/ranking/components/base44/TabelaRanking.tsx`
- `scripts/lint-scroll-region-focusable.mjs`
- `src/test/scroll-region-focusable-contract.test.ts`
- `src/design-system/shell/RouteAnnouncer.tsx`
- `src/test/route-announcer-redirect.playwright.ts`
- `src/components/molecules/TabNavPill.tsx`
- `src/test/molecules/TabNavPill.test.tsx`
- `src/features/sales-performance/sections/AdminStoreMatrixTable.tsx`
- `src/features/manager/onboarding/ManagerTourOverlay.tsx`
- `src/features/manager/onboarding/manager-tour-overlay.test.tsx`
- `scripts/lint-z-index.mjs`
- `src/test/lint-z-index-semantic-contract.test.ts`
- `src/test/route-layout-metadata-gate.test.ts`
- `src/pages/Login.tsx`
- `src/pages/login-layout-contract.test.ts`
- `scripts/lint-adopted-route-canvas.mjs`
- `src/test/adopted-route-canvas-contract.test.ts`
- `src/test/route-layout-metadata-gate.test.ts`
- `src/features/dashboard-loja/DashboardLoja.container.tsx`
- `src/features/dashboard-loja/sections/OwnerExecutiveCockpit.contract.test.ts`
- `src/features/network-dashboard/NetworkDashboardPage.tsx`
- `src/features/internal-mx-planning/InternalMxPlanningShell.tsx`
- `src/features/internal-reports/ReportPageShell.tsx`
- `src/features/sales-performance/views/StorePerformanceView.tsx`
- `src/pages/owner/Consultoria.jsx`
- `src/features/consulting-clients/ConsultingClientsPage.tsx`
- `src/features/consulting-clients/ConsultantAssignedClientsPage.tsx`
- `src/features/consulting-clients/ConsultingClientScopeGuard.tsx`
- `src/features/consultoria-cliente/ScopedConsultoriaClienteDetalhe.tsx`
- `src/features/consultoria-visita/LegacyConsultoriaVisitaExecucaoPage.tsx`
- `src/design-system/page/routeLayoutMetadata.ts`
- `src/features/carteira-clientes/pages/CarteiraClientesBase44Page.tsx`
- `src/features/crm/RelatoriosVendedor.container.tsx`
- `src/features/notificacoes/Notificacoes.container.tsx`
- `src/features/lojas/Lojas.container.tsx`
- `src/features/filiais/StoreBranches.container.tsx`
- `src/features/digital-products/DigitalProductsPage.tsx`
- `src/features/seller-performance/SellerPerformancePage.tsx`
- `src/features/agenda-admin/AgendaAdmin.container.tsx`
- `artifacts/route-role-inventory/route-role-matrix.json`
- `artifacts/route-role-inventory/route-role-matrix.md`
- `docs/reports/layout-route-inventory.json`
- `docs/reports/layout-route-inventory.md`

### Completion Notes

- Ainda não concluída: H e I têm os lotes acima fechados com evidência. **Denominadores reconciliados no estado corrente (109 rotas / 101 protegidas / 8 públicas / 66 STANDARD_CANVAS / 30 REDIRECT / 216 renderings / 232 route×role)**; **16 child tasks ROLE-ROUTE reais pendentes + container `/` sem task (deliberado)**; J–AM, Golden pixel final, sweep completo, Supabase/produção, rollback e release permanecem abertos.
- Lote release-probe: RED `bun test --isolate --concurrency=1 src/test/api-health-release-contract.test.ts` falhou pela ausência esperada de `../../api/health.release`; GREEN `bun test ... api-health-release-contract.test.ts api-health-probe-contract.test.ts` passou 15/15.
- Contrato Node ESM: a transpilação de `api/health.ts` e `api/health.release.ts` para um sandbox `type: module`, seguida de import pelo Node real, reproduziu `ERR_MODULE_NOT_FOUND` com o import sem extensão e passou após os imports `server-release.js`. A execução focada dos três contratos passou `16/16`, com `36` expectations.
- Gates pós-correção: `npm run typecheck`, `npm run lint`, `npm test` (`2769` pass / `0` fail / `19191` asserts), `npm run build`, `npm run check:bundle-size` (`1815.67/1860 KB gzip`), `npm run audit:routes-data`, `npm run audit:management-design-system` e `npm run audit:layout-contract` passaram. Paridade de produção ainda pendente até o próximo release.
- CI inicial do novo SHA: `Quality Gates` e `Typecheck and unit tests` falharam pela ausência de `rg` no runner; o primeiro também expôs 15 hex em definições de tokens sob GNU `git grep`. O `Quality Gates` passou após o primeiro ajuste; o workflow paralelo ainda recebeu a mesma instalação de `ripgrep` e aguarda novo rerun. Os contratos focados e todos os gates locais passam.
- Coorte H: `npm test` passou com `2966 pass / 0 fail / 20006 asserts`; shell E2E passou `41/41` com `226 expectations`; `tsc --noEmit`, ESLint, `audit:layout-contract`, `audit:management-design-system`, `lint:route-layout`, `lint-z-index`, `git diff --check` e `npx graphify hook-rebuild` passaram. O branding E2E foi restringido ao mobile, e a prova desktop permanece na sidebar. Não houve push, commit, deploy, alteração Supabase ou rotação de credenciais nesta coorte.
