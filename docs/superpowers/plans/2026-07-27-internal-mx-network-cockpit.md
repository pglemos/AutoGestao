# Internal MX Network Cockpit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evoluir o Painel Geral para um cockpit rastreável em tempo real, com progresso de lojas, vendedores, gerentes e responsáveis, além de drill-down para planejamento, ações, consultoria e fechamento diário.

**Architecture:** Uma RPC segura consolida fontes existentes por loja e período sem criar score opaco ou tabela paralela. O controller atual preserva debounce/single-flight, passa a consumir o snapshot tipado e expõe drill-down contextual. Componentes novos mostram evolução e origem dos números, mantendo a tabela atual como ponto central.

**Tech Stack:** React 19, TypeScript 5.8, React Router 7, Supabase PostgreSQL 17/RPC/Realtime, Bun Test, Testing Library, Playwright.

## Global Constraints

- Acesso ao snapshot completo somente para `administrador_geral`, `administrador_mx` e `consultor_mx`.
- Não criar score de Dono sem fonte e fórmula explicável.
- Vendedor: snapshots, fechamento, carteira, vendas e conversão.
- Gerente: snapshots, equipe, ações e indicadores.
- Dono/responsável: estratégia, ações, consultoria e resultados da unidade.
- Loja: agregação rastreável dos papéis e módulos.
- Todo número agregado informa universo/período e oferece origem ou drill-down.
- Preservar debounce de 450 ms, espera máxima de 2000 ms, single-flight e recarga final.
- Reutilizar `seller_routine_snapshots`, `manager_routine_snapshots`, `planos_acao`, metas, indicadores e Consultoria.
- Não substituir dados reais por fixtures.
- Tema global permanece fora deste plano.

---

## Mapa de arquivos

### Banco e contrato

- Create: `supabase/migrations/20260727182000_internal_mx_network_cockpit.sql`
- Create: `src/lib/internal-mx-network-cockpit-migration.test.ts`
- Create: `supabase/tests/internal_mx_network_cockpit_rls.test.sql`
- Modify: `src/types/database.generated.ts`

### Domínio e controller

- Modify: `src/features/network-dashboard/types.ts`
- Create: `src/features/network-dashboard/lib/networkCockpitCalculations.ts`
- Create: `src/features/network-dashboard/lib/networkCockpitCalculations.test.ts`
- Create: `src/features/network-dashboard/data/networkCockpitRepository.ts`
- Create: `src/features/network-dashboard/data/networkCockpitRepository.test.ts`
- Modify: `src/features/network-dashboard/hooks/useNetworkDashboardController.ts`
- Modify: `src/features/network-dashboard/hooks/useNetworkDashboardController.test.tsx`
- Modify: `src/features/network-dashboard/networkDashboardRealtime.test.ts`

### Interface e rotas

- Modify: `src/features/network-dashboard/NetworkDashboardPage.tsx`
- Modify: `src/features/network-dashboard/components/StoreHealthTable.tsx`
- Create: `src/features/network-dashboard/components/NetworkDrilldownDrawer.tsx`
- Create: `src/features/network-dashboard/components/StoreEvolutionPanel.tsx`
- Create: `src/features/network-dashboard/components/PersonEvolutionList.tsx`
- Create: `src/features/network-dashboard/components/SourceTrace.tsx`
- Create: `src/features/network-dashboard/components/NetworkDrilldownDrawer.test.tsx`
- Modify: `src/pages/PainelConsultor.tsx`
- Create: `src/test/internal-mx-network-cockpit.playwright.ts`
- Create: `docs/qa/evidence/internal-mx-functional/network-cockpit.md`

---

### Task 1: Definir snapshot e cálculos rastreáveis

**Files:**
- Modify: `src/features/network-dashboard/types.ts`
- Create: `src/features/network-dashboard/lib/networkCockpitCalculations.ts`
- Create: `src/features/network-dashboard/lib/networkCockpitCalculations.test.ts`

**Interfaces:**
- Produces: `NetworkCockpitStore`, `SellerEvolution`, `ManagerEvolution`, `OwnerEvolution`, `buildStoreRiskReasons`, `calculateTraceableProgress`.

- [ ] **Step 1: escrever testes RED de risco**

