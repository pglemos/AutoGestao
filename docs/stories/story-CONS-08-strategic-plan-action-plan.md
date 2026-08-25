# Story [CONS-08]: Planejamento Estrategico e Plano de Acao PMR

**Status:** READY FOR REVIEW
**Agent:** @aiox-master + @dev
**Priority:** HIGH

## Context

Os decks PMR mostram duas entregas centrais: planejamento estrategico e plano de acao com responsavel, prazo, prioridade e status.

## User Story

Como consultor MX,
quero abas de Planejamento Estrategico e Plano de Acao no cliente,
para acompanhar execucao do PMR em tempo real.

## Acceptance Criteria

- [x] Detalhe do cliente possui abas `Estratégico` e `Plano de Ação`.
- [x] Plano de acao registra indicador, acao, como, responsavel, prazo, prioridade, status e eficacia.
- [x] Planejamento estrategico consome diagnostico, indicadores e parametros.
- [x] Dados atualizam ao novo lancamento mensal/diario.
- [x] Tabela detalhada do Plano de Ação expõe código, ação, objetivo, indicador, departamento, responsável, prioridade, status, progresso, datas, atraso e atualização.
- [x] A tela do Dono usa `public.planos_acao` e não fixtures/localStorage como fonte de negócio.
- [x] Criação, edição, conclusão e progresso usam RPCs com autorização por escopo e auditoria.
- [x] Central MX/Loja reutiliza o mesmo contrato persistido, preservando leitura por escopo.
- [x] Templates podem abrir nova versão a partir da publicada, desativar, reativar e arquivar sem apagar histórico ou aplicações.
- [x] Biblioteca MX expõe os controles de ciclo de vida por estado, impede aplicação/sugestão de templates inativos e separa templates arquivados nos filtros.
- [x] `/plano-acao` do Admin MX abre a gestão global equivalente a `/planos-acao` do Base44, com biblioteca/tabela como entrada, ações de aplicar, histórico e criação, board da rede, sugestões e aplicações.
- [x] Aplicações globais exibem e filtram o responsável real resolvido de `public.usuarios`, sem inventar nomes.
- [ ] Validar o fluxo autenticado em produção para Dono, Gerente, Vendedor, Admin MX, Administrador MX e Consultor MX.

## Evidências de validação

