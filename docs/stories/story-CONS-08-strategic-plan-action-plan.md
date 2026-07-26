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
- [ ] Validar o fluxo autenticado em produção para Dono, Gerente, Vendedor, Admin MX, Administrador MX e Consultor MX.

## Evidências de validação

- [x] `npm run lint` — 0 erros (7 warnings preexistentes fora do escopo).
- [x] `npm run typecheck` — aprovado.
- [x] `npm test` — 1402 aprovados, 0 falhas.
- [x] `npm run build` — aprovado.
- [x] Contrato do Plano de Ação — 4 testes aprovados.
- [x] Supabase remoto — migrations `20260725190000`, `20260725200000`, `20260725210000`, `20260725220000` e `20260725230000` aplicadas.
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
- `src/lib/action-plan-table-parity.test.ts`
- `src/types/database.generated.ts`