```ts
import { expect, test } from 'bun:test'
import { buildStoreRiskReasons } from './networkCockpitCalculations'

test('explica cada risco sem score opaco', () => {
  expect(buildStoreRiskReasons({
    disciplinePct: 40,
    projectionPct: 72,
    overdueActions: 3,
    blockedActions: 1,
    pendingClosures: 2,
    consultingEvidencePending: 1,
  })).toEqual([
    'Disciplina diária abaixo de 50%',
    'Projeção abaixo de 80% da meta',
    '3 ações atrasadas',
    '1 ação bloqueada',
    '2 fechamentos pendentes',
    '1 evidência de consultoria pendente',
  ])
})
```

- [ ] **Step 2: escrever teste RED de progresso do Dono**

```ts
expect(calculateTraceableProgress({ completed: 6, total: 10 })).toEqual({ completed: 6, total: 10, percentage: 60 })
expect(calculateTraceableProgress({ completed: 0, total: 0 })).toEqual({ completed: 0, total: 0, percentage: null })
```

- [ ] **Step 3: criar tipos**

```ts
export type TraceableMetric = {
  value: number | null
  universe: number | null
  periodStart: string
  periodEnd: string
  source: string
}

export type PersonEvolution = {
  userId: string
  name: string
  role: 'vendedor' | 'gerente' | 'dono'
  status: 'healthy' | 'attention' | 'critical' | 'without_data'
  metrics: Record<string, TraceableMetric>
  reasons: string[]
}

export type NetworkCockpitStore = StoreDiagnostic & {
  pendingClosures: number
  overdueActions: number
  blockedActions: number
  awaitingValidationActions: number
  strategicProgress: TraceableMetric
  consultingProgress: TraceableMetric
  sellersEvolution: PersonEvolution[]
  managersEvolution: PersonEvolution[]
  ownerEvolution: PersonEvolution | null
  riskReasons: string[]
}
```

- [ ] **Step 4: implementar funções puras e GREEN**

```bash
bun test src/features/network-dashboard/lib/networkCockpitCalculations.test.ts
git add src/features/network-dashboard/types.ts src/features/network-dashboard/lib/networkCockpitCalculations.ts src/features/network-dashboard/lib/networkCockpitCalculations.test.ts
git commit -m "feat(network): add traceable cockpit contracts"
```

---

### Task 2: Criar RPC segura de consolidação

**Files:**
- Create: `supabase/migrations/20260727182000_internal_mx_network_cockpit.sql`
- Create: `src/lib/internal-mx-network-cockpit-migration.test.ts`
- Create: `supabase/tests/internal_mx_network_cockpit_rls.test.sql`

**Interfaces:**
- Produces: `get_internal_mx_network_cockpit(p_start_date date, p_end_date date)`.

- [ ] **Step 1: escrever teste RED do SQL**

```ts
import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync('supabase/migrations/20260727182000_internal_mx_network_cockpit.sql', 'utf8')

test('consolida fontes existentes sem criar tabela de score', () => {
  expect(sql).toContain('get_internal_mx_network_cockpit')
  expect(sql).toContain('seller_routine_snapshots')
  expect(sql).toContain('manager_routine_snapshots')
  expect(sql).toContain('planos_acao')
  expect(sql).toContain('visitas_consultoria')
  expect(sql).not.toContain('CREATE TABLE public.owner_score')
})
```

- [ ] **Step 2: executar RED**

Run: `bun test src/lib/internal-mx-network-cockpit-migration.test.ts`

- [ ] **Step 3: implementar função SECURITY DEFINER**

Signature:

```sql
CREATE OR REPLACE FUNCTION public.get_internal_mx_network_cockpit(
  p_start_date date,
  p_end_date date
) RETURNS jsonb
```

Authorization:

```sql
IF NOT public.eh_area_interna_mx(auth.uid()) THEN
  RAISE EXCEPTION 'Sem permissão para consultar o cockpit da rede.' USING ERRCODE = '42501';
END IF;
```

The JSON must return:

```text
period;
stores[];
per store: operational totals, goals, sellers count, checked-in/closure counts,
action counts, strategic completed/total, consulting completed/total,
sellers evolution, managers evolution, owner/responsible evolution, source labels.
```

- [ ] **Step 4: usar CTEs por fonte**

Required CTEs:

```text
active_stores;
operational_summary using get_resumo_rede_periodo or canonical operational tables;
active_sellers;
daily_closures;
seller_snapshot_latest;
manager_snapshot_latest;
action_summary;
strategic_summary;
consulting_summary;
store_owners.
```

Owner evolution must use named metrics:

```text
strategic actions completed / total;
consulting visits completed / total;
store sales / goal;
```

Do not combine them into one unexplained score.

- [ ] **Step 5: grants and performance**