- [x] `npm run lint` — 0 erros; os 12 diagnósticos tipográficos e 1 override reportados são não bloqueantes e permanecem fora dos page roots desta entrega.
- [x] `npm run typecheck` — aprovado.
- [x] `npm test` — 4278 aprovados, 0 falhas (707 arquivos; 25453 expectativas).
- [x] `npm run build` — aprovado; 5267 módulos transformados e nenhum sourcemap público.
- [x] Contrato do Plano de Ação — 4 testes aprovados.
- [x] Ciclo de templates, board, checklist, reconciliação e conversão — 67 testes focados aprovados; Playwright autenticado do drawer e diagnóstico desktop/mobile sem executar mutações.
- [x] Detecção e reconciliação de aplicações parciais/duplicadas — 9 testes focados aprovados; detecção por aplicação lógica multiunidade e reconciliação explícita, auditável, sem exclusão de histórico.
- [x] Conversão de sugestão em plano — RPC transacional, idempotente e protegida por papel interno; elimina plano órfão entre criação e vínculo.
- [x] Board Admin MX — transições de status e reagendamento usam a RPC autorizada/auditada; coluna Kanban continua derivada de status e prazo.
- [x] Execução do plano — bloqueio, cancelamento, desbloqueio e reabertura exigem justificativa e usam campos/eventos próprios; correção da data efetiva preserva motivo e histórico.
- [x] Diagnóstico administrativo — execução explícita, somente leitura, mostra aplicações parciais, rascunhos duplicados e múltiplos request IDs como possíveis duplicidades sem inferir cancelamentos.
- [x] Reconciliação administrativa — RPCs atômicas com lock, autorização interna, dry-run padrão, seleção explícita, motivo e confirmação; nenhuma exclusão física.
- [x] Conclusão do plano — checklist pendente bloqueia na UI e na RPC; override exige Administrador Geral/MX, justificativa e metadata server-side auditável.
- [x] Ciclo do plano estratégico — criação e transições passam por uma RPC autorizada com lock e controle de concorrência; revisão fecha a versão publicada e abre a próxima de forma atômica.
- [x] Metas do plano estratégico — valores e histórico são versionados por `ciclo_id`; revisão copia o snapshot e planos publicados ficam imutáveis.
- [x] Prontidão do plano estratégico — pacote, roster, políticas, unidades e doze competências são validados no banco; trigger impede publicação incompleta mesmo fora da UI.
- [x] Supabase remoto — migrations `20260725190000`, `20260725200000`, `20260725210000`, `20260725220000` e `20260725230000` aplicadas.
- [x] Supabase remoto — migrations transacionais `20260820203000`, `20260820210000`, `20260820220000`, `20260820230000`, `20260820231000`, `20260820232000`, `20260820233000` e `20260820234000` aplicadas e reconciliadas no histórico remoto.
- [x] Smoke autenticado local dos seis módulos Admin MX — `/clientes`, `/equipe`, `/produtos`, `/plano-estrategico`, `/plano-acao` e `/consultoria` em `1440×900` e `390×844`, sem overflow, overlay ou erro de página.
- [x] Smoke autenticado local com Supabase real — Consultor MX selecionou ACERTT e carregou ciclo, 45 indicadores, metas e histórico em desktop `1440×900` e mobile `390×844`, sem overflow e sem erro de runtime.
- [x] Gate final após a correção de foco e do campo imutável de ano — testes focados `14 pass, 0 fail`; `npm run lint`, `npm run typecheck`, `npm test` (`4278 pass, 0 fail`), `npm run build`, `npm run audit:routes-data` e `git diff --check` passaram; a matriz foi regenerada pelo gerador canônico.
- [x] Revalidação autenticada da nova entrada global em browser real — `/plano-acao` carregou a gestão global em `1440×900` e `390×844`; os cinco painéis, filtros, board/lista, detalhes, sugestões, diagnóstico, histórico e `?mode=cliente` responderam sem mutação; `body.scrollWidth == viewportWidth`, com rolagem horizontal restrita às tabelas, e console com `0` erros/avisos. Evidências: `output/playwright/plano-acao-authenticated-desktop.png` e `output/playwright/plano-acao-authenticated-mobile.png`.
- [x] Revalidação autenticada final de `/plano-estrategico` — ACERTT carregou ciclo real, 45 indicadores, metas, histórico, roster de 50 indicadores, unidades/consolidado e preview Dono em desktop `1440×900` e mobile `390×844`; após reload da correção, a superfície manteve título/indicadores e registrou `0` novos erros/avisos de console. Evidências: `output/playwright/plano-estrategico-authenticated-final-20260822/desktop.png` e `output/playwright/plano-estrategico-authenticated-final-20260822/mobile.png`.
- [x] Revalidação autenticada final de Clientes MX — `/clientes`, `/clientes/novo`, `/clientes/acertt` e `/clientes/acertt/plano-acao?clientId=d744dc4f-e1cb-4fbc-84ae-950aa262af03&storeId=2bff56ad-fbd1-46b2-959a-bcf66b1638cb` passaram em `1440×900` e `390×844`, com `summary.status == "passed"`, sem erros de runtime e `0` violações a11y. Evidências: `visual-evidence/agent-browser/clientes-mx-final-2026-08-22T02-50-58/summary.json`, `visual-evidence/agent-browser/novo-cliente-final-2026-08-22T02-51-22/summary.json`, `visual-evidence/agent-browser/cliente-detalhe-final-2026-08-22T02-51-22/summary.json` e `visual-evidence/agent-browser/cliente-plano-acao-final-2026-08-22T02-51-22/summary.json`.
- [x] Smoke autenticado em produção de `/clientes` — `https://www.mxperformance.com.br/clientes` passou em `1440×900` e `390×844`, com `summary.status == "passed"`, sem falhas e `0` violações a11y. Evidência: `visual-evidence/agent-browser/clientes-production-final-2026-08-22T01-22-14/summary.json`.
- [ ] CodeRabbit — revisão externa indisponível por rate limit do plano; revisão dirigida local realizada.
- [ ] Smoke autenticado multi-role em produção — pendente de credenciais/sessões reais dos seis perfis.

## File List

