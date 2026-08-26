# STORY-03 — Painel Da Loja E Ranking Oficial

Status: Ready for Review

## Contexto

Com schema canonico e check-in temporal corrigidos, o painel da loja precisa usar as fontes oficiais: `regras_metas_loja`, `store_sellers`, `daily_checkins.reference_date` e `users.is_venda_loja`. O ranking nao pode contaminar meta individual com `VENDA LOJA` quando a regra da loja desabilita isso.

## Escopo

- Ajustar equipe/status para usar vigencia operacional em `store_sellers`.
- Ajustar status de check-in usando `seller_user_id` e `reference_date`.
- Ajustar ranking oficial para usar vendedores ativos da vigencia.
- Aplicar regra `include_venda_loja_in_individual_goal`.
- Ajustar dashboard da loja para usar meta em `regras_metas_loja`.
- Aplicar regra `include_venda_loja_in_store_total` no total da loja.

## Fora De Escopo

- Notificacao automatica de sem registro.
- Novo layout completo do painel.
- Filtros avancados por periodo.
- Reescrita do matinal/semanal.

## Criterios De Aceite

- [x] `useTeam` usa `store_sellers` como fonte primaria da equipe.
- [x] Status check-in usa `reference_date` e `seller_user_id`.
- [x] `useRanking` usa `store_sellers` e meta de `regras_metas_loja`.
- [x] `VENDA LOJA` nao contamina meta individual quando `include_venda_loja_in_individual_goal=false`.
- [x] Dashboard usa `regras_metas_loja.monthly_goal`.
- [x] Dashboard respeita `include_venda_loja_in_store_total`.
- [x] Meta individual cadastrada por Gerente, Dono ou Admin MX prevalece sobre o rateio da loja, inclusive quando o valor cadastrado e `0`.
- [x] Sem meta individual cadastrada, a meta da loja e dividida entre vendedores ativos elegiveis; `VENDA LOJA` e usuarios inativos ficam fora do divisor.
- [x] Dashboard, ranking, funil, metricas, editor e realtime compartilham a mesma precedencia de meta.
- [x] Gates locais passam.

## Validacao

- Queries live validadas via Supabase JS:
  - `store_sellers -> users`.
  - `store_sellers -> stores`.
  - `regras_metas_loja`.
  - `daily_checkins` com campos canonicos.
- `useTeam` mantem fallback para `memberships` quando a loja ainda nao tem vigencia configurada.

## Gates

- `npm run lint`: passou.
- `npm run typecheck`: passou.
- `npm test`: passou, 26 testes.
- `npm run build`: passou.
- `git diff --check`: passou.

## File List

- `docs/stories/story-store-dashboard-ranking-03/spec/spec.md`
- `docs/stories/story-store-dashboard-ranking-03/plan/implementation.yaml`
- `artifacts/route-role-inventory/route-role-matrix.json`
- `artifacts/route-role-inventory/route-role-matrix.md`
- `src/hooks/useTeam.ts`
- `src/hooks/useRanking.ts`
- `src/hooks/useGoals.ts`
- `src/pages/DashboardLoja.tsx`
- `src/features/crm/funil-vendedor/official-kpis.test.ts`
- `src/features/crm/funil-vendedor/official-kpis.ts`
- `src/features/dashboard-loja/hooks/useDashboardLojaData.ts`
- `src/features/dashboard-loja/sections/ManagerOperationalCockpit.tsx`
- `src/features/dashboard-loja/sections/ManagerSellerParityHome.tsx`
- `src/features/dashboard-loja/sections/ManagerSellerParityHomeCanonical.tsx`
- `src/features/dashboard-loja/sections/RankingSection.tsx`
- `src/features/lojas/components/SellerGoalsEditor.tsx`
- `src/features/manager/team/ManagerSellerProfileModal.tsx`
- `src/features/ranking/components/base44/TabelaRanking.tsx`
- `src/features/ranking/hooks/useStoreRankingPageData.ts`
- `src/features/ranking/views/ManagerRankingReference.tsx`
- `src/features/vendedor-home/hooks/useVendedorHomePage.ts`
- `src/hooks/useSellerMetrics.test.ts`
- `src/hooks/useSellerMetrics.ts`
- `src/hooks/useStoreSales.test.ts`
- `src/hooks/useStoreSales.ts`
- `src/hooks/useStores.test.ts`
- `src/hooks/useStores.ts`
- `src/lib/storeSalesRules.ts`
- `src/lib/storeSalesRules.test.ts`
- `src/lib/dashboard-seller-goal-source.test.ts`
- `src/lib/vendedor-performance-goal-scope-migration.test.ts`
- `supabase/migrations/20260826103000_fix_vendedor_performance_goal_scope.sql`
- `supabase/migrations/20260826181204_individual_goal_precedence_and_eligible_seller_scope.sql`
- `src/pages/FunilVendedor.tsx`

## Dev Agent Record

### Agent Model Used

- Codex GPT-5 / AIOX dev

### Debug Log

- Reproduzido no dashboard autenticado: a meta mensal total da loja era atribuída a todas as linhas de vendedor.
- O dashboard passou a priorizar `vendedor_performance_oficial.meta` e usa rateio local somente durante o carregamento da RPC.
- O rateio local considera vendedores ativos elegíveis e exclui a conta operacional `VENDA LOJA`; meta oficial `0` permanece `0`.
- A migration corrige o divisor da RPC usando a equipe ativa completa da loja, sem `p_seller_id`, com `vendedores_loja` e `vinculos_loja` ativos.
- CodeRabbit apontou e foi corrigido o retorno `NULL` da meta quando não há regra da loja; o teste de origem da meta foi padronizado para `bun:test`, alinhado ao runner oficial `bun test` e aos testes de unidade equivalentes.

### Completion Notes List

- Prova DOM autenticada em `http://localhost:3457/lojas/trend-auto?tab=metas`: 7 vendedores exibidos com meta individual `7` (valor subjacente proporcional `7.857...`), sem repetir a meta total `55`.
- Evidência visual autenticada: `visual-evidence/agent-browser/goal-scope-auth-2026-08-26T14-54-20/`, desktop `1440x900` e mobile `390x844`, status `passed`, sem falhas.
- Testes focados: 23 passaram, 0 falharam.
- Gates já executados: `npm test` (4.476 passaram), `npm run lint`, `npm run typecheck`, `npm run build` e `git diff --check` passaram; `supabase db lint --local` ficou bloqueado pela ausência de Postgres local em `127.0.0.1:54322`.
- Revalidação final após estabilização do checkout: `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`, os 23 testes focados e a suíte completa (`4491 pass / 0 fail` em 736 arquivos) passaram.
- Migration preparada no repositório, sem aplicação remota nesta solicitação.