```text
REVOKE ALL FROM PUBLIC/anon;
GRANT EXECUTE TO authenticated;
STABLE SECURITY DEFINER;
SET search_path=public;
validate p_start_date <= p_end_date;
reject ranges longer than 366 days;
indexes used by date/store/status must exist or be added additively.
```

- [ ] **Step 6: pgTAP**

Test internal roles allowed, Dono/Gerente/Vendedor/anon denied, empty store returns zero/null safely, and every returned store includes `sources` metadata.

- [ ] **Step 7: local validation and commit**

```bash
supabase db reset
bun test src/lib/internal-mx-network-cockpit-migration.test.ts
supabase test db supabase/tests/internal_mx_network_cockpit_rls.test.sql
git add supabase/migrations/20260727182000_internal_mx_network_cockpit.sql src/lib/internal-mx-network-cockpit-migration.test.ts supabase/tests/internal_mx_network_cockpit_rls.test.sql
git commit -m "feat(network): add secure cockpit snapshot"
```

---

### Task 3: Criar repositório tipado e migrar controller

**Files:**
- Modify: `src/types/database.generated.ts`
- Create: `src/features/network-dashboard/data/networkCockpitRepository.ts`
- Create: `src/features/network-dashboard/data/networkCockpitRepository.test.ts`
- Modify: `src/features/network-dashboard/hooks/useNetworkDashboardController.ts`
- Modify: `src/features/network-dashboard/hooks/useNetworkDashboardController.test.tsx`

**Interfaces:**
- Produces: `networkCockpitRepository.load(range)` and enriched controller rows.

- [ ] **Step 1: regenerate types**

```bash
npm run gen:db-types
npm run verify:db-types
```

- [ ] **Step 2: write RED repository mapping test**

```ts
test('maps source metadata and person evolution', async () => {
  const repository = createNetworkCockpitRepository(fakeSupabase(payload))
  const result = await repository.load({ start: '2026-07-01', end: '2026-07-31' })
  expect(result[0].sellersEvolution[0].metrics.sales.source).toBe('get_resumo_rede_periodo')
  expect(result[0].ownerEvolution?.metrics.strategicProgress.universe).toBe(10)
})
```

- [ ] **Step 3: implement repository**

```ts
export function createNetworkCockpitRepository(client = supabase) {
  return {
    async load(range: NetworkDateRange): Promise<NetworkCockpitStore[]> {
      const { data, error } = await client.rpc('get_internal_mx_network_cockpit', {
        p_start_date: range.start,
        p_end_date: range.end,
      })
      if (error) throw error
      return mapNetworkCockpitPayload(data)
    },
  }
}
```

- [ ] **Step 4: update controller RED tests**

Replace four independent initial queries with one repository call. Preserve:

```text
requestSequence;
snapshotInFlight;
reloadQueued;
REALTIME_DEBOUNCE_MS=450;
REALTIME_MAX_WAIT_MS=2000;
report triggers;
search/status/timeframe/sort.
```

- [ ] **Step 5: add consulting/strategic Realtime sources**

Tables:

```text
valores_indicadores_planejamento;
clientes_consultoria;
visitas_consultoria;
evidencias_visita;
consultoria_progresso_aula;
consultoria_itens_entrega;
consultoria_solicitacoes_antecipacao.
```

- [ ] **Step 6: GREEN and commit**

```bash
bun test src/features/network-dashboard/data src/features/network-dashboard/hooks/useNetworkDashboardController.test.tsx src/features/network-dashboard/networkDashboardRealtime.test.ts
npm run typecheck
git add src/types/database.generated.ts src/features/network-dashboard
git commit -m "refactor(network): consume typed cockpit snapshot"
```

---

### Task 4: Construir drill-down e rastreabilidade

**Files:**
- Create: `src/features/network-dashboard/components/SourceTrace.tsx`
- Create: `src/features/network-dashboard/components/PersonEvolutionList.tsx`
- Create: `src/features/network-dashboard/components/StoreEvolutionPanel.tsx`
- Create: `src/features/network-dashboard/components/NetworkDrilldownDrawer.tsx`
- Create: `src/features/network-dashboard/components/NetworkDrilldownDrawer.test.tsx`
- Modify: `src/features/network-dashboard/components/StoreHealthTable.tsx`

**Interfaces:**
- Produces: store drawer with person/module drill-down and source labels.

- [ ] **Step 1: write RED UI test**