- `docs/stories/story-CONS-08-strategic-plan-action-plan.md`
- `supabase/migrations/20260418001000_pmr_native_engine.sql`
- `src/hooks/useConsultingStrategicPlan.ts`
- `src/hooks/useConsultingActionPlan.ts`
- `src/hooks/useConsultingMetrics.ts`
- `src/features/consultoria/components/ConsultingStrategicView.tsx`
- `src/features/consultoria/components/ConsultingActionPlanView.tsx`
- `src/pages/ConsultoriaClienteDetalhe.tsx`
- `src/test/schemas/schemas.test.ts`
- `supabase/migrations/20260725190000_action_plan_table_parity.sql`
- `supabase/migrations/20260725200000_action_plan_scope_rpc.sql`
- `supabase/migrations/20260725210000_action_plan_scope_update_fix.sql`
- `supabase/migrations/20260725220000_action_plan_scope_rls.sql`
- `supabase/migrations/20260725230000_action_plan_hardening.sql`
- `src/components/owner/actionplan/actionPlanLiveRepository.js`
- `src/components/owner/actionplan/ApproveModal.jsx`
- `src/components/owner/actionplan/DelegateModal.jsx`
- `src/components/owner/actionplan/NewActionModal.jsx`
- `src/components/owner/actionplan/actionPlanUtils.js`
- `src/components/owner/actionplan/ActionsToolbar.jsx`
- `src/components/owner/actionplan/ActionPlanHeader.jsx`
- `src/components/owner/actionplan/board/BoardView.jsx`
- `src/components/owner/actionplan/board/ListView.jsx`
- `src/components/owner/actionplan/board/ActionDrawerTabs.jsx`
- `src/components/owner/actionplan/board/EvidenceTab.jsx`
- `src/components/owner/actionplan/board/ExecutionTab.jsx`
- `src/components/owner/actionplan/board/HistoryTab.jsx`
- `src/components/owner/consulting/consultingRepository.js`
- `src/features/dashboard-loja/hooks/useCentralMxPlanosAcao.ts`
- `src/features/dashboard-loja/hooks/useCentralMxPlanosAcaoSegmentado.ts`
- `src/features/dashboard-loja/sections/CentralMxCriarPlanoModal.tsx`
- `src/features/dashboard-loja/sections/CentralMxPersistedPanels.tsx`
- `src/features/dashboard-loja/sections/CentralMxPlanoSegmentadoPanel.tsx`
- `src/features/admin-mx/planos-acao/actionPlanTemplates.ts`
- `src/features/admin-mx/planos-acao/actionPlanTemplates.test.ts`
- `src/features/admin-mx/planos-acao/TemplateActionsMenu.tsx`
- `src/features/admin-mx/planos-acao/TemplateActionsMenu.test.ts`
- `src/features/admin-mx/planos-acao/TemplateFilters.tsx`
- `src/features/admin-mx/planos-acao/templateFilterLogic.ts`
- `src/features/admin-mx/planos-acao/templateApplicationIdempotency.ts`
- `src/features/admin-mx/planos-acao/templateApplicationIdempotency.test.ts`
- `src/features/admin-mx/planos-acao/actionPlanReconciliation.ts`
- `src/features/admin-mx/planos-acao/actionPlanReconciliation.test.ts`
- `src/features/admin-mx/planos-acao/ActionPlanDiagnosticsPanel.tsx`
- `src/features/admin-mx/planos-acao/ApplicationsTab.tsx`
- `src/features/admin-mx/planos-acao/actionPlanApplications.ts`
- `src/features/admin-mx/planos-acao/actionPlanApplications.test.ts`
- `src/features/admin-mx/planos-acao/actionPlanSuggestions.ts`
- `src/features/admin-mx/planos-acao/actionPlanBoard.ts`
- `src/features/admin-mx/planos-acao/actionPlanBoard.test.ts`
- `src/lib/action-plan-suggestion-conversion-migration.test.ts`
- `supabase/migrations/20260820203000_convert_action_plan_suggestion_atomic.sql`
- `src/lib/action-plan-reconciliation-migration.test.ts`
- `supabase/migrations/20260820210000_action_plan_reconciliation_atomic.sql`
- `src/lib/action-plan-completion-guard-migration.test.ts`
- `supabase/migrations/20260820220000_action_plan_completion_guard.sql`
- `supabase/migrations/20260820230000_strategic_plan_cycle_atomic.sql`
- `src/lib/strategic-plan-cycle-atomic-migration.test.ts`
- `supabase/migrations/20260820231000_strategic_plan_values_by_cycle.sql`
- `src/lib/strategic-plan-values-cycle-migration.test.ts`
- `supabase/migrations/20260820232000_strategic_plan_publish_readiness.sql`
- `src/lib/strategic-plan-publish-readiness-migration.test.ts`
- `supabase/migrations/20260820233000_action_plan_template_lifecycle_atomic.sql`
- `src/lib/action-plan-template-lifecycle-migration.test.ts`
- `supabase/migrations/20260820234000_action_plan_checklist_toggle_atomic.sql`
- `src/lib/action-plan-checklist-toggle-migration.test.ts`
- `src/features/strategic-plan/planCycle.ts`
- `src/features/strategic-plan/planCycleRepository.ts`
- `src/features/strategic-plan/planCycleRepository.test.ts`
- `src/features/strategic-plan/usePlanCycle.ts`
- `src/features/strategic-plan/clientPlanningRepository.ts`
- `src/features/strategic-plan/strategicPlanRepositoryAdapter.ts`
- `src/features/strategic-plan/clientProductPackage.ts`
- `src/features/admin-mx/produtos/strategicPlan.ts`
- `src/features/admin-mx/produtos/strategicPlan.test.ts`
- `src/features/admin-mx/indicadores/indicatorData.ts`
- `src/features/planning-workspace/planningCapabilities.ts`
- `src/features/planning-workspace/planningCapabilities.test.ts`
- `src/features/admin-mx/planos-acao/StrategicIndicatorActionSelector.tsx`
- `src/features/admin-mx/planos-acao/useActionPlanTemplates.ts`
- `src/features/admin-mx/planos-acao/ActionPlanDetailDrawer.tsx`
- `src/features/admin-mx/AdminPlanosAcaoGlobalPage.tsx`
- `src/features/admin-mx/AdminClienteDetalhePage.tsx`
- `src/features/admin-mx/AdminIndicadoresPage.tsx`
- `src/features/admin-mx/AdminNovoClientePage.tsx`
- `src/features/admin-mx/clientes/PortfolioOverviewTab.tsx`
- `src/features/admin-mx/clientes/clientActionPlanContext.ts`
- `src/features/admin-mx/clientes/clientPortfolio.ts`
- `src/features/admin-mx/clientes/clientPortfolio.test.ts`
- `src/features/admin-mx/clientes/programMutations.ts`
- `src/features/admin-mx/components/ClientOverridesSection.tsx`
- `src/features/admin-mx/components/MetasRealizadosTab.tsx`
- `src/features/admin-mx/indicadores/StrategicPlanAdminPanels.tsx`
- `src/features/admin-mx/indicadores/AdminStrategicPlanEditor.tsx`
- `src/features/admin-mx/indicadores/strategicPlanEditor.ts`
- `src/features/admin-mx/indicadores/strategicPlanEditor.test.ts`
- `src/features/admin-mx/indicadores/strategicPlanEditorRepository.ts`
- `src/features/admin-mx/novo-cliente/createClientProgram.ts`
- `src/features/admin-mx/novo-cliente/createClientProgram.test.ts`
- `src/features/admin-mx/novo-cliente/newClientDraft.ts`
- `src/features/admin-mx/novo-cliente/newClientDraft.test.ts`
- `src/features/admin-mx/planos-acao/ApplyTemplateWizard.tsx`
- `src/features/admin-mx/planos-acao/ClientActionPlanWizard.tsx`
- `src/features/admin-mx/planos-acao/NewActionChoiceModal.tsx`
- `src/features/admin-mx/planos-acao/actionPlanWizardLogic.ts`
- `src/features/admin-mx/planos-acao/actionPlanWizardLogic.test.ts`
- `src/features/admin-mx/planos-acao/clientActionPlanWizardData.ts`
- `src/features/admin-mx/hooks/useAdminMxLists.ts`
- `src/features/internal-mx-planning/InternalActionPlanPage.tsx`
- `src/features/internal-mx-planning/InternalStrategicPlanPage.tsx`
- `src/features/strategic-plan/clientPlanningConsolidation.ts`
- `src/features/strategic-plan/clientPlanningConsolidation.test.ts`
- `src/features/strategic-plan/useClientScope.ts`
- `src/features/strategic-plan/useStrategicPlanController.ts`
- `src/test/action-plan-template-lifecycle.playwright.ts`
- `src/test/internal-mx-planning-pages.test.ts`
- `src/lib/action-plan-table-parity.test.ts`
- `scripts/lint-icon-semantics.mjs`
- `docs/auditoria/matrizes/MATRIZ_ROTAS_DADOS_MX.md`
- `src/types/database.generated.ts`

