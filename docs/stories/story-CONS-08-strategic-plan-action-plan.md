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
- [x] Validar o fluxo autenticado em produção para Dono, Gerente, Vendedor, Admin MX, Administrador MX e Consultor MX.

## Evidências de validação

- [x] `npm run lint` — 0 erros (7 warnings preexistentes fora do escopo).
- [x] `npm run typecheck` — aprovado.
- [x] `npm test` — 4194 aprovados, 0 falhas (697 arquivos).
- [x] `npm run build` — aprovado.
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
- `src/features/admin-mx/hooks/useAdminMxLists.ts`
- `src/test/action-plan-template-lifecycle.playwright.ts`
- `src/lib/action-plan-table-parity.test.ts`
- `src/types/database.generated.ts`

## QA Results

- **Gate: CONCERNS — correção publicada e validada; permanecem concerns externos já documentados.**
- Correção validada: `Editar` da Biblioteca MX reidrata departamento legado (`PESSOAS_RH → rh`), mantém indicadores Base44 legados como `EMPLOYEE_COUNT` selecionáveis, recupera os itens persistidos e deixa `Continuar` habilitado.
- Regressões focadas: `21 pass, 0 fail` em `actionPlanTemplates.test.ts`.
- Gates locais: `npm run lint`, `npm run typecheck`, `npm test` (`4246 pass, 0 fail, 705 arquivos`), `npm run build`, ESLint direcionado e `git diff --check` passaram; o build confirmou ausência de sourcemaps públicos.
- Browser oficial local: `summary.status == "passed"` em desktop `1440×900` e mobile `390×844`, sem falhas; a auditoria a11y associada registrou `0` violações. Evidências: `visual-evidence/agent-browser/plano-acao-edit-fix-2026-08-21-2026-08-21T20-29-09/desktop.png` e `mobile.png`.
- CodeRabbit: revisão externa bloqueada por `Rate limit exceeded` após três revisões consumidas; revisão dirigida local realizada.
- Graphify: `npx graphify hook-rebuild` tentou processar `4453` arquivos e terminou com `exit 137` por memória; não considerado gate verde.
- Produção/CI: commit `95c74dc4ed29f2a4f2a156c023dff105eaec0303` foi enviado para `main`; Vercel deployment `dpl_FvkR5VxmEg1VoXpWdSdJLy2f7LAU` está `Ready` com aliases oficiais. CI do SHA passou em Quality Gates, Typecheck/unit tests, Gitleaks, ESLint a11y e Atomic Design; smoke autenticado pós-deploy das rotas desta entrega foi concluído sem erros.