```tsx
render(<NetworkDrilldownDrawer open store={store} onOpenChange={() => {}} />)
expect(screen.getByRole('heading', { name: store.name })).toBeInTheDocument()
expect(screen.getByRole('tab', { name: 'Vendedores' })).toBeInTheDocument()
expect(screen.getByRole('tab', { name: 'Gerentes' })).toBeInTheDocument()
expect(screen.getByRole('tab', { name: 'Dono' })).toBeInTheDocument()
expect(screen.getByRole('tab', { name: 'Módulos' })).toBeInTheDocument()
expect(screen.getByText('Origem dos dados')).toBeInTheDocument()
```

- [ ] **Step 2: test links with store context**

Expected destinations:

```text
/plano-estrategico?storeId=<uuid>
/plano-acao?storeId=<uuid>
/consultoria?storeId=<uuid>
/lojas/<slug>
/lojas/<slug>?tab=desempenho
```

Seller/manager links must use existing person routes when available; otherwise open a local detail panel instead of inventing a broken route.

- [ ] **Step 3: implement source trace**

For every metric show label, value, universe, period and source. `null` displays `Sem dados`, not zero.

- [ ] **Step 4: implement risk reasons**

Use `buildStoreRiskReasons`; no unexplained red/yellow/green score.

- [ ] **Step 5: GREEN and commit**

```bash
bun test src/features/network-dashboard/components/NetworkDrilldownDrawer.test.tsx
npm run typecheck
git add src/features/network-dashboard/components
git commit -m "feat(network): add traceable store drilldown"
```

---

### Task 5: Integrar no Painel Geral

**Files:**
- Modify: `src/features/network-dashboard/NetworkDashboardPage.tsx`
- Modify: `src/features/network-dashboard/components/StoreHealthTable.tsx`
- Modify: `src/pages/PainelConsultor.tsx`

**Interfaces:**
- Consumes: enriched controller and drawer.
- Produces: cockpit entry route with preserved filters and drill-down.

- [ ] **Step 1: write RED contract test**

```text
click store row opens drawer;
click actions metric opens Plano de Ação with storeId;
click strategic metric opens Plano Estratégico;
click consulting metric opens Consultoria;
back navigation preserves timeframe/search/status/sort;
Realtime status remains visible;
manual refresh remains available.
```

- [ ] **Step 2: integrate without changing report buttons**

Preserve `Relatório matinal`, `semanal`, `mensal` triggers and current error/loading states.

- [ ] **Step 3: update table columns carefully**

Desktop may show:

```text
Loja;
Fechamentos;
Vendas/Meta;
Ações em risco;
Estratégia;
Consultoria;
Risco explicado;
Abrir.
```

Tablet/mobile use cards or prioritized columns; no global horizontal overflow.

- [ ] **Step 4: tests and commit**

```bash
bun test src/features/network-dashboard
npm run typecheck
git add src/features/network-dashboard/NetworkDashboardPage.tsx src/features/network-dashboard/components/StoreHealthTable.tsx src/pages/PainelConsultor.tsx
git commit -m "feat(network): integrate global evolution cockpit"
```

---

### Task 6: E2E, performance and final evidence

**Files:**
- Create: `src/test/internal-mx-network-cockpit.playwright.ts`
- Create: `docs/qa/evidence/internal-mx-functional/network-cockpit.md`

**Interfaces:**
- Produces: evidence that numbers, navigation and Realtime are traceable.

- [ ] **Step 1: create authenticated E2E**

Scenarios:

```text
all active stores appear;
period change refreshes snapshot;
search/status/sort work;
open store and inspect sellers/managers/owner/modules;
source metadata appears;
links preserve storeId;
create/update action elsewhere and see action counts update;
complete consulting item and see consulting progress update;
change target/result and see strategic progress update;
Realtime burst produces one reconciled reload;
no console errors or global overflow.
```

- [ ] **Step 2: run database and frontend gates**

```bash
supabase db reset
supabase test db supabase/tests/internal_mx_network_cockpit_rls.test.sql
bun test src/features/network-dashboard src/lib/internal-mx-network-cockpit-migration.test.ts
npx playwright test src/test/internal-mx-network-cockpit.playwright.ts
npm run verify:db-types
npm run typecheck
npm run lint
npm run build
```

- [ ] **Step 3: inspect query performance**

Run `EXPLAIN (ANALYZE, BUFFERS)` for one month and all active stores. Record execution time and scans. Add indexes only when the plan shows a real sequential-scan bottleneck on a large table.

- [ ] **Step 4: record evidence and commit**

```bash
git add src/test/internal-mx-network-cockpit.playwright.ts docs/qa/evidence/internal-mx-functional/network-cockpit.md
git commit -m "test(network): verify cockpit drilldown and realtime"
```