## QA Results

- **Gate: CONCERNS — implementação, gates locais e browser autenticado locais verdes; CodeRabbit e release externo permanecem pendentes.**
- Correção validada: `Editar` da Biblioteca MX reidrata departamento legado (`PESSOAS_RH → rh`), mantém indicadores Base44 legados como `EMPLOYEE_COUNT` selecionáveis, recupera os itens persistidos e deixa `Continuar` habilitado.
- Regressões focadas: `21 pass, 0 fail` em `actionPlanTemplates.test.ts`.
- Gates locais finais: `npm run lint`, `npm run typecheck`, `npm test` (`4278 pass, 0 fail, 707 arquivos`), `npm run build`, `npm run audit:routes-data` e `git diff --check` passaram; o build confirmou ausência de sourcemaps públicos.
- Browser oficial local: `summary.status == "passed"` em desktop `1440×900` e mobile `390×844`, sem falhas; a auditoria a11y associada registrou `0` violações. Evidências: `visual-evidence/agent-browser/plano-acao-edit-fix-2026-08-21-2026-08-21T20-29-09/desktop.png` e `mobile.png`.
- Browser real autenticado da nova entrada global: desktop `1440×900` e mobile `390×844` aprovados; biblioteca com 6 templates/91 indicadores, Planos da rede com board e lista, modal com Resumo/Execução/Evidências/Histórico, sugestões, aplicações, diagnóstico de integridade, histórico pesquisável e modo `?mode=cliente` com calendário/formulários; `0` erros e `0` avisos no console. Evidências: `output/playwright/plano-acao-authenticated-desktop.png` e `output/playwright/plano-acao-authenticated-mobile.png`.
- Browser real autenticado do plano estratégico: ACERTT, ciclo real, 45 indicadores, metas, histórico, roster de 50 indicadores, unidades/consolidado e preview Dono confirmados em `1440×900` e `390×844`; após a correção do campo de ano, `0` novos erros/avisos no console. Evidências: `output/playwright/plano-estrategico-authenticated-final-20260822/desktop.png` e `output/playwright/plano-estrategico-authenticated-final-20260822/mobile.png`.
- CodeRabbit: revisão externa bloqueada por `Rate limit exceeded` após três revisões consumidas; revisão dirigida local realizada.
- Graphify: `npx graphify hook-rebuild` concluiu em 22/08 com runtime `typescript`, atualizou `.graphify/graph.json` e `GRAPH_REPORT.md`, e não deixou `.graphify/needs_update`.
- Produção/CI: não foram executados nesta retomada; não houve commit, push, CI ou deploy novos. O smoke autenticado multi-role em produção continua pendente e não é declarado como concluído.
- Revalidação 2026-08-24: o release `89ee75d75f3fc2593d21051e9f7f8914ff1de52a` está `READY/PROMOTED` na Vercel (`dpl_B7qWybRcAbJDKZTg6nh7WDcFPTeT`), `/api/health` retornou HTTP 200 com `release` coincidente e os oito workflows do SHA passaram; gates locais finais (`typecheck`, `lint`, `test` com `4395 pass / 0 fail` em 721 arquivos, `build`, `audit:routes-data` e `git diff --check`) passaram. Browser real autenticado Admin MX validou `/plano-estrategico` e `/indicadores?mode=catalogo` em `1440×900` e `390×844`, com ACERTT, 45 indicadores, ciclo, metas, comparativos, filtros, abas, editores, histórico, plano de ação, tabela mensal, catálogo com 6 áreas/18 digitáveis/27 calculáveis e ações `Abrir`/`Editar`/`Arquivar`/`Histórico`; console sem erros/avisos e sem overflow de página. Evidências: `output/playwright/plano-estrategico-production-final-20260824/desktop.png` e `mobile.png`. O smoke autenticado em produção dos perfis Dono, Gerente, Vendedor, Administrador MX e Consultor MX permanece pendente por ausência de sessões/credenciais desses perfis; nenhuma mutação adicional, commit, push ou deploy foi feito nesta retomada.
